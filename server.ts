import express from 'express';
import cors from 'cors';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the root directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function startServer() {
  const app = express();
  const PORT = 3000; // Platform requirement: Use port 3000

  app.use(cors({ origin: true }));
  app.use(express.json());

  // Global Logger
  app.use((req, res, next) => {
    if (!req.path.startsWith('/@vite') && !req.path.startsWith('/src')) {
      console.log(`[REQUEST] ${req.method} ${req.path}`);
    }
    next();
  });

  // Plaid Client Setup
  const plaidClientId = process.env.VITE_PLAID_CLIENT_ID || process.env.PLAID_CLIENT_ID;
  const plaidSecret = process.env.VITE_PLAID_SECRET || process.env.PLAID_SECRET;
  const plaidEnv = process.env.VITE_PLAID_ENV || process.env.PLAID_ENV || 'sandbox';

  const configuration = new Configuration({
    basePath: PlaidEnvironments[plaidEnv],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': plaidClientId,
        'PLAID-SECRET': plaidSecret,
      },
    },
  });

  const plaidClient = new PlaidApi(configuration);

  // Security Middleware
  app.use((req, res, next) => {
    if (!req.path.includes('/plaid/')) return next();
    if (req.path.endsWith('/create-link-token')) return next();

    const headerKey = req.headers['x-supabase-auth'];
    const expectedKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!headerKey || headerKey !== expectedKey) {
      console.warn(`[Accrue Security] Unauthorized ${req.method} request to ${req.path}`);
      return res.status(401).json({ error: 'Key Mismatch' });
    }
    next();
  });

  const getSupabase = () => {
    return createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.VITE_SUPABASE_ANON_KEY || ''
    );
  };

  // --- API ROUTES ---

  app.post(['/plaid/create-link-token', '/proxy/plaid/create-link-token'], async (req, res) => {
    const { userId } = req.body;
    try {
      const response = await plaidClient.linkTokenCreate({
        user: { client_user_id: userId || 'test-user-123' },
        client_name: 'Accrue Finance',
        products: ['transactions'] as any,
        country_codes: ['US'] as any,
        language: 'en',
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('[ACCRUE] Plaid Link Token Error:', error.response?.data || error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post(['/plaid/exchange-public-token', '/proxy/plaid/exchange-public-token'], async (req, res) => {
    const { publicToken, userId } = req.body;
    try {
      if (!userId) throw new Error('userId is required');
      const response = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
      const { access_token: accessToken, item_id: itemId } = response.data;
      
      const supabase = getSupabase();
      const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
      
      for (const account of accountsResponse.data.accounts) {
        await supabase.from('accounts').upsert({
          user_id: userId,
          account_name: account.name,
          balance: account.balances.current,
          category: account.subtype || account.type,
          institution: 'Linked Bank',
          plaid_access_token: accessToken,
          plaid_account_id: account.account_id,
        }, { onConflict: 'user_id,account_name' });
      }

      res.json({ success: true, itemId, access_token: accessToken });
    } catch (error: any) {
      console.error('[ACCRUE] Plaid Exchange Error:', error.response?.data || error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post(['/plaid/get-accounts', '/proxy/plaid/get-accounts'], async (req, res) => {
    try {
      const { accessToken } = req.body;
      const response = await plaidClient.accountsGet({ access_token: accessToken });
      res.json(response.data);
    } catch (error: any) {
      console.error('Plaid Get Accounts Error:', error.response?.data || error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post(['/plaid/get-transactions', '/proxy/plaid/get-transactions'], async (req, res) => {
    const { accessToken, startDate, endDate } = req.body;
    try {
      const response = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('Plaid Get Transactions Error:', error.response?.data || error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post(['/plaid/sync-transactions', '/proxy/plaid/sync-transactions'], async (req, res) => {
    const { userId } = req.body;
    try {
      if (!userId) throw new Error('userId is required');
      const supabase = getSupabase();
      
      // 1. Get all access tokens for this user
      const { data: accounts, error: accountError } = await supabase
        .from('accounts')
        .select('plaid_access_token')
        .eq('user_id', userId);
      
      if (accountError) throw accountError;
      if (!accounts || accounts.length === 0) {
        return res.json({ success: true, count: 0, message: 'No accounts linked' });
      }

      const uniqueTokens = [...new Set(accounts.map(a => a.plaid_access_token))];
      let totalSynced = 0;

      for (const accessToken of uniqueTokens) {
        if (!accessToken) continue;
        
        // 2. Fetch transactions from Plaid (using a simple reach-back for now)
        // In a real app, use transactionsSync, but for sandbox, transactionsGet is often easier for initial load
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        
        const response = await plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: thirtyDaysAgo.toISOString().split('T')[0],
          end_date: now.toISOString().split('T')[0],
        });

        const plaidTransactions = response.data.transactions;
        
        // 3. Upsert to Supabase
        for (const transaction of plaidTransactions) {
          await supabase.from('transactions').upsert({
            user_id: userId,
            plaid_transaction_id: transaction.transaction_id,
            amount: transaction.amount,
            date: transaction.date,
            name: transaction.name,
            category: transaction.category ? transaction.category[0] : 'General',
            account_id: transaction.account_id,
            pending: transaction.pending
          }, { onConflict: 'plaid_transaction_id' });
          totalSynced++;
        }
      }

      res.json({ success: true, count: totalSynced });
    } catch (error: any) {
      console.error('[ACCRUE] Sync Error:', error.response?.data || error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Catch-all for missing API routes
  app.all(['/plaid/*', '/proxy/*'], (req, res) => {
    console.warn(`[ACCRUE] 404 - API Route Not Found: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Endpoint not found', path: req.path });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Unified server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[ACCRUE] Server failed to start:', err);
});
