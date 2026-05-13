import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

// ============================================================
// VALIDATION — fail fast if required env vars are missing
// ============================================================
const REQUIRED_ENV = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_PLAID_CLIENT_ID',
  'VITE_PLAID_SECRET',
  'ANTHROPIC_API_KEY',
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[Accrue] Missing required env var: ${key}`);
    process.exit(1);
  }
}

// ============================================================
// CLIENTS
// ============================================================
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.VITE_PLAID_ENV || 'sandbox'],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.VITE_PLAID_CLIENT_ID!,
        'PLAID-SECRET':    process.env.VITE_PLAID_SECRET!,
      },
    },
  })
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ============================================================
// HELPERS
// ============================================================
function getUserId(req: express.Request, res: express.Response): string | null {
  const userId = req.body?.userId || req.query?.userId;
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return null;
  }
  return userId as string;
}

// ============================================================
// SERVER SETUP
// ============================================================
async function startServer() {
  const app  = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security headers
  app.use(helmet());
  app.use(cors({ origin: process.env.NODE_ENV === 'production' ? false : true }));
  app.use(express.json());

  // Request logger
  app.use((req, _res, next) => {
    if (!req.path.startsWith('/@vite') && !req.path.startsWith('/src')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });

  // Rate limiters
  const defaultLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'Too many AI requests, please slow down.' },
  });

  app.use('/plaid', defaultLimiter);
  app.use('/ai',    aiLimiter);

  // ============================================================
  // PLAID — create link token
  // ============================================================
  app.post('/plaid/create-link-token', async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const response = await plaidClient.linkTokenCreate({
        user:         { client_user_id: userId },
        client_name:  'Accrue Finance',
        products:     ['transactions'] as any,
        country_codes:['US'] as any,
        language:     'en',
      });
      res.json(response.data);
    } catch (err: any) {
      console.error('[Plaid] create-link-token:', err.response?.data || err.message);
      res.status(500).json({ error: 'Failed to create link token' });
    }
  });

  // ============================================================
  // PLAID — exchange public token and save accounts
  // ============================================================
  app.post('/plaid/exchange-public-token', async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;
    const { publicToken } = req.body;
    if (!publicToken) return res.status(400).json({ error: 'publicToken is required' });

    try {
      const exchangeRes  = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
      const { access_token: accessToken, item_id: itemId } = exchangeRes.data;

      // Save the Plaid item with empty cursor (first sync will populate it)
      await supabase.from('items').upsert({
        id:           itemId,
        user_id:      userId,
        access_token: accessToken,
        cursor:       null,
      }, { onConflict: 'id' });

      // Save accounts
      const accountsRes = await plaidClient.accountsGet({ access_token: accessToken });
      for (const account of accountsRes.data.accounts) {
        await supabase.from('accounts').upsert({
          user_id:           userId,
          account_name:      account.name,
          balance:           account.balances.current,
          category:          account.subtype || account.type,
          institution:       'Linked Bank',
          plaid_access_token:accessToken,
          plaid_account_id:  account.account_id,
        }, { onConflict: 'user_id,plaid_account_id' });
      }

      res.json({ success: true, itemId });
    } catch (err: any) {
      console.error('[Plaid] exchange-public-token:', err.response?.data || err.message);
      res.status(500).json({ error: 'Failed to exchange token' });
    }
  });

  // ============================================================
  // PLAID — sync transactions using cursor (incremental updates)
  // ============================================================
  app.post('/plaid/sync-transactions', async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const { data: items, error } = await supabase
        .from('items')
        .select('id, access_token, cursor')
        .eq('user_id', userId);

      if (error) throw error;
      if (!items || items.length === 0) {
        return res.json({ success: true, count: 0, message: 'No accounts linked' });
      }

      let totalSynced = 0;

      for (const item of items) {
        let cursor  = item.cursor || undefined;
        let hasMore = true;

        while (hasMore) {
          const syncRes = await plaidClient.transactionsSync({
            access_token: item.access_token,
            cursor,
          });

          const { added, modified, removed, next_cursor, has_more } = syncRes.data;

          // Upsert added and modified transactions
          for (const tx of [...added, ...modified]) {
            await supabase.from('transactions').upsert({
              user_id:             userId,
              plaid_transaction_id:tx.transaction_id,
              amount:              tx.amount,
              date:                tx.date,
              name:                tx.name,
              category:            tx.personal_finance_category?.primary || tx.category?.[0] || 'General',
              category_primary:    tx.personal_finance_category?.primary,
              category_detailed:   tx.personal_finance_category?.detailed,
              merchant_name:       tx.merchant_name,
              plaid_account_id:    tx.account_id,
              pending:             tx.pending,
            }, { onConflict: 'plaid_transaction_id' });
            totalSynced++;
          }

          // Remove deleted transactions
          for (const tx of removed) {
            await supabase
              .from('transactions')
              .delete()
              .eq('plaid_transaction_id', tx.transaction_id);
          }

          // Save cursor progress after each page
          cursor  = next_cursor;
          hasMore = has_more;
          await supabase
            .from('items')
            .update({ cursor: next_cursor })
            .eq('id', item.id);
        }
      }

      res.json({ success: true, count: totalSynced });
    } catch (err: any) {
      console.error('[Plaid] sync-transactions:', err.response?.data || err.message);
      res.status(500).json({ error: 'Failed to sync transactions' });
    }
  });

  // ============================================================
  // PLAID — get accounts
  // ============================================================
  app.post('/plaid/get-accounts', async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'accessToken is required' });
    try {
      const response = await plaidClient.accountsGet({ access_token: accessToken });
      res.json(response.data);
    } catch (err: any) {
      console.error('[Plaid] get-accounts:', err.response?.data || err.message);
      res.status(500).json({ error: 'Failed to get accounts' });
    }
  });

  // ============================================================
  // AI — Finny chat endpoint
  // ============================================================
  app.post('/ai/chat', async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    try {
      // Fetch recent transactions for context
      const { data: transactions } = await supabase
        .from('transactions')
        .select('name, amount, category, date, merchant_name')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(50);

      // Fetch account balances
      const { data: accounts } = await supabase
        .from('accounts')
        .select('account_name, balance, category')
        .eq('user_id', userId);

      // Fetch last 10 messages for conversation context
      const { data: history } = await supabase
        .from('finny_messages')
        .select('role, content')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      const priorMessages = (history || []).reverse();

      // Build Finny's system prompt
      const systemPrompt = `You are Finny, a friendly and honest AI financial advisor inside the Accrue app.
