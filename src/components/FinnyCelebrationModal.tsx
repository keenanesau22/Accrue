import React from 'react';
import { X, Sparkles, Trophy } from 'lucide-react';

interface FinnyCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

const FinnyCelebrationModal: React.FC<FinnyCelebrationModalProps> = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-emerald-100 animate-in zoom-in-95 duration-300 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="bg-emerald-100 p-4 rounded-full text-emerald-600">
            <Trophy size={40} />
          </div>
          <h3 className="text-2xl font-fredoka font-bold text-slate-900">Great Job!</h3>
          <p className="text-slate-600 font-medium">{message}</p>
          <button onClick={onClose} className="w-full bg-emerald-700 text-white py-3 rounded-xl font-bold hover:bg-emerald-800 transition-colors">
            Keep it up!
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinnyCelebrationModal;
