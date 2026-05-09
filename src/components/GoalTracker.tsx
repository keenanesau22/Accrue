import React, { useState, useMemo, useEffect } from 'react';
import { Goal, Transaction, FinancialAccount } from '../types';
import { Plus, Target, Trash2, CheckCircle, CalendarDays, TrendingUp, TrendingDown, Edit2 } from 'lucide-react';
import GoalModal from './GoalModal';
import FinnyCelebrationModal from './FinnyCelebrationModal';
import { supabase } from '../lib/supabase';
import ErrorBoundary from './ErrorBoundary';

interface GoalTrackerProps {
  transactions: Transaction[];
  accounts: FinancialAccount[];
}

const GoalTracker: React.FC<GoalTrackerProps> = ({ transactions, accounts }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filter, setFilter] = useState<'savings' | 'debt'>('savings');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [celebration, setCelebration] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error("Error fetching goals:", error);
      } else {
        setGoals(data as Goal[]);
      }
      setIsLoading(false);
    };

    fetchGoals();
  }, []);

  const monthlySavings = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTransactions = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);
    const income = Math.abs(recentTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
    const spending = recentTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    return Math.max(100, income - spending);
  }, [transactions]);

  const getEstimatedDate = (goal: Goal) => {
    const remaining = goal.targetAmount - goal.currentAmount;
    if (remaining <= 0) return new Date();
    const months = Math.ceil(remaining / monthlySavings);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  };

  const handleSaveGoal = async (goal: Goal) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingGoal) {
      const { error } = await supabase
        .from('goals')
        .update(goal)
        .eq('id', goal.id)
        .eq('user_id', user.id);
      if (error) console.error("Error updating goal:", error);
    } else {
      const { error } = await supabase
        .from('goals')
        .insert({ ...goal, user_id: user.id });
      if (error) console.error("Error inserting goal:", error);
      else setCelebration({ isOpen: true, message: `You've set a new goal: ${goal.title}! Let's get to work!` });
    }
    
    // Refresh goals
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id);
    setGoals(data as Goal[]);
    
    setEditingGoal(undefined);
    setIsGoalModalOpen(false);
  };

  const handleProgress = async (goal: Goal) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const updatedGoal = { ...goal, currentAmount: goal.currentAmount + 100 };
    const { error } = await supabase
      .from('goals')
      .update(updatedGoal)
      .eq('id', goal.id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error("Error updating goal progress:", error);
      return;
    }

    setGoals(goals.map(g => g.id === goal.id ? updatedGoal : g));
    
    if (updatedGoal.currentAmount >= updatedGoal.targetAmount) {
        setCelebration({ isOpen: true, message: `Congratulations! You've reached your goal: ${goal.title}!` });
    } else if (updatedGoal.currentAmount >= updatedGoal.targetAmount / 2 && goal.currentAmount < updatedGoal.targetAmount / 2) {
        setCelebration({ isOpen: true, message: `You're halfway to your goal: ${goal.title}! Keep going!` });
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) console.error("Error deleting goal:", error);
    else setGoals(goals.filter(g => g.id !== id));
  };

  const filteredGoals = goals.filter(g => 
    filter === 'savings' ? g.category === 'savings' : g.category === 'debt-payoff'
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <ErrorBoundary>
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-fredoka font-bold text-slate-900 flex items-center gap-2"><Target className="text-emerald-700" size={18} /> Wealth Goals</h3>
          <div className="flex bg-slate-100 rounded-full p-1">
            <button onClick={() => setFilter('savings')} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${filter === 'savings' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Savings</button>
            <button onClick={() => setFilter('debt')} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${filter === 'debt' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Debt</button>
          </div>
        </div>
        
        <button onClick={() => { setEditingGoal(undefined); setIsGoalModalOpen(true); }} className="w-full bg-slate-50 border border-dashed border-slate-200 p-4 rounded-xl text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
          <Plus size={18} /> Add New Goal
        </button>

        <div className="space-y-4">
          {filteredGoals.map(goal => {
            const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            const estimatedDate = getEstimatedDate(goal);
            const deadlineDate = new Date(goal.deadline);
            const isOnSchedule = estimatedDate <= deadlineDate;
            
            return (
              <div key={goal.id} className="p-4 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                      {goal.category === 'savings' ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-rose-500" />}
                      <p className="font-bold text-slate-900 text-sm truncate">{goal.title}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleProgress(goal)} className="text-emerald-700"><CheckCircle size={16} /></button>
                    <button onClick={() => { setEditingGoal(goal); setIsGoalModalOpen(true); }} className="text-indigo-600"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteGoal(goal.id)} className="text-rose-600"><Trash2 size={16} /></button>
                  </div>
                </div>
                {goal.category === 'debt-payoff' && (
                  <div className="text-[10px] text-slate-500 flex gap-4">
                      {goal.interestRate && <span>APR: {goal.interestRate}%</span>}
                      {goal.minimumMonthlyPayment && <span>Min: ${goal.minimumMonthlyPayment}</span>}
                  </div>
                )}
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className={`${goal.category === 'savings' ? 'bg-emerald-500' : 'bg-rose-500'} h-2 rounded-full`} style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>{goal.currentAmount.toLocaleString()} / {goal.targetAmount.toLocaleString()}</span>
                  <span className={`flex items-center gap-1 ${isOnSchedule ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <CalendarDays size={10} /> {isOnSchedule ? 'On Schedule' : 'Behind'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <GoalModal 
          isOpen={isGoalModalOpen} 
          onClose={() => setIsGoalModalOpen(false)} 
          onSave={handleSaveGoal} 
          goal={editingGoal}
          accounts={accounts}
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

export default GoalTracker;
