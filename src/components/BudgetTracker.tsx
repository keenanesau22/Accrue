import React, { useState, useEffect } from 'react';
import { Budget } from '../types';
import { Plus, Trash2, Sparkles, Loader2, Edit2, DollarSign } from 'lucide-react';
import { BUDGET_CATEGORIES } from '../constants';
import { GoogleGenAI } from "@google/genai";
import BudgetModal from './BudgetModal';
import FinnyCelebrationModal from './FinnyCelebrationModal';
import ErrorBoundary from './ErrorBoundary';
import { supabase } from '../lib/supabase';
import { getUser } from '../services/supabaseService';

interface BudgetTrackerProps {
  transactions: any[];
}

const BudgetTracker: React.FC<BudgetTrackerProps> = ({ transactions }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);
  const [celebration, setCelebration] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [loading, setLoading] = useState(true);

  // Auto-Actuals: Sync transactions to budgets table
  useEffect(() => {
    const syncActuals = async () => {
      const user = await getUser();
      if (!user || budgets.length === 0) return;

      const updatedBudgets = budgets.map(budget => {
        const spent = transactions
          .filter(t => {
            if (!t || t.amount <= 0) return false;
            const tCat = (t.category || t.category_primary || 'General').toLowerCase();
            const bCat = budget.category.toLowerCase();
            
            // Fuzzy Matcher: check if budget category is contained in transaction category or vice versa
            return tCat.includes(bCat) || bCat.includes(tCat) || 
                   (bCat === 'food' && tCat.includes('drink')) ||
                   (bCat === 'transport' && tCat.includes('travel')) ||
                   (bCat === 'housing' && tCat.includes('rent'));
          })
          .reduce((sum, t) => sum + (t?.amount || 0), 0);
        return { ...budget, current_actual: spent };
      });

      // Check if we actually need to update to avoid infinite loops
      const hasChanges = updatedBudgets.some((updated, idx) => 
        updated.current_actual !== budgets[idx].current_actual
      );

      if (hasChanges) {
        setBudgets(updatedBudgets);
        // Optimized: Single batch upsert
        const { error } = await supabase
          .from('budgets')
          .upsert(updatedBudgets.map(b => ({ ...b, user_id: user.id })), { onConflict: 'id' });
        
        if (error) console.error("[ACCRUE] Budget Auto-Actual Sync Error:", error);
      }
    };

    if (transactions.length > 0) {
      syncActuals();
    }
  }, [transactions, budgets.length]); // Use length to avoid re-triggering when data within changes

  useEffect(() => {
    const fetchBudgets = async () => {
      const user = await getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error("Error fetching budgets:", error);
      } else {
        setBudgets(data || []);
      }
      setLoading(false);
    };

    fetchBudgets();
  }, []);

  const totalIncome = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const getPacing = (spent: number, limit: number) => {
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthCompletion = currentDay / daysInMonth;
    const spendingCompletion = spent / limit;

    if (spendingCompletion > monthCompletion + 0.1) {
      return { status: 'Fast Burn', color: 'bg-rose-100 text-rose-700' };
    } else if (spendingCompletion > monthCompletion) {
      return { status: 'Ahead of Pace', color: 'bg-amber-100 text-amber-700' };
    } else {
      return { status: 'On Track', color: 'bg-emerald-100 text-emerald-700' };
    }
  };

  const handleSaveBudget = async (budget: Budget) => {
    const user = await getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('budgets')
        .upsert({ ...budget, user_id: user.id }, { onConflict: 'id' });
      
      if (error) throw error;
      
      if (!editingBudget) {
        setCelebration({ isOpen: true, message: `You've added a budget for ${budget.category}! Great step towards your goals!` });
      }
      setEditingBudget(undefined);
      setIsBudgetModalOpen(false);
      
      // Refresh budgets
      const { data } = await supabase.from('budgets').select('*').eq('user_id', user.id);
      setBudgets(data || []);
    } catch (error) {
      console.error("Error saving budget:", error);
    }
  };

  const deleteBudget = async (id: string) => {
    const user = await getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setBudgets(budgets.filter(b => b.id !== id));
    } catch (error) {
      console.error("Error deleting budget:", error);
    }
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>;

  return (
    <ErrorBoundary>
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 w-full max-w-full overflow-hidden">
        <h3 className="text-xl font-fredoka font-bold text-slate-900">Monthly Budget</h3>
        <button onClick={() => { setEditingBudget(undefined); setIsBudgetModalOpen(true); }} className="w-full bg-slate-50 border border-dashed border-slate-200 p-4 rounded-xl text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
          <Plus size={18} /> Add Budget Item
        </button>
        <div className="space-y-4">
          {budgets.map(budget => {
            const spent = budget.current_actual || 0;
            const progress = Math.min(100, (spent / budget.amount) * 100);
            const status = spent < budget.amount ? 'Underspending' : spent === budget.amount ? 'On Pace' : 'Overspending';
            const diff = Math.abs(spent - budget.amount);
            const pacing = getPacing(spent, budget.amount);

            return (
              <div key={budget.id} className="p-4 bg-slate-50 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-sm">{budget.category}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${pacing.color}`}>
                      {pacing.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => { setEditingBudget(budget); setIsBudgetModalOpen(true); }} className="text-indigo-600 hover:scale-110 transition-transform"><Edit2 size={16} /></button>
                      <button onClick={() => deleteBudget(budget.id)} className="text-rose-400 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all duration-500 ${progress > 90 ? 'bg-rose-500' : progress > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  <span>{status} by ${diff.toFixed(2)}</span>
                  <span>${spent.toFixed(2)} / ${budget.amount.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <BudgetModal 
          isOpen={isBudgetModalOpen} 
          onClose={() => setIsBudgetModalOpen(false)} 
          onSave={handleSaveBudget} 
          budget={editingBudget}
          totalIncome={totalIncome}
        />
        <FinnyCelebrationModal 
          isOpen={celebration.isOpen} 
          onClose={() => setCelebration({ ...celebration, isOpen: false })} 
          message={celebration.message}
        />
      </div>
    </ErrorBoundary>
  );
};

export default BudgetTracker;
