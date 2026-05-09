import React from 'react';
import SymptomLibrary from '../components/SymptomLibrary';
import { ArrowLeft } from 'lucide-react';
import { ViewType } from '../types';

interface SymptomLibraryViewProps {
  setView: (view: ViewType) => void;
}

const SymptomLibraryView: React.FC<SymptomLibraryViewProps> = ({ setView }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <button 
        onClick={() => setView('dashboard')}
        className="flex items-center gap-2 text-slate-600 font-bold mb-6 hover:text-slate-900"
      >
        <ArrowLeft size={20} /> Back to Dashboard
      </button>
      <SymptomLibrary filter="symptoms" />
    </div>
  );
};

export default SymptomLibraryView;
