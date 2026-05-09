
import React, { useState } from 'react';
import { Demographics } from '../types';
import { ArrowRight, Sparkles, UserCircle, Briefcase, Target, SkipForward } from 'lucide-react';

interface DemographicsViewProps {
  onComplete: (data: Demographics) => void;
  onSkip: () => void;
}

const DemographicsView: React.FC<DemographicsViewProps> = ({ onComplete, onSkip }) => {
  const [data, setData] = useState<Demographics>({});
  const [step, setStep] = useState(0);

  const questions = [
    {
      key: 'ageRange',
      label: 'What is your age range?',
      icon: <UserCircle className="text-blue-500" />,
      options: ['Under 18', '18-24', '25-34', '35-44', '45-54', '55+']
    },
    {
      key: 'incomeBracket',
      label: 'Annual Household Income',
      icon: <Sparkles className="text-emerald-500" />,
      options: ['Under $50k', '$50k - $100k', '$100k - $200k', '$200k+']
    },
    {
      key: 'employmentStatus',
      label: 'Employment Status',
      icon: <Briefcase className="text-amber-500" />,
      options: ['Full-time', 'Part-time', 'Self-employed', 'Student', 'Other']
    },
    {
      key: 'primaryGoal',
      label: 'Primary Financial Goal',
      icon: <Target className="text-rose-500" />,
      options: ['Retirement', 'Buying a Home', 'Debt Freedom', 'Wealth Building']
    }
  ];

  const handleSelect = (val: string) => {
    const newData = { ...data, [questions[step].key]: val };
    setData(newData);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(newData);
    }
  };

  const handleSkipQuestion = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(data);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-8 shadow-2xl border-2 border-gray-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-emerald-600">
            <Sparkles size={20} />
            <span className="font-fredoka font-bold text-lg">Personalize Accrue</span>
          </div>
          <button onClick={onSkip} className="text-gray-400 hover:text-gray-600 text-xs font-black uppercase tracking-widest flex items-center gap-1">
            Skip All <SkipForward size={14} />
          </button>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
              {questions[step].icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Question {step + 1} of {questions.length}</p>
              <h2 className="text-xl font-fredoka font-bold text-gray-800">{questions[step].label}</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {questions[step].options.map(opt => (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className="w-full text-left p-4 rounded-2xl bg-gray-50 border-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50 transition-all font-bold text-gray-700"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <button 
            onClick={handleSkipQuestion}
            className="flex-1 py-4 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
          >
            Skip this question
          </button>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? 'w-6 bg-emerald-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemographicsView;
