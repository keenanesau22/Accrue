import React, { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useFinancialData } from '../context/FinancialDataContext';
import { FinancialAccount } from '../types';
import { createLinkToken, exchangePublicToken, getAccounts, getTransactions } from '../services/plaidService';
import { getUser, syncPlaidToSupabase, auth, syncFinancialData, syncToEdgeFunction, saveTransactionsToSupabase } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

export const PlaidLinker: React.FC<{ className?: string; children?: React.ReactNode; userId?: string }> = ({ className, children, userId }) => {
  const { setAllAccounts, refreshData } = useFinancialData();
  const [isLoading, setIsLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [shouldOpen, setShouldOpen] = useState(false);

  useEffect(() => {
    // Only pre-fetch if we have a userId
    if (userId && !linkToken) {
      createLinkToken(userId).then(setLinkToken).catch(console.error);
    }
  }, [userId]);

  const normalizePlaidData = (plaidAccounts: any[]): FinancialAccount[] => {
    return plaidAccounts.map(acc => {
      const category = acc.subtype || acc.type;
      const isLiability = (category === 'debt' || category === 'mortgage' || category === 'car-loan' || category === 'student-loan' || category === 'student' || category === 'credit-card' || category === 'credit card' || category === 'credit' || category === 'loan' || category === 'overdraft' || category === 'line of credit');
      
      return {
        id: acc.account_id,
        name: acc.name,
        type: isLiability ? 'liability' : 'asset' as 'asset' | 'liability',
        category: category as any,
        balance: acc.balances.current,
        isLinked: true,
        provider: acc.institution_name || 'Linked Bank'
      };
    });
  };

  const handlePlaidSuccess = async (public_token: string, metadata: any) => {
    console.log('Plaid Link Success Metadata:', metadata);
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const id = userId || session?.user?.id;

      if (!id) {
        console.error('[Accrue] User not authenticated during Plaid success.');
        return;
      }

      // Consolidate logic to the server-side proxy
      console.log('[Accrue] Synchronizing via server proxy...');
      const response = await fetch('/proxy/plaid/exchange-public-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-auth': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({
          publicToken: public_token,
          userId: id
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server exchange failed');
      }

      const result = await response.json();
      console.log('[Accrue] Server Sync Result:', result);
      
      // Fetch and save transactions after successful link
      if (result.access_token) {
        try {
          const now = new Date();
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          
          const endDate = now.toISOString().split('T')[0];
          const startDate = thirtyDaysAgo.toISOString().split('T')[0];
          
          console.log(`[Accrue] Fetching transactions from ${startDate} to ${endDate} using access token...`);
          const transactions = await getTransactions(result.access_token, startDate, endDate);
          
          if (transactions && transactions.length > 0) {
            console.log(`[Accrue] Retrieved ${transactions.length} transactions. Saving to Supabase...`);
            await saveTransactionsToSupabase(id, transactions);
            console.log('[Accrue] Transactions sync complete.');
          } else {
            console.log('[Accrue] No transactions found for this period.');
          }
        } catch (txErr) {
          console.error('[Accrue] Transaction fetching/saving error:', txErr);
        }
      }

      // Update UI immediately without reload
      await refreshData();
      console.log('[Accrue] UI Data Refreshed.');

    } catch (err) {
      console.error('handlePlaidSuccess Error:', err);
      alert('Failed to link account. Please try again.');
    } finally {
      setIsLoading(false);
      setShouldOpen(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handlePlaidSuccess,
    onExit: (err) => {
      console.error('Plaid Exit (Error):', err);
      setShouldOpen(false);
    },
    onEvent: (event, metadata) => {
      console.log('Plaid Event:', event, metadata);
    }
  });

  // Seamless "Fetch then Open" behavior
  useEffect(() => {
    if (ready && shouldOpen) {
      console.log('[Accrue] Plaid is ready and shouldOpen is true. Opening...');
      open();
      setShouldOpen(false);
      setIsLoading(false); // Reset loading state once opened
    }
  }, [ready, shouldOpen, open]);

  const handleLink = useCallback(async () => {
    if (isLoading) return;

    if (!linkToken) {
      setIsLoading(true);
      setShouldOpen(true);
      try {
        const { data: { session } } = await auth.getSession();
        const id = userId || session?.user?.id;
        if (id) {
          const token = await createLinkToken(id);
          setLinkToken(token);
          // useEffect above will catch 'ready' and 'shouldOpen' to call open()
        } else {
          alert('Please sign in first.');
          setShouldOpen(false);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to create link token on click:', err);
        setShouldOpen(false);
        setIsLoading(false);
      }
      return;
    }

    if (ready) {
      open();
    } else {
      setShouldOpen(true);
    }
  }, [ready, open, linkToken, userId, isLoading]);

  return (
    <button
      onClick={handleLink}
      disabled={isLoading}
      className={className || "bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors"}
    >
      {isLoading ? 'Linking...' : children || 'Link Bank Account'}
    </button>
  );
};
