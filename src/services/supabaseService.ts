import { supabase } from '../lib/supabase';

export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  return profile;
};

export const onAuthStateChanged = (callback: any) => supabase.auth.onAuthStateChange(callback);
export const signOut = () => supabase.auth.signOut();
export const saveUserData = async (userId: string, data: any) => {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...data }, { onConflict: 'id' });
  if (error) console.error("Supabase Sync Error:", error);
};

export const bulkSaveTransactions = async (userId: string, transactions: any[]) => {
  const { error } = await supabase
    .from('transactions')
    .insert(transactions.map(tx => ({ 
      plaid_transaction_id: String(tx.plaid_transaction_id || tx.transaction_id || tx.id),
      user_id: userId,
      plaid_account_id: String(tx.account_id || tx.plaid_account_id),
      amount: parseFloat(String(tx.amount || 0)),
      date: tx.date,
      category: tx.category?.[0] || 'General',
      merchant_name: tx.merchant_name || tx.name,
      category_primary: tx.category_primary || 'Uncategorized'
    })));
  if (error) {
    console.error("Supabase Bulk Save Error:", error);
    throw error;
  }
};

export const saveAccountsToSupabase = async (userId: string, accounts: any[]) => {
  const { error } = await supabase
    .from('accounts')
    .upsert(accounts.map(acc => ({
      user_id: userId,
      account_name: acc.name,
      balance: acc.balance,
      category: acc.category,
      institution: acc.provider,
      plaid_access_token: acc.accessToken
    })), { onConflict: 'user_id,account_name' });
  if (error) throw error;
};

export const saveTransactionsToSupabase = async (userId: string, transactions: any[]) => {
  const { error } = await supabase
    .from('transactions')
    .upsert(transactions.map(tx => ({
      plaid_transaction_id: String(tx.transaction_id || tx.plaid_transaction_id || tx.id),
      user_id: userId,
      amount: parseFloat(String(tx.amount || 0)),
      date: tx.date,
      category: tx.category?.[0] || 'General',
      merchant_name: tx.merchant_name || tx.name,
      plaid_account_id: String(tx.account_id || tx.plaid_account_id),
      category_primary: tx.category_primary || 'Uncategorized'
    })), { onConflict: 'plaid_transaction_id' });
  if (error) {
     console.error("Supabase Save Transactions Error:", JSON.stringify(error, null, 2));
     throw error;
  }
};

export const getAccountsFromSupabase = async (userId: string) => {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error("Accounts fetch failed:", error);
    throw error;
  }
  return data;
};

export const syncPlaidToSupabase = async (userId: string, accounts: any[], transactions: any[]) => {
  try {
    await saveAccountsToSupabase(userId, accounts);
    await saveTransactionsToSupabase(userId, transactions);
  } catch (error) {
    console.error("Sync Plaid to Supabase Error:", error);
    throw error;
  }
};

export const auth = supabase.auth;
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};
export const resetPassword = async (email: string) => {};
export const fetchChallengesForSymptom = async (symptomId: string) => [];
export const fetchToolsForSymptom = async (symptomId: string) => [];

export const syncFinancialData = async (userId: string, accessToken: string) => {
  try {
    // Note: We use our internal proxy /api/plaid/get-accounts to communicate with Plaid.
    // This is because direct client-side fetch to https://sandbox.plaid.com is blocked by CORS 
    // and would expose our client_id and secret in the browser.
    const response = await fetch('/proxy/plaid/get-accounts', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-supabase-auth': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      },
      body: JSON.stringify({ accessToken })
    });

    if (!response.ok) {
      throw new Error(`Plaid fetch failed: ${response.statusText}`);
    }

    const { accounts } = await response.json();
    console.log('[Accrue] Received accounts from Plaid:', accounts);

    for (const acc of accounts) {
      // Map Plaid data to Supabase schema
      const accountData = {
        user_id: userId,
        account_name: acc.name,
        balance: acc.balances.current,
        category: acc.subtype || acc.type,
        institution: 'Linked Bank', // Simplified for this function
        plaid_access_token: accessToken,
        interest_rate: acc.type === 'credit' ? 0.25 : null // 25% APR for credit accounts
      };

      console.log(`[Accrue] Syncing account: ${acc.name}`, accountData);

      const { error } = await supabase
        .from('accounts')
        .insert(accountData);

      if (error) {
        console.error(`[Accrue] Failed to insert account ${acc.name}:`, error.message);
      }
    }

    return accounts;
  } catch (error) {
    console.error('[Accrue] syncFinancialData Error:', error);
    throw error;
  }
};

export const syncToEdgeFunction = async (userId: string, plaidAccounts: any[]) => {
  try {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const functionUrl = 'https://fsuaovrrbhhzbktivvza.supabase.co/functions/v1/quick-service';

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({
        plaid_accounts: plaidAccounts,
        user_id: userId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function call failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[Accrue] Edge Function Sync Result:', data);
    return data;
  } catch (error) {
    console.error('[Accrue] syncToEdgeFunction Error:', error);
    throw error;
  }
};
