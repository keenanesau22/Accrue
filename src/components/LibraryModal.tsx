import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import SymptomLibrary from './SymptomLibrary';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LibraryModal: React.FC<LibraryModalProps> = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState<'symptoms' | 'challenges' | 'tools'>('symptoms');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-fredoka font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="text-emerald-700" size={20} />
            Full Library
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        
        <div className="flex gap-2 mb-6">
          {(['symptoms', 'challenges', 'tools'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <SymptomLibrary filter={filter} />
      </div>
    </div>
  );
};

export default LibraryModal;
