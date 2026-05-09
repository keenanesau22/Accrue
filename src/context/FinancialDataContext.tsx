import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { Symptom, Account, FinancialAccount } from '../types';
import { MockAccount } from '../lib/mockAccounts';
import { supabase } from '../lib/supabase';
import { getUser } from '../services/supabaseService';

interface Transaction {
  id: string;
  plaid_transaction_id: string;
  user_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string;
  category: string;
  category_primary: string;
  plaid_account_id: string;
}

interface FinancialDataContextType {
  activeSymptom: Symptom | null;
  linkedAccount: Account | null;
  accounts: MockAccount[];
  allAccounts: FinancialAccount[];
  transactions: Transaction[];
  isDataLoading: boolean;
  errorStatus: 'MISSING_TABLES' | 'AUTH_ERROR' | null;
  dashboardMetrics: {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
  };
  refreshData: () => Promise<void>;
  setActiveSymptom: (symptom: Symptom | null) => void;
  setLinkedAccount: (account: Account | null) => void;
  setAccounts: (accounts: MockAccount[]) => void;
  setAllAccounts: (accounts: FinancialAccount[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
}

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

export const FinancialDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  useEffect(() => {
    console.log('--- Environment Variable Diagnostic ---');
    console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'PRESENT' : 'MISSING');
    console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING');
    console.log('VITE_PLAID_CLIENT_ID:', import.meta.env.VITE_PLAID_CLIENT_ID ? 'PRESENT' : 'MISSING');
    console.log('VITE_PLAID_SECRET:', import.meta.env.VITE_PLAID_SECRET ? 'PRESENT' : 'MISSING');
    console.log('VITE_PLAID_ENV:', import.meta.env.VITE_PLAID_ENV);
    console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'PRESENT' : 'MISSING');
    console.log('---------------------------------------');
  }, []);

  const [activeSymptom, setActiveSymptom] = useState<Symptom | null>(null);
  const [linkedAccount, setLinkedAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<MockAccount[]>([]);
  const [allAccounts, setAllAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<'MISSING_TABLES' | 'AUTH_ERROR' | null>(null);

  const fetchInitialData = async () => {
    // Configuration Check
    if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
      console.warn("[Accrue] Supabase not configured. Skipping data hydration.");
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(true);
    try {
      console.log('[Accrue] Attempting data hydration from Supabase...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn("[Accrue] Session check failed: ", sessionError.message);
        if (sessionError.message.includes('JWT expired')) {
          console.error("[Accrue] JWT Expired during session check. Clearing all auth data.");
          localStorage.clear(); // Nuclear option
          await supabase.auth.signOut();
          window.location.reload();
          return;
        }
      }

      const user = session?.user;
      
      if (user) {
        console.log('[Accrue] User session found:', user.email);
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error("[Accrue] Accounts fetch error:", error.message);
          // Specific handling for missing tables
          if (error.message.includes('schema cache') || error.message.includes('relation "accounts" does not exist')) {
            setErrorStatus('MISSING_TABLES');
            return;
          }
          // If JWT is expired, clear the session to force a fresh login
          if (error.message.includes('JWT expired')) {
            console.warn("[Accrue] Session expired during query. Clearing local state.");
            localStorage.clear();
            await supabase.auth.signOut();
            setAllAccounts([]);
            window.location.reload(); 
            return;
          }
        } else if (data) {
          console.log(`[Accrue] Hydrated ${data.length} accounts.`);
          setAllAccounts(data.map(acc => ({
            id: acc.id,
            name: acc.account_name,
            balance: acc.balance,
            type: (acc.category === 'debt' || acc.category === 'mortgage' || acc.category === 'car-loan' || acc.category === 'student-loan' || acc.category === 'student' || acc.category === 'credit-card' || acc.category === 'credit card' || acc.category === 'credit' || acc.category === 'loan' || acc.category === 'overdraft' || acc.category === 'line of credit') ? 'liability' : 'asset',
            category: acc.category,
            provider: acc.institution,
            isLinked: true,
            plaid_account_id: acc.plaid_account_id
          })));
        }

        // Fetch transactions
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (txError) {
          console.error("[Accrue] Transactions fetch error:", txError.message);
        } else if (txData) {
          console.log(`[Accrue] Hydrated ${txData.length} transactions.`);
          setTransactions(txData);
        }
      } else {
        console.log('[Accrue] No active user session found after hydration attempt.');
      }
    } catch (error: any) {
      console.error("Hydration failed completely:", error?.message || error);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();

    // Also listen for auth changes to re-fetch if needed
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchInitialData();
      } else if (event === 'SIGNED_OUT') {
        setAllAccounts([]);
        setTransactions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const dashboardMetrics = useMemo(() => {
    const totalAssets = allAccounts
      .filter(a => a.type === 'asset')
      .reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = allAccounts
      .filter(a => a.type === 'liability')
      .reduce((sum, a) => sum + a.balance, 0);
    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities
    };
  }, [allAccounts]);

  return (
    <FinancialDataContext.Provider value={{
      activeSymptom,
      linkedAccount,
      accounts,
      allAccounts,
      transactions,
      isDataLoading,
      errorStatus,
      dashboardMetrics,
      refreshData: fetchInitialData,
      setActiveSymptom,
      setLinkedAccount,
      setAccounts,
      setAllAccounts,
      setTransactions
    }}>
      {children}
    </FinancialDataContext.Provider>
  );
};

export const useFinancialData = () => {
  const context = useContext(FinancialDataContext);
  if (!context) {
    throw new Error('useFinancialData must be used within a FinancialDataProvider');
  }
  return context;
};
