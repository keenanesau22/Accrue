
import React from 'react';
import { Flame, Gem, Sparkles } from 'lucide-react';

interface DailyRewardModalProps {
  streak: number;
  onClose: () => void;
}

const DailyRewardModal: React.FC<DailyRewardModalProps> = ({ streak, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-500 delay-100">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-rose-400 blur-2xl opacity-20 animate-pulse rounded-full"></div>
          <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center text-5xl relative z-10 border-4 border-white shadow-lg">
            <Gem className="text-rose-500" fill="currentColor" size={48} />
          </div>
          <div className="absolute -top-2 -right-2 bg-orange-500 text-white p-2 rounded-full border-4 border-white shadow-md animate-bounce">
            <Flame size={20} fill="currentColor" />
          </div>
        </div>

        <h2 className="text-3xl font-fredoka font-bold text-gray-800 mb-2">Streak Maintained!</h2>
        <p className="text-gray-500 mb-8">
          You're on a <span className="text-orange-600 font-bold">{streak} day streak</span>. 
          Here is your free daily gem for being consistent!
        </p>

        <div className="bg-emerald-50 rounded-2xl p-4 mb-8 flex items-center justify-center gap-3 border border-emerald-100">
          <Sparkles className="text-emerald-500" size={20} />
          <span className="font-black text-emerald-700 uppercase tracking-widest text-sm">+1 Gem Earned</span>
          <Sparkles className="text-emerald-500" size={20} />
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-[0_6px_0_#059669] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all text-lg"
        >
          COLLECT & CONTINUE
        </button>
      </div>
    </div>
  );
};

export default DailyRewardModal;
