
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { LibrarySymptom, SYMPTOM_LIBRARY } from '../lib/symptomLibrary';
import { Symptom, ActiveSymptom, NetWorthData, Lesson, UserStats, ViewType } from '../types';
import { SYMPTOM_DICTIONARY, UNITS, TEMPLATES } from '../constants';
import { AlertCircle, CheckCircle, BookOpen, Play, Activity, TrendingDown, TrendingUp, Calendar, Zap, X, ArrowLeft, Check, Info, AlertTriangle, ArrowRight } from 'lucide-react';
import FinancialVitals from '../components/FinancialVitals';
import FinnyLoader from '../components/FinnyLoader';
import { mockDiagnosticLogs, mockUserData } from '../lib/mockData';

interface DiagnosticCenterViewProps {
  user: UserStats | null;
  netWorth: NetWorthData;
  activeSymptoms: ActiveSymptom[];
  transactions: any[];
  onStartLesson: (lesson: Lesson, mode: 'learn' | 'play') => void;
  completedLessonIds: string[];
  setView: (view: ViewType, toolId?: string, symptomId?: string) => void;
  setPrefilledChat: (message: string | null) => void;
}

export const DiagnosticView: React.FC<DiagnosticCenterViewProps> = ({ user, netWorth, activeSymptoms, transactions, onStartLesson, completedLessonIds, setView, setPrefilledChat }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showAuditSummary, setShowAuditSummary] = useState(false);
  const [showVitals, setShowVitals] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'relieved'>('active');

  // Track claimed rewards to prevent double-counting
  const [claimedRewards, setClaimedRewards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isLoading) {
      const texts = ['Analyzing Silos...', 'Calculating Tax Drag...', 'Finalizing Audit...'];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingText(texts[i % texts.length]);
        i++;
      }, 800);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const auditTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const toastTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (auditTimerRef.current) clearTimeout(auditTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleWeeklyAudit = () => {
    setIsLoading(true);
    setShowAuditSummary(false);
    auditTimerRef.current = setTimeout(() => {
      setIsLoading(false);
      setShowToast(true);
      setToastMessage('Success: Audit Complete');
      setShowAuditSummary(true);
      toastTimerRef.current = setTimeout(() => setShowToast(false), 3000);
    }, 2500);
  };

  const hp = Math.max(0, Math.min(100, 100 - (activeSymptoms.reduce((sum, s) => sum + s.severity, 0) * 5)));
  
  const triggeredSymptoms = SYMPTOM_LIBRARY.filter(s => {
    if (s.id === 'liq-001') return mockUserData.CheckingBalance > 5000 && mockUserData.InterestRate === 0;
    if (s.id === 'debt-001') return mockUserData.CreditCardInterestRate > 15;
    if (s.id === 'risk-001') return mockUserData.EmergencyFundMonths < 1;
    if (s.id === 'tax-001') return mockUserData.UnclaimedDeductions > 0;
    if (s.id === 'growth-001') return mockUserData.InvestmentReturnRate < 3;
    if (s.id === 'life-001') return mockUserData.InactiveSubscriptionsCount > 0;
    return false;
  });

  const allActiveSymptoms = [...activeSymptoms, ...triggeredSymptoms.map(ts => ({
    id: ts.id,
    symptomId: ts.id,
    severity: ts.severity,
    message: ts.description,
    recommendedLesson: ts.lessonTitle,
    timestamp: new Date().getTime()
  }))];

  // Split into active and relieved based on remission criteria
  const activeSymptomsList = allActiveSymptoms
    .filter(as => {
      const libSymptom = SYMPTOM_LIBRARY.find(s => s.id === as.symptomId);
      return libSymptom ? libSymptom.remissionCriteria.currentValue < libSymptom.remissionCriteria.targetValue : true;
    })
    .sort((a, b) => b.severity - a.severity);

  const relievedSymptomsList = allActiveSymptoms
    .filter(as => {
      const libSymptom = SYMPTOM_LIBRARY.find(s => s.id === as.symptomId);
      return libSymptom ? libSymptom.remissionCriteria.currentValue >= libSymptom.remissionCriteria.targetValue : false;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  // Severity Reward System
  useEffect(() => {
    activeSymptomsList.forEach(as => {
      const libSymptom = SYMPTOM_LIBRARY.find(s => s.id === as.symptomId);
      if (libSymptom && libSymptom.remissionCriteria.currentValue >= libSymptom.remissionCriteria.targetValue && !claimedRewards.has(as.id)) {
        // Trigger Reward
        const reward = 10 * as.severity * libSymptom.difficultyMultiplier;
        console.log(`Reward claimed for ${libSymptom.name}: ${reward} HP`);
        
        // Confetti
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        
        // Toast
        setShowToast(true);
        setToastMessage(`${libSymptom.badgeId} Awarded!`);
        toastTimerRef.current = setTimeout(() => setShowToast(false), 3000);
        
        setClaimedRewards(prev => new Set(prev).add(as.id));
      }
    });
  }, [activeSymptomsList, claimedRewards]);

  const calculateEstimatedRecoveryDate = (symptom: ActiveSymptom) => {
    const libSymptom = SYMPTOM_LIBRARY.find(s => s.id === symptom.symptomId);
    if (!libSymptom) return "N/A";
    
    if (libSymptom.resolutionType === 'Instant') return "Immediate upon action";
    
    // Accretive logic
    const progressNeeded = libSymptom.remissionCriteria.targetValue - libSymptom.remissionCriteria.currentValue;
    const progressRate = 0.1; // Mock progress rate per day
    const daysToRecovery = Math.ceil(progressNeeded / progressRate);
    const estimatedDate = new Date(new Date().getTime() + daysToRecovery * 24 * 60 * 60 * 1000);
    
    return estimatedDate.toLocaleDateString();
  };

  const dailyHpChange = -1.2; // Mock
  const projectedRecoveryDate = "March 25, 2026";

  const handleLearn = (symptomId: string) => {
    const selectedSymptom = SYMPTOM_LIBRARY.find(s => s.id === symptomId);
    if (selectedSymptom) {
      setIsLoading(true);
      setLoadingText('Transferring data to Finny...');
      
      // Scroll chat window to top if possible (assuming chat view is rendered)
      const chatContainer = document.querySelector('.no-scrollbar');
      if (chatContainer) {
        chatContainer.scrollTop = 0;
      }

      setTimeout(() => {
        setIsLoading(false);
        // Ensure active symptom is set before navigation
        setView('chat', undefined, symptomId);
      }, 500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
      {showToast && (
        <div className="fixed top-4 right-4 z-[600] bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4">
          <Check size={16} /> {toastMessage}
        </div>
      )}
      {/* ... (rest of the component) */}

      {/* HP Bar & Header */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
          <h1 className="text-2xl md:text-3xl font-fredoka font-bold text-slate-900">Diagnostic Center</h1>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">{hp}/100 HP</p>
            <p className={`text-[10px] font-bold flex items-center gap-1 ${dailyHpChange < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {dailyHpChange < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
              {dailyHpChange}% Daily Change
            </p>
          </div>
        </div>
        <div className="h-5 bg-slate-200 rounded-full overflow-hidden border border-slate-300 shadow-inner p-0.5">
          <motion.div 
            className={`h-full rounded-full transition-all duration-700 ease-out ${hp < 30 ? 'bg-rose-500' : hp < 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ 
              width: `${hp}%`,
              boxShadow: '0 0 10px rgba(0,0,0,0.1)'
            }}
            animate={{ 
              scale: [1, 1.02, 1],
              boxShadow: ['0 0 10px rgba(0,0,0,0.1)', '0 0 20px rgba(255,255,255,0.5)', '0 0 10px rgba(0,0,0,0.1)']
            }}
            transition={{ 
              scale: { repeat: Infinity, duration: 1.5 },
              boxShadow: { repeat: Infinity, duration: 1.5 }
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1"><Activity size={10} /> {activeSymptoms.length} Active Symptoms</span>
          <span className="flex items-center gap-1"><Calendar size={10} /> Projection: {projectedRecoveryDate}</span>
        </div>
      </div>

      <section className="bg-emerald-900 rounded-2xl p-4 md:p-6 text-white shadow-lg relative overflow-hidden mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-800 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-700"><Zap size={20} fill="currentColor" /></div>
            <div><h3 className="text-sm md:text-lg font-fredoka font-bold">Weekly Financial Audit</h3><p className="text-emerald-200/70 text-[10px] font-medium">Finny analyzing shifts in your capital flow.</p></div>
          </div>
          <motion.button 
            onClick={handleWeeklyAudit} 
            disabled={isLoading}
            className="w-full sm:w-auto bg-emerald-600 text-white font-black px-5 py-2 rounded-lg shadow-sm hover:bg-emerald-700 transition-all text-[10px] flex items-center justify-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {loadingText}
              </>
            ) : (
              <>
                <Activity size={12} /> GENERATE AUDIT
              </>
            )}
          </motion.button>
        </div>
      </section>

      {showAuditSummary && (
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm mb-8 animate-in zoom-in-95">
          <h3 className="font-fredoka font-bold text-slate-900 mb-4">Audit Summary</h3>
          <ul className="space-y-2">
            {mockDiagnosticLogs.map(log => (
              <li key={log.id} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle size={16} className="text-emerald-600 mt-0.5" />
                {log.message}
              </li>
            ))}
          </ul>
        </div>
      )}


      {/* Financial Vitals */}
      <div className="lg:hidden mb-8">
        <button 
          onClick={() => setShowVitals(true)}
          className="w-full bg-emerald-800 text-white py-4 rounded-2xl font-bold text-sm shadow-md hover:bg-emerald-900 transition-all flex items-center justify-center gap-2"
        >
          <Activity size={18} />
          View Financial Vitals
        </button>
        {showVitals && (
          <div className="fixed inset-0 z-[500] bg-white p-4 overflow-y-auto">
            <button 
              onClick={() => setShowVitals(false)}
              className="flex items-center gap-2 text-slate-800 font-bold mb-6"
            >
              <ArrowLeft size={20} /> Return to Diagnostic Center
            </button>
            <FinancialVitals transactions={transactions} netWorth={netWorth} />
          </div>
        )}
      </div>
      <div className="hidden lg:block">
        <FinancialVitals transactions={transactions} netWorth={netWorth} />
      </div>

      {/* Symptoms Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
        <button 
          onClick={() => setActiveTab('active')} 
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'active' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Active ({activeSymptomsList.length})
        </button>
        <button 
          onClick={() => setActiveTab('relieved')} 
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'relieved' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Relieved ({relievedSymptomsList.length})
        </button>
      </div>

      {/* Proactive Engagement */}
      {activeSymptoms.length === 0 && activeTab === 'active' && (
        <div className="p-[1px] rounded-3xl bg-gradient-to-r from-emerald-400 to-sky-400 mb-6">
          <div className="bg-white p-6 rounded-[23px] space-y-4">
            <h3 className="font-fredoka font-bold text-slate-900">Optimization Suggestions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['Run Tax Stress Test', 'Rebalance Portfolio', 'Automate Savings'].map(s => (
                <button key={s} className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-bold text-slate-700 hover:bg-emerald-50 transition-colors">{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Symptoms Content */}
      {activeTab === 'active' ? (
        <div className="space-y-3">
          {activeSymptomsList.length === 0 ? (
            <p className="text-slate-500 italic text-center py-8 text-xs">No active symptoms detected. Your financial health is stable.</p>
          ) : (
              activeSymptomsList.map(as => {
                const libSymptom = SYMPTOM_LIBRARY.find(s => s.id === as.symptomId);
                let definition = SYMPTOM_DICTIONARY.find(d => d.id === as.symptomId);
                if (!definition && libSymptom) {
                  definition = {
                    id: libSymptom.id,
                    name: libSymptom.name,
                    severity: Math.min(5, Math.max(1, Math.floor(libSymptom.severity / 2))) as any,
                    description: libSymptom.description,
                    icon: libSymptom.icon,
                    remissionCriteria: libSymptom.remissionCriteria.toString(),
                    category: libSymptom.category,
                    module: 'Budgeting',
                    triggerField: 'unknown',
                    triggerOperator: '>',
                    triggerThreshold: 0,
                    finnyConsultTitle: libSymptom.name,
                    finnyConsultScript: libSymptom.description,
                    prescribedLessonId: 'u1-l1',
                    unlockToolId: 't2',
                    remedyAction: libSymptom.toolName,
                    badgeId: 'default'
                  };
                }
                if (!definition) return null;
                
                const lesson = UNITS.flatMap(u => u.lessons).find(l => l.id === definition.prescribedLessonId);
                const progress = libSymptom ? (libSymptom.remissionCriteria.currentValue / libSymptom.remissionCriteria.targetValue) * 100 || 0 : 0;

                return (
                  <div key={as.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-4 cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-fredoka font-bold text-slate-900">{definition.name}</h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${as.severity >= 4 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-rose-50 text-rose-600'}`}>Severity {as.severity}</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1">
                          <span>Progress to Remission</span>
                          <div className="group relative">
                            <Info size={12} className="text-slate-400 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              Financial Principle: {libSymptom?.remissionCriteria.principleFormula}
                            </div>
                          </div>
                        </div>
                        <span className="text-emerald-600 font-bold">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                       <button onClick={() => handleLearn(as.symptomId)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-xs hover:bg-slate-200 transition-colors">Learn</button>
                       <button 
                         onClick={() => setView('profile-toolbox', definition.unlockToolId)}
                         className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl text-xs hover:bg-emerald-700 transition-colors shadow-sm"
                       >
                         Open Tool
                       </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {relievedSymptomsList.length === 0 ? (
            <p className="text-slate-500 italic text-center py-8 text-xs">No relieved symptoms yet. Keep learning!</p>
          ) : (
            relievedSymptomsList.map(as => {
              const libSymptom = SYMPTOM_LIBRARY.find(s => s.id === as.symptomId);
              const definition = SYMPTOM_DICTIONARY.find(d => d.id === as.symptomId);
              
              if (!libSymptom) return null;

              return (
                <div key={as.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-emerald-600" />
                    <span className="font-bold text-slate-700 text-xs">{definition?.name || libSymptom?.name}</span>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setView('profile-toolbox', definition?.unlockToolId)} className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg text-[10px] hover:bg-emerald-700">
                          Open Tool
                      </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// export default DiagnosticCenterView;
