
import React from 'react';
import { X, ShieldAlert, ArrowRight, Activity, ShieldCheck, Sparkles, HeartPulse } from 'lucide-react';
import { Symptom } from '../types';

interface FinnyConsultationModalProps {
  symptom: Symptom;
  isOpen: boolean;
  onClose: () => void;
  onStartLesson: (lessonId: string) => void;
}

const FinnyConsultationModal: React.FC<FinnyConsultationModalProps> = ({ 
  symptom, 
  isOpen, 
  onClose, 
  onStartLesson 
}) => {
  if (!isOpen) return null;

  const isCritical = symptom.severity === 3;
  
  // Split script into paragraphs based on the instruction "Para 1 describes pathogen, Para 2 describes vitamin"
  const paragraphs = symptom.finnyConsultScript.split('\n').filter(p => p.trim() !== '');

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Root Container: Dark Premium Slate with Red/Emerald Glow */}
      <div 
        className={`
          relative w-full max-w-xl bg-slate-950 rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl transition-all duration-500 animate-in zoom-in-95
          border-[3px] ${isCritical ? 'border-rose-500/50 shadow-[0_0_60px_-15px_rgba(244,63,94,0.4)]' : 'border-emerald-500/50 shadow-[0_0_60px_-15px_rgba(16,185,129,0.4)]'}
        `}
      >
        {/* Background Scanline/Grid Effect */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all z-20"
        >
          <X size={24} />
        </button>

        {/* Header Area */}
        <div className="p-8 md:p-12 pb-0 relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-6">
             <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border ${isCritical ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                <ShieldAlert size={12} strokeWidth={3} />
                {isCritical ? 'Critical Forensic Alert' : 'Diagnostic Notification'}
             </div>
          </div>

          <div className="relative mb-8">
            <div className={`
              w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl border-4
              ${isCritical ? 'bg-slate-900 border-rose-500/30 text-rose-500 animate-pulse' : 'bg-slate-900 border-emerald-500/30 text-emerald-500'}
            `}>
              <HeartPulse size={48} strokeWidth={1.5} />
            </div>
            <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-slate-950 flex items-center justify-center text-white ${isCritical ? 'bg-rose-600' : 'bg-emerald-600'}`}>
               <Activity size={14} strokeWidth={3} />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Diagnosis</h4>
            <h2 className={`text-3xl md:text-5xl font-fredoka font-bold leading-tight ${isCritical ? 'text-rose-50' : 'text-emerald-50'}`}>
              {symptom.name}
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 md:p-12 space-y-8 relative z-10">
          <div className="space-y-6">
            {paragraphs.map((para, i) => (
              <div key={i} className="flex gap-5 group">
                <div className="shrink-0 mt-1.5">
                  <div className={`w-2 h-2 rounded-full ${i === 0 ? (isCritical ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-indigo-500'} group-hover:scale-150 transition-transform duration-500`} />
                </div>
                <p className="text-slate-400 text-sm md:text-base leading-relaxed font-medium">
                  {para}
                </p>
              </div>
            ))}
          </div>

          {/* Action Area */}
          <div className="pt-6 flex flex-col gap-4">
            <button 
              onClick={() => onStartLesson(symptom.prescribedLessonId)}
              className={`
                w-full py-6 rounded-[2rem] text-white font-black text-xl flex items-center justify-center gap-3 transition-all shadow-2xl relative group overflow-hidden
                ${isCritical 
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40' 
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'}
              `}
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative flex items-center gap-3">
                REVIEW TREATMENT PLAN <ArrowRight size={24} strokeWidth={3} />
              </span>
            </button>
            
            <button 
              onClick={onClose}
              className="w-full py-2 text-slate-600 font-bold text-[10px] uppercase tracking-[0.3em] hover:text-slate-400 transition-colors"
            >
              Acknowledge & Sync Registry
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-900/50 p-6 border-t border-white/5 flex items-center justify-center gap-2">
          <Sparkles size={14} className="text-indigo-400" />
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Forensic Node: ValidADMT v3.0 // Security Level: High
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinnyConsultationModal;
