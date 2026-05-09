
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Tag, 
  Receipt,
  Inbox,
  Loader2,
  Filter,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUser } from '../services/supabaseService';

interface Transaction {
  id: string;
  plaid_transaction_id: string;
  amount: number;
  date: string;
  category: string;
  merchant_name: string;
  user_id: string;
  categorization?: 'needs' | 'wants' | 'savings';
  entry_type?: 'income' | 'expense' | 'debt_service' | 'investment';
  category_primary?: string;
  category_detailed?: string;
}

interface TransactionTableProps {
  userId: string;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(Math.abs(val));
};

const TransactionTable: React.FC<TransactionTableProps> = ({ userId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      const user = await getUser();
      if (!userId || !user || user.id !== userId) {
        setLoading(false);
        return;
      }

      setError(null);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.error("Error fetching transactions:", error);
        setError("Error loading transactions");
      } else {
        setTransactions(data as Transaction[]);
      }
      setLoading(false);
    };
    fetchTransactions();
  }, [userId]);

  const updateCategorization = async (txId: string, categorization: 'needs' | 'wants' | 'savings') => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ categorization })
        .eq('plaid_transaction_id', txId);
      if (error) throw error;
      
      setTransactions(transactions.map(tx => tx.plaid_transaction_id === txId ? { ...tx, categorization } : tx));
    } catch (err) {
      console.error("Error updating categorization:", err);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => 
      (tx.merchant_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Search Bar Container */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Search by merchant or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 px-14 font-bold text-gray-800 focus:outline-none focus:border-emerald-500 transition-all shadow-sm"
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
           <Filter size={14} className="text-gray-400" />
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] overflow-hidden shadow-xl min-h-[300px] flex flex-col">
        <div className="overflow-x-auto no-scrollbar flex-1">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Transaction</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Categorization</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Category</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <Loader2 className="animate-spin text-emerald-500 mx-auto mb-4" size={32} />
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Scanning Registry...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-emerald-100">
                       <Loader2 className="animate-spin text-emerald-500" size={24} />
                    </div>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">{error}</p>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <Inbox className="text-gray-200 mx-auto mb-4" size={48} />
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">No entries found</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isSpending = tx.amount > 0;
                  return (
                    <tr key={tx.plaid_transaction_id} className="hover:bg-emerald-50/20 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <Calendar size={14} className="text-gray-300" />
                          <span className="text-xs font-bold text-gray-600">{tx.date}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                            <Receipt size={18} className="text-gray-400 group-hover:text-emerald-500" />
                          </div>
                          <span className="text-sm font-black text-gray-800 truncate max-w-[120px] md:max-w-[200px]">
                            {tx.merchant_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                            {(['needs', 'wants', 'savings'] as const).map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => updateCategorization(tx.plaid_transaction_id, cat)}
                                    className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${tx.categorization === cat ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-indigo-200'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-100">
                          <Tag size={10} className="text-emerald-500" />
                          {tx.category}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className={`inline-flex items-center gap-1 font-black text-sm md:text-base ${isSpending ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {isSpending ? '-' : '+'}
                          {formatCurrency(tx.amount)}
                          {isSpending ? (
                            <ArrowDownRight size={14} strokeWidth={3} />
                          ) : (
                            <ArrowUpRight size={14} strokeWidth={3} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full animate-pulse ${error ? 'bg-amber-400' : 'bg-emerald-500'}`} />
           <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">
             {error ? 'Identity Handshake Active' : 'Real-time connection active'}
           </p>
        </div>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{filteredTransactions.length} records</p>
      </div>
    </div>
  );
};

export default TransactionTable;