Your job is to help users understand their spending habits, flag poor financial behaviors, and give practical advice.
Always be encouraging but direct. Never be preachy. Keep responses concise and conversational.

Current account balances:
${(accounts || []).map(a => `- ${a.account_name} (${a.category}): $${a.balance}`).join('\n')}

Recent transactions (last 50):
${(transactions || []).map(t => `- ${t.date}: ${t.name} $${t.amount} [${t.category}]`).join('\n')}

Guidelines:
- Flag overspending, impulse purchases, or high-interest debt patterns
- Celebrate positive behaviors like saving or paying down debt
- If you notice recurring subscriptions, mention them
- Always base your advice on the actual transaction data above
- If you don't have enough data, say so honestly`;

      // Build conversation history for Gemini
      const chatHistory = priorMessages.map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const result = await anthropic.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 1024,
  system: systemPrompt,
  messages: [
    ...chatHistory.map((m: any) => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.parts[0].text,
    })),
    { role: 'user', content: message },
  ],
});
const reply = (result.content[0] as any).text;

      // Save both messages to Supabase
      await supabase.from('finny_messages').insert([
        { user_id: userId, role: 'user',      content: message },
        { user_id: userId, role: 'assistant', content: reply   },
      ]);

      res.json({ reply });
    } catch (err: any) {
      console.error('[Finny] chat error:', err.message);
      res.status(500).json({ error: 'Finny is unavailable right now' });
    }
  });

  // ============================================================
  // 404 catch-all for API routes
  // ============================================================
  app.all(['/plaid/*path', '/ai/*path'], (req, res) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.path });
  });

  // ============================================================
  // VITE — dev middleware or static production build
  // ============================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Accrue] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Accrue] Server failed to start:', err);
  process.exit(1);
});