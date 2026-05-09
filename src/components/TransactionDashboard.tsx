import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import TransactionTable from './TransactionTable';
import { supabase } from '../lib/supabase';
import { getUser } from '../services/supabaseService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Budget } from '../types';
import { BUDGET_CATEGORIES } from '../constants';
import BudgetTracker from './BudgetTracker';
import ErrorBoundary from './ErrorBoundary';

interface TransactionDashboardProps {
  onClose: () => void;
}

const TransactionDashboard: React.FC<TransactionDashboardProps> = ({ onClose }) => {
  const [timeRange, setTimeRange] = useState<'MTD' | 'QTD' | 'YTD' | 'All' | 'Custom'>('YTD');
  const [flow, setFlow] = useState<'Income' | 'Expenses'>('Income');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [userId, setUserId] = useState<string>('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadTransactions = async (uid?: string) => {
    try {
      const idToUse = uid || userId;
      if (!idToUse) return;
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', idToUse)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const user = await getUser();
      if (user) {
        setUserId(user.id);
        await loadTransactions(user.id);
      }
    };
    init();
  }, []);

  const handleSyncTransactions = async () => {
    if (!userId || isSyncing) return;
    console.log(`[ACCRUE] Initiating sync for frontend UUID: ${userId}`);
    setIsSyncing(true);
    try {
      const response = await fetch('/proxy/plaid/sync-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-auth': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (data.success) {
        console.log(`Synced ${data.count} transactions`);
        await loadTransactions();
      }
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const flowColor = flow === 'Income' ? 'text-emerald-500' : 'text-rose-500';
  const flowBg = flow === 'Income' ? 'bg-emerald-500' : 'bg-rose-500';

  const chartData = useMemo(() => {
    const filtered = transactions.filter(t => (flow === 'Income' ? t.amount < 0 : t.amount > 0));
    const grouped: Record<string, number> = {};
    filtered.forEach(t => {
      const date = t.date;
      grouped[date] = (grouped[date] || 0) + Math.abs(t.amount);
    });
    return Object.entries(grouped).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, flow]);

  if (loading) return <div className="fixed inset-0 z-[600] flex items-center justify-center bg-white"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 z-[600] bg-white p-4 md:p-12 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className='flex items-center gap-4 w-full md:w-auto'>
              <button onClick={onClose} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100"><ArrowLeft size={20}/></button>
              <div className='flex flex-col'>
                  <h2 className="text-xl md:text-2xl font-fredoka font-bold text-gray-800">Transactions Dashboard</h2>
                  <p className='text-[10px] md:text-xs text-gray-500 uppercase tracking-widest'>Real-time Registry Intelligence</p>
              </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={handleSyncTransactions}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                isSyncing 
                  ? 'bg-gray-100 border-gray-200 text-gray-400' 
                  : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Loader2 size={16} />}
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isSyncing ? 'Syncing...' : 'Sync Transactions'}
              </span>
            </button>
            <div className="flex flex-wrap justify-center bg-gray-50 p-1 rounded-full border border-gray-100">
              {(['MTD', 'QTD', 'YTD', 'All', 'Custom'] as const).map(range => (
                <button key={range} onClick={() => setTimeRange(range)} className={`px-3 md:px-4 py-1.5 rounded-full font-bold text-[10px] md:text-xs ${timeRange === range ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        {timeRange === 'Custom' && (
          <div className="flex flex-wrap gap-4 mb-8 justify-center">
              <input type="date" value={customDates.start} onChange={e => setCustomDates({...customDates, start: e.target.value})} className="p-2 rounded-lg border border-gray-200 text-sm" />
              <input type="date" value={customDates.end} onChange={e => setCustomDates({...customDates, end: e.target.value})} className="p-2 rounded-lg border border-gray-200 text-sm" />
          </div>
        )}

        <div className="bg-white p-4 md:p-8 rounded-3xl border border-gray-100 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
              <div className="flex flex-wrap justify-center bg-gray-100 p-1 rounded-full w-full md:w-auto">
                  {(['Income', 'Expenses'] as const).map(cat => (
                  <button key={cat} onClick={() => setFlow(cat)} className={`px-3 md:px-6 py-2 rounded-full font-bold text-[10px] md:text-xs ${flow === cat ? (cat === 'Income' ? 'bg-white text-emerald-500 shadow-sm' : 'bg-white text-rose-500 shadow-sm') : 'text-gray-500'}`}>
                      {cat.toUpperCase()}
                  </button>
                  ))}
              </div>
              <div className='text-right'>
                  <p className='text-xs text-gray-400 uppercase tracking-widest'>Selected Flow</p>
                  <p className={`text-2xl md:text-3xl font-fredoka font-bold ${flowColor}`}>$0</p>
              </div>
          </div>

          <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                      <Tooltip 
                          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, flow]}
                      />
                      <Bar dataKey="amount" fill={flow === 'Income' ? '#10b981' : '#f43f5e'} radius={[4, 4, 0, 0]} />
                  </BarChart>
              </ResponsiveContainer>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">{flow} Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BUDGET_CATEGORIES.map(category => {
              const amount = transactions
                .filter(t => t && t.category === category && (flow === 'Income' ? t.amount < 0 : t.amount > 0))
                .reduce((sum, t) => sum + Math.abs(t?.amount || 0), 0);
              return amount > 0 ? (
                <div key={category} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{category}</p>
                  <p className="text-lg font-bold text-gray-800">${amount.toLocaleString()}</p>
                </div>
              ) : null;
            })}
          </div>
        </div>

        <div className="mb-8">
          <BudgetTracker transactions={transactions} />
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">Verified Registry Log</h3>
          <TransactionTable userId={userId} />
        </div>
        
        <div className="flex items-center justify-center mt-8">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
              <Loader2 className="animate-spin text-emerald-500" size={16} />
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  SECURE REGISTRY SYNCING...
              </p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default TransactionDashboard;
