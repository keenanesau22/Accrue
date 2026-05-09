import React, { useState, useEffect } from 'react';
import { X, Target } from 'lucide-react';
import { Goal, FinancialAccount } from '../types';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Goal) => void;
  goal?: Goal;
  accounts: FinancialAccount[];
}

const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSave, goal, accounts }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState<'savings' | 'debt-payoff'>('savings');
  const [interestRate, setInterestRate] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [selectedDebtId, setSelectedDebtId] = useState('');

  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description || '');
      setTarget(goal.targetAmount.toString());
      setDeadline(goal.deadline);
      setCategory(goal.category as 'savings' | 'debt-payoff');
      setInterestRate(goal.interestRate?.toString() || '');
      setMinPayment(goal.minimumMonthlyPayment?.toString() || '');
      const debt = accounts.find(a => a.name === goal.title);
      setSelectedDebtId(debt?.id || '');
    } else {
      setTitle('');
      setDescription('');
      setTarget('');
      setDeadline('');
      setCategory('savings');
      setInterestRate('');
      setMinPayment('');
      setSelectedDebtId('');
    }
  }, [goal, isOpen, accounts]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title || !target || !deadline) return;
    onSave({
      id: goal ? goal.id : Date.now().toString(),
      title,
      description,
      targetAmount: parseFloat(target),
      currentAmount: goal ? goal.currentAmount : 0,
      deadline,
      category,
      status: 'active',
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      minimumMonthlyPayment: minPayment ? parseFloat(minPayment) : undefined
    });
    onClose();
  };

  const debtAccounts = accounts.filter(a => a.type === 'liability');

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-fredoka font-bold text-slate-900 flex items-center gap-2">
            <Target className="text-emerald-700" size={20} />
            {goal ? 'Edit Goal' : 'Add New Goal'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button onClick={() => setCategory('savings')} className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest ${category === 'savings' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Savings</button>
            <button onClick={() => setCategory('debt-payoff')} className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest ${category === 'debt-payoff' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Debt</button>
          </div>

          <input id="goal_title" name="title" type="text" placeholder="Goal Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />

          {category === 'debt-payoff' ? (
            <select id="goal_debt_id" name="debt_id" value={selectedDebtId} onChange={(e) => {
              const debt = debtAccounts.find(a => a.id === e.target.value);
              setSelectedDebtId(e.target.value);
              if (debt) {
                setTitle(debt.name);
                setTarget(debt.balance.toString());
              }
            }} className="w-full p-3 border rounded-xl text-sm">
              <option value="">Select a debt...</option>
              {debtAccounts.map(debt => <option key={debt.id} value={debt.id}>{debt.name}</option>)}
            </select>
          ) : null}

          <textarea id="goal_description" name="description" placeholder="Describe your goal for this item..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 border rounded-xl text-sm h-24" />

          {category === 'savings' && (
            <input id="goal_target" name="target" type="number" placeholder="Target Amount" value={target} onChange={(e) => setTarget(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
          )}
          
          <label htmlFor="goal_deadline" className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Date</label>
          <input id="goal_deadline" name="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
          
          <button onClick={handleSave} className="w-full bg-emerald-700 text-white py-3 rounded-xl font-bold hover:bg-emerald-800 transition-colors">
            {goal ? 'Save Changes' : 'Add Goal'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalModal;
