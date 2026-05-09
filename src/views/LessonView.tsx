
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Lesson, Question } from '../types';
import { X, Check, ArrowRight, TrendingUp, RotateCcw, AlertCircle, Award, Sparkles, Trophy, Star, Heart, Calculator as CalcIcon, Delete, ArrowLeft } from 'lucide-react';
import { generateTTS, decodeBase64, decodeAudioData } from '../services/geminiService';

interface LessonViewProps {
  lesson: Lesson;
  onClose: () => void;
  onFinish: (mastered: boolean, score: number) => void;
  generateQuestions: (topic: string, diff: string) => Promise<Question[]>;
}

const CalculatorOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const handleInput = (val: string) => {
    if (val === 'C') { setDisplay('0'); setEquation(''); return; }
    if (val === '=') {
      try { const result = eval(equation.replace(/[^0-9+\-*/.]/g, '')); setDisplay(String(result)); setEquation(String(result)); }
      catch { setDisplay('Error'); setEquation(''); }
      return;
    }
    const newEquation = equation === '0' ? val : equation + val;
    setEquation(newEquation); setDisplay(newEquation);
  };
  const buttons = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+', 'C'];
  return (
    <div className="fixed bottom-24 right-6 z-[100] w-64 bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-2"><CalcIcon size={16} className="text-emerald-400" /><span className="text-xs font-bold font-fredoka uppercase tracking-widest">Tool: Calculator</span></div>
        <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-lg"><X size={16} /></button>
      </div>
      <div className="p-4 bg-gray-50 border-b border-gray-100"><div className="text-right text-2xl font-black text-slate-800 truncate">{display}</div></div>
      <div className="p-3 grid grid-cols-4 gap-2">
        {buttons.map(btn => (
          <button key={btn} onClick={() => handleInput(btn)} className={`h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all active:scale-95 ${btn === 'C' ? 'col-span-4 bg-rose-50 text-rose-600' : btn === '=' ? 'bg-emerald-500 text-white' : ['/', '*', '-', '+'].includes(btn) ? 'bg-indigo-50 text-indigo-600' : 'bg-white border border-gray-100 text-gray-700'}`}>{btn}</button>
        ))}
      </div>
    </div>
  );
};

