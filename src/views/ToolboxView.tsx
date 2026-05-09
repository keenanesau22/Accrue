import React, { useState, useMemo, useEffect } from 'react';
import { Template, NetWorthData, ViewType } from '../types';
import { TEMPLATES } from '../constants';
import { Briefcase, X, Sparkles, Play, ChevronRight, ShieldCheck, Info, MousePointer2, HelpCircle, Zap, Search, TrendingUp, ShieldAlert } from 'lucide-react';
import { SYMPTOM_LIBRARY } from '../lib/symptomLibrary';

// Assuming InteractiveTool is needed here as well. 
// I will move it here for now.
import { InteractiveTool } from '../components/InteractiveTool';

interface ToolboxViewProps {
  user: any; // Replace with proper user type
  netWorth: NetWorthData;
  selectedToolId?: string | null;
  onClose: () => void;
}

export const ToolboxView: React.FC<ToolboxViewProps> = ({ user, netWorth, selectedToolId, onClose }) => {
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (selectedToolId) {
      const tool = TEMPLATES.find(t => t.id === selectedToolId);
      if (tool) setActiveTemplate(tool);
    }
  }, [selectedToolId]);

  const myTools = useMemo(() => {
    const ownedIds = new Set([
      ...(user.purchasedTemplateIds || []),
      ...(user.unlockedToolIds || [])
    ]);
    return TEMPLATES.filter(t => ownedIds.has(t.id));
  }, [user.purchasedTemplateIds, user.unlockedToolIds]);

  // Logic to separate Active vs Inactive tools
  // Active Tools: Associated with current 'Active Symptoms' where currentValue < targetValue
  // Inactive Tools: All other tools
  const activeSymptoms = user.activeSymptoms || [];
  
  const getSymptomProgress = (toolId: string) => {
    const symptom = activeSymptoms.find((s: any) => s.unlockToolId === toolId);
    if (!symptom) return null;
    const libSymptom = TEMPLATES.find(t => t.id === toolId)?.id ? SYMPTOM_LIBRARY.find(s => s.id === symptom.symptomId) : null;
    if (!libSymptom) return null;
    return (libSymptom.remissionCriteria.currentValue / libSymptom.remissionCriteria.targetValue) * 100;
  };

  const activeTools = myTools.filter(t => {
    const symptom = activeSymptoms.find((s: any) => s.unlock_tool_id === t.id);
    if (!symptom) return false;
    const libSymptom = SYMPTOM_LIBRARY.find(s => s.id === symptom.symptomId);
    return libSymptom && libSymptom.remissionCriteria.currentValue < libSymptom.remissionCriteria.targetValue;
  });

  const inactiveTools = myTools.filter(t => {
    const symptom = activeSymptoms.find((s: any) => s.unlock_tool_id === t.id);
    if (!symptom) return true; // If no symptom, it's inactive
    const libSymptom = SYMPTOM_LIBRARY.find(s => s.id === symptom.symptomId);
    return !libSymptom || libSymptom.remissionCriteria.currentValue >= libSymptom.remissionCriteria.targetValue;
  });

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3.5rem] w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg"><Briefcase size={20} /></div>
             <h3 className="text-2xl font-fredoka font-bold text-gray-800">{activeTemplate ? 'Interactive Strategy' : 'Financial Toolbox'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-8 md:p-12">
           {activeTemplate ? (
             <div className="space-y-8">
                <button onClick={() => setActiveTemplate(null)} className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all mb-4"><ChevronRight className="rotate-180" size={14} /> Back to Toolbox</button>
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-16 h-16 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-4xl shadow-inner border border-gray-100">{activeTemplate.icon}</div>
                   <div>
                      <h4 className="text-xl font-bold text-gray-800 leading-tight">{activeTemplate.name}</h4>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1 mt-1"><Sparkles size={10} /> Live Data Sync Active</p>
                   </div>
                </div>
                <InteractiveTool template={activeTemplate} netWorth={netWorth} />
             </div>
           ) : (
             <div className="space-y-12">
                {/* Active Tools Section */}
                <section>
                    <h4 className="text-sm font-fredoka font-bold text-gray-800 mb-6">Active Tools</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {activeTools.map(tool => {
                          const progress = getSymptomProgress(tool.id);
                          return (
                            <button 
                                key={tool.id} 
                                onClick={() => setActiveTemplate(tool)} 
                                className={`p-8 bg-emerald-50 border-2 ${selectedToolId === tool.id ? 'border-emerald-500 shadow-lg animate-pulse' : 'border-transparent'} hover:shadow-xl transition-all rounded-[2.5rem] text-left group flex items-center gap-6`}
                            >
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">{tool.icon}</div>
                                <div className="flex-1 overflow-hidden">
                                    <h5 className="font-bold text-gray-800 text-lg truncate mb-1">{tool.name}</h5>
                                    <div className="flex items-center justify-between">
                                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><Play size={10} fill="currentColor" /> Launch Simulation</p>
                                      {progress !== null && (
                                        <span className="bg-emerald-200 text-emerald-800 text-[9px] font-bold px-2 py-1 rounded-full">{Math.round(progress)}% to Goal</span>
                                      )}
                                    </div>
                                </div>
                            </button>
                          );
                        })}
                    </div>
                </section>

                {/* Inactive Tools Section */}
                <section>
                    <h4 className="text-sm font-fredoka font-bold text-gray-800 mb-6">Inactive Tools</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {inactiveTools.map(tool => (
                            <button 
                                key={tool.id} 
                                onClick={() => setActiveTemplate(tool)} 
                                className={`p-8 bg-gray-50 border-2 ${selectedToolId === tool.id ? 'border-emerald-500 shadow-lg animate-pulse' : 'border-transparent'} hover:border-emerald-500 hover:bg-white hover:shadow-xl transition-all rounded-[2.5rem] text-left group flex items-center gap-6`}
                            >
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">{tool.icon}</div>
                                <div className="flex-1 overflow-hidden">
                                    <h5 className="font-bold text-gray-800 text-lg truncate mb-1">{tool.name}</h5>
                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><Play size={10} fill="currentColor" /> Launch Simulation</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
             </div>
           )}
        </div>
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
           <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest"><ShieldCheck size={14}/> Verified Forensic Logic</div>
           <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Synced: {new Date(netWorth.lastSynced).toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};
