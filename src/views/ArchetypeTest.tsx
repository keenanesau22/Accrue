
import React, { useState } from 'react';
import { ARCHETYPE_TEST_QUESTIONS, ARCHETYPES } from '../constants';
import { ArchetypeStats } from '../types';
import { ChevronRight, ShieldCheck, Zap, Sparkles, SkipForward, Fingerprint, Brain, Rocket, ArrowRight } from 'lucide-react';

interface ArchetypeTestProps {
  onComplete: (scores: ArchetypeStats, archetypeId: string) => void;
  onCancel: () => void;
  onSkip: () => void;
  isInitialOnboarding?: boolean;
}

const ArchetypeTest: React.FC<ArchetypeTestProps> = ({ onComplete, onCancel, onSkip, isInitialOnboarding }) => {
  const [phase, setPhase] = useState<'intro' | 'quiz'>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [cumulativeScores, setCumulativeScores] = useState<ArchetypeStats>({
    riskTolerance: 50,
    timeHorizon: 50,
    spendingDiscipline: 50,
    marketSavvy: 50,
    debtSentiment: 50,
    assetGrowth: 50
  });

  const handleSelect = (scores: Partial<ArchetypeStats>) => {
    const nextScores = { ...cumulativeScores };
    Object.keys(scores).forEach(key => {
      const k = key as keyof ArchetypeStats;
      nextScores[k] = (nextScores[k] * 0.4) + ((scores[k] || 0) * 0.6);
    });
    
    setCumulativeScores(nextScores);

    if (currentIdx < ARCHETYPE_TEST_QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      const bestMatch = ARCHETYPES.reduce((prev, curr) => {
        const prevDiff = Object.keys(nextScores).reduce((acc, key) => {
          const k = key as keyof ArchetypeStats;
          return acc + Math.abs(nextScores[k] - prev.stats[k]);
        }, 0);
        const currDiff = Object.keys(nextScores).reduce((acc, key) => {
          const k = key as keyof ArchetypeStats;
          return acc + Math.abs(nextScores[k] - curr.stats[k]);
        }, 0);
        return currDiff < prevDiff ? curr : prev;
      });

      onComplete(nextScores, bestMatch.id);
    }
  };

  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[70] flex flex-col items-center justify-center text-white px-6 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500 blur-[120px] rounded-full animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 max-w-sm w-full space-y-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="relative inline-block">
            <div className="w-32 h-32 bg-slate-800 rounded-[2.5rem] flex items-center justify-center shadow-2xl border-2 border-slate-700 mx-auto">
              <Fingerprint size={64} className="text-emerald-400 animate-pulse" />
            </div>
            <div className="absolute -top-4 -right-4 bg-emerald-500 p-3 rounded-2xl shadow-lg animate-bounce">
              <Sparkles size={20} className="text-white" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-fredoka font-bold leading-tight">
              Decoding Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">Financial DNA</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Hoo-hoo! Everyone builds wealth differently. I need to understand your risk appetite and market instincts to customize your journey.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { icon: <Brain size={18} />, label: 'Mindset' },
              { icon: <Zap size={18} />, label: 'Risk' },
              { icon: <Rocket size={18} />, label: 'Goals' }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                  <span className="text-emerald-400">{item.icon}</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-6">
            <button 
              onClick={() => setPhase('quiz')}
              className="w-full bg-emerald-500 text-white font-black py-5 rounded-[1.8rem] shadow-[0_8px_0_#059669] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 text-xl"
            >
              START ANALYSIS <ArrowRight strokeWidth={3} />
            </button>
            <button 
              onClick={onSkip}
              className="w-full py-4 text-slate-500 font-bold text-sm hover:text-slate-300 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
            >
              Maybe later <SkipForward size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = ARCHETYPE_TEST_QUESTIONS[currentIdx];
  const progress = ((currentIdx + 1) / ARCHETYPE_TEST_QUESTIONS.length) * 100;

  return (
    <div className="fixed inset-0 bg-slate-900 z-[70] flex flex-col text-white overflow-y-auto">
      <div className="max-w-xl mx-auto w-full px-6 py-12 flex-1 flex flex-col">
        <div className="mb-12">
          <div className="flex items-center justify-end mb-8 h-10">
            {isInitialOnboarding && (
              <button onClick={onSkip} className="text-emerald-400 hover:text-emerald-300 text-sm font-black uppercase tracking-widest flex items-center gap-2">
                Skip Quiz <SkipForward size={16} />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-emerald-400" size={16} />
            <h1 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">
              Financial DNA Analysis
            </h1>
          </div>

          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Question {currentIdx + 1} of {ARCHETYPE_TEST_QUESTIONS.length}</p>
        </div>

        <div className="space-y-10 flex-1">
          <div className="space-y-4">
            <h2 className="text-3xl font-fredoka font-bold leading-tight">
              {currentQuestion.question}
            </h2>
            <p className="text-gray-400 text-sm">Select the option that best describes your outlook.</p>
          </div>

          <div className="space-y-4">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(option.scores)}
                className="w-full p-6 text-left rounded-3xl bg-gray-800/50 border-2 border-gray-700 hover:border-emerald-500 hover:bg-gray-700 transition-all group flex items-center justify-between"
              >
                <span className="text-lg font-bold group-hover:text-emerald-400 transition-colors pr-4">{option.text}</span>
                <ChevronRight className="text-gray-600 group-hover:text-emerald-500 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-12 border-t border-gray-800 flex items-center gap-4 text-gray-500 text-xs">
          <ShieldCheck size={24} className="text-emerald-500 shrink-0" />
          <p>We are analyzing your risk tolerance, time horizon, spending habits, and market awareness to find your ideal financial archetype.</p>
        </div>
      </div>
    </div>
  );
};

export default ArchetypeTest;
