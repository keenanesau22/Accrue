import { supabase } from '../lib/supabase';
import { FinancialAccount, Transaction } from '../types';

export const saveUserData = async (userId: string, data: any) => {
  const { error } = await supabase
    .from('users')
    .upsert({ id: userId, ...data }, { onConflict: 'id' });
  if (error) console.error("Supabase Sync Error:", error);
};

export const bulkSaveTransactions = async (userId: string, transactions: any[]) => {
  const { error } = await supabase
    .from('transactions')
    .insert(transactions.map(tx => ({ 
      plaid_transaction_id: String(tx.plaid_transaction_id || tx.transaction_id || tx.id),
      user_id: userId,
      amount: parseFloat(String(tx.amount || 0)),
      date: tx.date,
      category: tx.category || 'Food',
      merchant_name: tx.merchant_name || 'Mock Merchant',
      plaid_account_id: tx.plaid_account_id || 'mock-acc-id'
    })));
  if (error) {
    console.error("Supabase Bulk Save Error:", error);
    throw error;
  }
};

export const generateMockData = async (userId: string, accountCount: number) => {
  const accounts: FinancialAccount[] = Array.from({ length: accountCount }, (_, i) => ({
    id: `acc-${i}`,
    name: `Mock Account ${i + 1}`,
    type: i % 2 === 0 ? 'asset' : 'liability',
    category: 'cash',
    balance: Math.floor(Math.random() * 10000),
  }));

  const transactions: Transaction[] = Array.from({ length: 20 }, (_, i) => ({
    id: `tx-${i}`,
    plaid_transaction_id: `tx-${i}`,
    amount: Math.floor(Math.random() * 500),
    date: new Date().toISOString(),
    category: 'Food',
    merchant_name: 'Mock Merchant',
    user_id: userId,
  }));

  await saveUserData(userId, { netWorth: { accounts, lastSynced: new Date().toISOString() } });
  await bulkSaveTransactions(userId, transactions);
};
