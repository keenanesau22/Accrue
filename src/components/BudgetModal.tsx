import React, { useState, useEffect } from 'react';
import { X, DollarSign, Sparkles, Loader2 } from 'lucide-react';
import { Budget } from '../types';
import { BUDGET_CATEGORIES } from '../constants';
import { GoogleGenAI } from "@google/genai";

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (budget: Budget) => void;
  budget?: Budget;
  totalIncome: number;
}

const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, onSave, budget, totalIncome }) => {
  const [category, setCategory] = useState(BUDGET_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    if (budget) {
      setCategory(budget.category);
      setAmount(budget.amount.toString());
    } else {
      setCategory(BUDGET_CATEGORIES[0]);
      setAmount('');
    }
  }, [budget, isOpen]);

  if (!isOpen) return null;

  const suggestAllocation = async () => {
    setIsSuggesting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Suggest a budget allocation for ${category} based on a total monthly income of $${totalIncome}. Return only a JSON object with { "amount": number }. Use widely accepted best practices.`,
        config: { responseMimeType: "application/json" }
      });
      const suggestion = JSON.parse(response.text || '{}');
      setAmount(suggestion.amount.toString());
    } catch (error) {
      console.error("AI suggestion failed", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSave = () => {
    if (!category || !amount) return;
    onSave({
      id: budget ? budget.id : Date.now().toString(),
      category,
      amount: parseFloat(amount),
      percentage: (parseFloat(amount) / totalIncome) * 100,
      period: 'monthly'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-fredoka font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="text-emerald-700" size={20} />
            {budget ? 'Edit Budget' : 'Add Budget Item'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <select id="budget_category" name="category" value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 border rounded-xl text-sm">
            {BUDGET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <div className="flex gap-2">
            <input id="budget_amount" name="amount" type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 p-3 border rounded-xl text-sm" />
            {!budget && (
              <button onClick={suggestAllocation} className="bg-slate-100 text-slate-700 p-3 rounded-xl hover:bg-slate-200 transition-colors" disabled={isSuggesting}>
                {isSuggesting ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              </button>
            )}
          </div>
          <button onClick={handleSave} className="w-full bg-emerald-700 text-white py-3 rounded-xl font-bold hover:bg-emerald-800 transition-colors">
            {budget ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetModal;
