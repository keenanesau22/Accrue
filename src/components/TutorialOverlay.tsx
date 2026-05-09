
import React, { useState, useEffect } from 'react';
import { Home, Wallet, MessageSquare, ShoppingBag, User, X, ArrowRight, Sparkles } from 'lucide-react';

interface TutorialOverlayProps {
  onComplete: () => void;
  onStepChange?: (highlightId: string | null) => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete, onStepChange }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Accrue!',
      desc: "I'm Finny, your AI guide. Let's take a 30-second tour of your new financial cockpit.",
      icon: <span className="text-5xl">🦉</span>,
      highlight: null
    },
    {
      title: 'Learn',
      desc: 'This is your home base. Complete bite-sized lessons to earn gems and build real mastery.',
      icon: <Home size={32} className="text-emerald-500" />,
      highlight: 'dashboard'
    },
    {
      title: 'Wealth',
      desc: 'Sync your real accounts (Pro only) to track your net worth and get personalized growth strategies.',
      icon: <Wallet size={32} className="text-emerald-500" />,
      highlight: 'wealth'
    },
    {
      title: 'Chat with Finny',
      desc: 'Ask me anything about money. I use advanced AI to explain complex topics simply.',
      icon: <MessageSquare size={32} className="text-emerald-500" />,
      highlight: 'chat'
    },
    {
      title: 'Marketplace',
      desc: 'Spend your earned gems here to unlock professional financial tools and templates.',
      icon: <ShoppingBag size={32} className="text-emerald-500" />,
      highlight: 'shop'
    },
    {
      title: 'Profile',
      desc: 'Customize your avatar and view your global rank. Ready to start?',
      icon: <User size={32} className="text-emerald-500" />,
      highlight: 'profile'
    }
  ];

  useEffect(() => {
    if (onStepChange) {
      onStepChange(steps[step].highlight || null);
    }
  }, [step]);

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="max-w-sm w-full bg-white rounded-[3rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-500">
        <button onClick={onComplete} className="absolute top-6 right-6 text-gray-300 hover:text-gray-500 transition-colors">
          <X size={24} />
        </button>

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center border-2 border-emerald-100 shadow-sm">
            {current.icon}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-fredoka font-bold text-gray-800">{current.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{current.desc}</p>
          </div>

          <div className="w-full pt-4 space-y-4">
            <button 
              onClick={() => step < steps.length - 1 ? setStep(step + 1) : onComplete()}
              className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-[0_6px_0_#059669] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {step === steps.length - 1 ? "LET'S ACCRUE!" : 'CONTINUE'} <ArrowRight size={20} />
            </button>
            <button onClick={onComplete} className="text-[10px] font-black text-gray-300 hover:text-gray-400 uppercase tracking-[0.2em] transition-colors">
              Skip Tutorial
            </button>
          </div>

          <div className="flex gap-1 justify-center">
            {steps.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === step ? 'w-4 bg-emerald-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
      </div>

      {current.highlight && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none">
           <div className="bg-emerald-500 text-white px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest animate-bounce flex items-center gap-2 shadow-lg">
              <Sparkles size={12} /> Find it here
           </div>
        </div>
      )}
    </div>
  );
};

export default TutorialOverlay;