const LessonView: React.FC<LessonViewProps> = ({ lesson, onClose, onFinish, generateQuestions }) => {
  const [questionPool, setQuestionPool] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [shuffleTrigger, setShuffleTrigger] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const activeQuestions = useMemo(() => {
    if (questionPool.length === 0) return [];
    const selected: Question[] = [];
    const slots = 6;
    const perSlot = Math.floor(questionPool.length / slots) || 1;
    for (let i = 0; i < slots; i++) {
      const groupStart = i * perSlot;
      const groupEnd = Math.min(groupStart + perSlot, questionPool.length);
      const group = questionPool.slice(groupStart, groupEnd);
      if (group.length > 0) {
        const randomIndex = Math.floor(Math.random() * group.length);
        selected.push(group[randomIndex]);
      }
    }
    return selected;
  }, [questionPool, shuffleTrigger]);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      const pool = await generateQuestions(lesson.title, lesson.difficulty);
      setQuestionPool(pool);
      setLoading(false);
    };
    fetchQuestions();
  }, [lesson]);

  const handleOptionClick = (option: string) => { setSelectedOption(option); };

  const results = userAnswers.map((ans, i) => ans === activeQuestions[i]?.correctAnswer);
  const score = results.filter(r => r).length;
  const isPerfect = score === activeQuestions.length && activeQuestions.length > 0;

  const playSfx = (type: 'success' | 'failure') => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      // Happy Arpeggio: C-E-G-C
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else {
      // Dull Low Chord
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(174.61, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  };

  const handleNext = () => {
    if (!selectedOption) return;
    const newAnswers = [...userAnswers, selectedOption];
    setUserAnswers(newAnswers);
    if (currentIdx < activeQuestions.length - 1) {
      setCurrentIdx(c => c + 1);
      setSelectedOption(null);
    } else {
      setShowSummary(true);
      const perfect = (newAnswers.filter((ans, i) => ans === activeQuestions[i]?.correctAnswer).length === activeQuestions.length);
      playSfx(perfect ? 'success' : 'failure');
    }
  };

  const handleRetry = () => {
    setCurrentIdx(0); setUserAnswers([]); setShowSummary(false); setSelectedOption(null);
    setShuffleTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center gap-4 px-4 py-4 md:px-12 border-b border-gray-50 bg-white sticky top-0 z-20">
          <button onClick={onClose} className="flex items-center gap-2 text-gray-400 hover:text-emerald-600 font-bold text-xs uppercase tracking-widest transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Return to Diagnostic Center
          </button>
        </div>
        <div className="flex flex-col items-center justify-center p-12 text-center min-h-[60vh]">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-8 animate-pulse">
             <span className="text-5xl">🦉</span>
          </div>
          <h2 className="text-2xl font-fredoka font-bold text-gray-800 mb-2">Preparing your challenge...</h2>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 animate-in zoom-in-95 duration-500 overflow-y-auto no-scrollbar h-full relative">
        <div className="text-center mb-12 relative z-10">
          <div className="mb-8 relative inline-block">
            {isPerfect ? (
              <div className="w-48 h-48 bg-gradient-to-br from-yellow-300 via-orange-400 to-yellow-500 rounded-[3rem] flex flex-col items-center justify-center text-7xl shadow-xl border-8 border-white animate-bounce">
                <span>{lesson.icon}</span>
              </div>
            ) : (
              <div className="w-40 h-40 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-7xl mx-auto border-8 border-white shadow-xl">
                <span>{score >= activeQuestions.length * 0.5 ? '🔥' : '💪'}</span>
              </div>
            )}
          </div>
          <h3 className="text-3xl font-fredoka font-bold text-gray-800">
            {isPerfect ? 'Legendary Performance!' : 'So Close to Mastery!'}
          </h3>
          <div className="flex items-center justify-center gap-6 mt-8">
            <div className="text-center"><div className="text-5xl font-black text-emerald-600">{score}</div><div className="text-[10px] font-black text-gray-400 uppercase">Correct</div></div>
            <div className="w-px h-12 bg-gray-100" /><div className="text-center"><div className="text-5xl font-black text-gray-300">/{activeQuestions.length}</div><div className="text-[10px] font-black text-gray-400 uppercase">Total</div></div>
          </div>
        </div>

        <div className="space-y-6 mb-12 relative z-10">
          {activeQuestions.map((q, i) => (
            <div key={q.id + i} className={`p-6 rounded-[2rem] border-2 ${results[i] ? 'bg-emerald-50/20 border-emerald-50' : 'bg-rose-50/20 border-rose-50'}`}>
              <h4 className="font-bold text-gray-800 text-lg mb-3">{q.question}</h4>
              <p className="text-sm text-gray-500">{q.explanation}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 max-w-md mx-auto pb-20 relative z-10">
          <button onClick={() => onFinish(isPerfect, score)} className={`w-full font-black py-6 rounded-[2rem] shadow-2xl transition-all text-xl ${isPerfect ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : 'bg-emerald-500 text-white'}`}>
            {isPerfect ? 'CLAIM MASTERY' : 'DONE FOR NOW'}
          </button>
          {!isPerfect && (
            <button onClick={handleRetry} className="w-full bg-white border-2 border-gray-100 text-indigo-500 font-black py-5 rounded-[2rem] shadow-lg">RETRY NEW CHALLENGE</button>
          )}
        </div>
      </div>
    );
  }

  const progress = activeQuestions.length > 0 ? ((currentIdx) / activeQuestions.length) * 100 : 0;
  const currentQuestion = activeQuestions[currentIdx];

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-4 px-4 py-4 md:px-12 border-b border-gray-50 bg-white sticky top-0 z-20">
        <button onClick={onClose} className="flex items-center gap-2 text-gray-400 hover:text-emerald-600 font-bold text-xs uppercase tracking-widest transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Return to Diagnostic Center
        </button>
        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <button onClick={() => setShowCalculator(!showCalculator)} className={`p-2 rounded-xl ${showCalculator ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}><CalcIcon size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center py-12 px-6">
        <div className="max-w-2xl w-full">
          <h3 className="text-2xl md:text-3xl font-fredoka font-bold text-gray-800 mb-10 text-center leading-tight">{currentQuestion?.question}</h3>
          <div className="w-full space-y-4">
            {currentQuestion?.options?.map((option, i) => (
              <button key={i} onClick={() => handleOptionClick(option)} className={`w-full p-5 text-left rounded-[2rem] border-2 font-bold transition-all flex items-center gap-4 ${selectedOption === option ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-100 text-gray-700 hover:border-emerald-200'}`}>
                <span className={`w-10 h-10 flex items-center justify-center rounded-xl border-2 font-black ${selectedOption === option ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-100 text-gray-300'}`}>{String.fromCharCode(65 + i)}</span>
                <span className="text-lg">{option}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showCalculator && <CalculatorOverlay onClose={() => setShowCalculator(false)} />}

      <div className="mt-auto p-6 md:p-10 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto flex justify-end">
          <button onClick={handleNext} disabled={!selectedOption} className={`w-full sm:w-56 py-4 rounded-2xl font-black text-lg transition-all ${!selectedOption ? 'bg-gray-200 text-gray-400' : 'bg-emerald-500 shadow-[0_6px_0_#059669] text-white'}`}>
            {currentIdx === activeQuestions.length - 1 ? 'FINISH QUIZ' : 'CONTINUE'} <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonView;
