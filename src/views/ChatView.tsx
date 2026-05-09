
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UserStats, Conversation, Message, NetWorthData, ActiveSymptom, Symptom, CategorizationRule, ViewType } from '../types';
import { useFinancialData } from '../context/FinancialDataContext';
import { Send, User, Sparkles, Loader2, Info, Trash2, MessageCircle, Lightbulb, Plus, History, X, ChevronRight, Volume2, Crown, Lock, ShieldAlert, CheckCircle2, Receipt, ArrowRight, Activity, ShieldCheck, HeartPulse, MessageSquare } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { ARCHETYPES, UNITS, SYMPTOM_DICTIONARY, TEMPLATES } from '../constants';
import { generateTTS, decodeBase64, decodeAudioData, generateCategorizationRule } from '../services/geminiService';
import { supabase } from '../lib/supabase';
import { getUser } from '../services/supabaseService';
import FinnyLoader from '../components/FinnyLoader';
import { SYMPTOM_LIBRARY } from '../lib/symptomLibrary';
import { mockUserData } from '../lib/mockData';

interface ChatViewProps {
  user: UserStats;
  netWorth: NetWorthData;
  activeSymptoms: ActiveSymptom[];
  activeSymptomId: string | null;
  clearActiveSymptomId: () => void;
  rules: CategorizationRule[];
  onUpdateRules: (rules: CategorizationRule[]) => void;
  onIncrementUsage: () => void;
  onStartLesson: (lessonId: string) => void;
  prefilledChat: string | null;
  setPrefilledChat: (message: string | null) => void;
  setView: (view: ViewType, toolId?: string, symptomId?: string) => void;
}

// SymptomSummaryCard Component
const SymptomSummaryCard: React.FC<{ symptomId: string, activeSymptom: ActiveSymptom }> = ({ symptomId, activeSymptom }) => {
  const symptom = SYMPTOM_LIBRARY.find(s => s.id === symptomId);
  if (!symptom) return null;
  
  const currentValue = activeSymptom.detectedAmount ?? 'Calculating...';
  
  return (
    <div className="bg-white border-2 border-emerald-500/20 rounded-2xl p-4 shadow-lg animate-in zoom-in-95 duration-500 flex flex-col gap-2 relative overflow-hidden">
      <div className="flex justify-between items-center">
        <h4 className="font-fredoka font-bold text-sm text-gray-800">{symptom.name}</h4>
        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[10px] font-black uppercase tracking-widest">Severity: {activeSymptom.severity}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>Current: {typeof currentValue === 'number' ? `$${currentValue.toLocaleString()}` : currentValue}</span>
        <span>Target: {symptom.remissionCriteria.targetValue.toLocaleString()}</span>
      </div>
    </div>
  );
};

export const ChatView: React.FC<ChatViewProps> = ({ user, netWorth, activeSymptoms, activeSymptomId, clearActiveSymptomId, rules, onUpdateRules, onIncrementUsage, onStartLesson, prefilledChat, setPrefilledChat, setView }) => {
  const { activeSymptom, linkedAccount } = useFinancialData();
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem(`accrue_chat_v2_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [messages, setMessages] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let connectionTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
        socketRef.current = socket;

        socket.onopen = () => {
          setIsSocketConnected(true);
          setIsOfflineMode(false);
          clearTimeout(connectionTimeout);
        };

        socket.onerror = (error) => {
          console.warn('Finny is currently offline, switching to local mode');
          setIsSocketConnected(false);
        };

        socket.onclose = () => {
          setIsSocketConnected(false);
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        };
      } catch (e) {
        console.warn('Finny is currently offline, switching to local mode');
        setIsSocketConnected(false);
      }
    };

    connect();
    connectionTimeout = setTimeout(() => {
      if (!isSocketConnected) setIsOfflineMode(true);
    }, 3000);

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      clearTimeout(connectionTimeout);
    };
  }, []);

  if (!user) return <div className='p-8'>Finny is ready to help. Please log in.</div>;

  const activeSymptomRef = useRef<string | null>(null);

  useEffect(() => {
    // Prioritize context-aware greeting if activeSymptom and linkedAccount are present
    if (activeSymptom && linkedAccount && conversations.length === 0) {
        const message = `I see your ${activeSymptom.name} is at risk because your ${linkedAccount.name} is at $${linkedAccount.balance.toLocaleString()}, but your target is $${activeSymptom.triggerThreshold}. Let’s fix that.`;
        const alertThread: Conversation = {
            id: 'clinic-intervention-' + Date.now(),
            title: `Treatment: ${activeSymptom.name}`,
            messages: [
              {
                role: 'assistant',
                content: message,
                timestamp: Date.now(),
                metadata: {
                  type: 'treatment_card',
                  lessonId: activeSymptom.prescribedLessonId
                }
              }
            ],
            lastUpdated: Date.now()
          };
          setConversations([alertThread]);
          setActiveThreadId(alertThread.id);
          return;
    }

    if (!activeSymptomId || activeSymptomRef.current === activeSymptomId) return;
    activeSymptomRef.current = activeSymptomId;

    try {
      const symptom = SYMPTOM_LIBRARY.find(s => s.id === activeSymptomId);
      const activeSymptomData = activeSymptoms.find(s => s.symptomId === activeSymptomId);
      if (!symptom || !activeSymptomData) throw new Error("Symptom not found");

      console.log('ChatView mounted with Symptom ID:', activeSymptomId);
      
      // Start a new thread with this message
      const steps = symptom.actionSteps(mockUserData).slice(0, 3);
      
      let explanation = symptom.symptomExplanation || `I've analyzed your ${symptom.name}. Here is a concise plan to help you get back on track.`;
      
      // Replace placeholders
      explanation = explanation
        .replace('{{bankName}}', mockUserData.BankName || 'your bank')
        .replace('{{balance}}', `$${mockUserData.CheckingBalance?.toLocaleString() || '0'}`)
        .replace('{{percentage}}', Math.round((mockUserData.CheckingBalance / (mockUserData.MonthlyExpenses || 1)) * 100).toString())
        .replace('{{apr}}', mockUserData.CreditCardInterestRate?.toString() || '0')
        .replace('{{amount}}', `$${mockUserData.UnclaimedDeductions?.toLocaleString() || '0'}`)
        .replace('{{returnRate}}', mockUserData.InvestmentReturnRate?.toString() || '0')
        .replace('{{count}}', mockUserData.InactiveSubscriptionsCount?.toString() || '0');

      const newThread: Conversation = {
          id: Date.now().toString(),
          title: `Analysis: ${symptom.name}`,
          messages: [{ 
            role: 'assistant', 
            content: `${explanation}\n\nTo get started, try these steps:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`, 
            timestamp: Date.now(),
            metadata: { type: 'symptom_summary_card', symptomId: symptom.id }
          }],
          lastUpdated: Date.now()
      };
      setConversations(prev => [newThread, ...prev]);
      setActiveThreadId(newThread.id);
    } catch (error) {
      console.warn("Error generating forensic steps:", error);
      // Fallback greeting
      const fallbackThread: Conversation = {
          id: Date.now().toString(),
          title: `Advisor Session`,
          messages: [{ role: 'assistant', content: 'Finny is ready to help. How can I assist you with your finances today?', timestamp: Date.now() }],
          lastUpdated: Date.now()
      };
      setConversations(prev => [fallbackThread, ...prev]);
      setActiveThreadId(fallbackThread.id);
    }
    clearActiveSymptomId();
  }, [activeSymptomId, activeSymptom, linkedAccount, activeSymptoms]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const loadTransactions = async () => {
      const user = await getUser();
      if (user) {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('userId', user.id)
          .order('date', { ascending: false })
          .limit(20);
        
        if (error) {
          console.error("Error fetching transactions:", error);
          setRecentTransactions([]);
        } else {
          setRecentTransactions(data || []);
        }
      }
    };
    loadTransactions();
  }, []);

  const activeThread = conversations.find(c => c.id === activeThreadId);

  // Diagnostic state for suggested actions
  const totalSeverity = activeSymptoms.reduce((sum, s) => sum + s.severity, 0);
  const hp = Math.max(0, Math.min(100, 100 - (totalSeverity * 5)));
  const dailyHpChange = -1.2; // Consistent with DiagnosticCenterView

  const suggestedActions = useMemo(() => {
    const actions = [];
    if (dailyHpChange < 0) {
      actions.push({ label: `Explain my ${dailyHpChange}% change`, prompt: `Explain my ${dailyHpChange}% change` });
    }
    if (hp < 100) {
      actions.push({ label: 'How to improve HP?', prompt: 'How can I improve my financial HP?' });
    }
    actions.push({ label: 'Download Audit Summary', prompt: 'Download my audit summary' });
    return actions.slice(0, 3);
  }, [hp, dailyHpChange]);

  useEffect(() => {
    localStorage.setItem(`accrue_chat_v2_${user.id}`, JSON.stringify(conversations));
  }, [conversations, user.id]);

  useEffect(() => {
    if (prefilledChat) {
      setInput(prefilledChat);
      handleSend(prefilledChat);
      setPrefilledChat(null);
    }
  }, [prefilledChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages, isTyping]);

  const handlePlayTTS = async (text: string, msgIndex: number) => {
    if (playingAudioId === msgIndex) return;
    setPlayingAudioId(msgIndex);
    try {
      const base64Audio = await generateTTS(text);
      if (!base64Audio) throw new Error("No audio data");
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setPlayingAudioId(null);
      source.start();
    } catch (err) { setPlayingAudioId(null); }
  };

  const handleSend = async (customMessage?: string) => {
    const textToSend = customMessage || input.trim();
    if (!textToSend || isTyping) return;

    let targetThreadId = activeThreadId;
    if (!targetThreadId) {
      const newThread: Conversation = {
        id: Date.now().toString(),
        title: textToSend.slice(0, 30),
        messages: [],
        lastUpdated: Date.now()
      };
      setConversations(prev => [newThread, ...prev]);
      targetThreadId = newThread.id;
      setActiveThreadId(newThread.id);
    }

    const userMsg: Message = { role: 'user', content: textToSend, timestamp: Date.now() };
    setInput('');
    setConversations(prev => prev.map(c => c.id === targetThreadId ? { ...c, messages: [...c.messages, userMsg], lastUpdated: Date.now() } : c));
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentArchetype = ARCHETYPES.find(a => a.id === user.archetypeId);
      
      const symptomsSummary = activeSymptoms.map(s => {
        const def = SYMPTOM_DICTIONARY.find(d => d.id === s.symptomId);
        return `- ${def?.name || s.symptomId}: ${s.message} (Severity: ${s.severity})`;
      }).join('\n');

      const systemInstruction = `You are Finny, a Senior Financial Advisor. 
      User: ${user.username}, Lvl: ${user.level}, Archetype: ${currentArchetype?.name}.
      
      ACTIVE CLINICAL SYMPTOMS:
      ${symptomsSummary || 'None detected. Registry is healthy.'}

      CORE INSTRUCTION:
      1. If the user mentions a symptom or asks how to fix their finances, suggest the corresponding lesson from their active symptoms.
      2. When recommending a fix, you MUST include the Lesson ID in brackets like this: [u1-l1].
      3. Occasionally, if the user asks a general question, recommend a relevant lesson or tool from the available units if it adds value. Do not do this for every response.
      4. Tone: Professional, Encouraging, Forensic. Use high-end financial terminology correctly.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: textToSend,
        config: { systemInstruction, temperature: 0.7 }
      });

      const responseText = response.text || "Hoo! My mental markets are a bit turbulent.";
      
      // Check for rule creation request
      const rule = await generateCategorizationRule(textToSend);
      if (rule) {
        onUpdateRules([...rules, rule]);
        const ruleMsg: Message = { 
          role: 'assistant', 
          content: `Hoo! I've created a new categorization rule for you: ${rule.description}.`, 
          timestamp: Date.now() 
        };
        setConversations(prev => prev.map(c => c.id === targetThreadId ? { ...c, messages: [...c.messages, ruleMsg], lastUpdated: Date.now() } : c));
      }

      // Look for Lesson ID in brackets to trigger the Treatment Card
      const lessonMatch = responseText.match(/\[([a-zA-Z0-9-]+)\]/);
      const lessonId = lessonMatch ? lessonMatch[1] : undefined;

      const aiMsg: Message = { 
        role: 'assistant', 
        content: responseText.replace(/\[[a-zA-Z0-9-]+\]/g, '').trim(), 
        timestamp: Date.now(),
        metadata: lessonId ? { type: 'treatment_card', lessonId } : undefined
      };

      setConversations(prev => prev.map(c => c.id === targetThreadId ? { ...c, messages: [...c.messages, aiMsg], lastUpdated: Date.now() } : c));
      onIncrementUsage();
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const startNewThread = () => {
    const newThread: Conversation = {
      id: Date.now().toString(),
      title: "Advisor Session",
      messages: [{ role: 'assistant', content: `Hoo! Registry sync confirmed. How can we optimize your capital flow today?`, timestamp: Date.now() }],
      lastUpdated: Date.now()
    };
    setConversations(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
  };

  // Helper to get lesson details for the UI card
  const getLessonDetails = (lid: string) => {
    const allLessons = UNITS.flatMap(u => u.lessons);
    return allLessons.find(l => l.id === lid);
  };

  const [showSidebar, setShowSidebar] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  
  // ... (rest of the component)

  return (
    <div className="flex h-[calc(100vh-130px)] w-full overflow-hidden bg-white relative">
      {/* Sidebar */}
      <aside className={`${showSidebar ? 'flex' : 'hidden'} md:flex absolute md:relative z-50 ${isSidebarExpanded ? 'w-full md:w-64' : 'w-16'} bg-gray-50 border-r border-gray-100 flex-col h-full transition-all duration-300`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          {isSidebarExpanded && <h3 className="font-fredoka font-bold text-gray-800 flex items-center gap-2"><History size={18} className="text-emerald-500" /> Advisor Log</h3>}
          <div className="flex gap-2">
            <button onClick={() => { if (window.innerWidth < 768) setShowSidebar(false); else setIsSidebarExpanded(!isSidebarExpanded); }} className="p-2 text-gray-500">
              {isSidebarExpanded ? <X size={20} /> : <MessageCircle size={20} />}
            </button>
          </div>
        </div>
        
        {isSidebarExpanded && (
          <div className="p-4 space-y-2">
            <button onClick={startNewThread} className="w-full flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors">
              <Plus size={18} /> New Chat
            </button>
            <div className="pt-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Past Conversations</div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
          {conversations.map(c => (
            <div key={c.id} onClick={() => { setActiveThreadId(c.id); if (window.innerWidth < 768) setShowSidebar(false); }} role="button" tabIndex={0} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 group transition-all cursor-pointer ${activeThreadId === c.id ? 'bg-white border border-emerald-100 shadow-sm' : 'hover:bg-white/50 border border-transparent'}`}>
              <MessageCircle size={16} className={activeThreadId === c.id ? 'text-emerald-500' : 'text-gray-300'} />
              {isSidebarExpanded && <span className={`text-xs font-bold truncate ${activeThreadId === c.id ? 'text-emerald-700' : 'text-gray-600'}`}>{c.title}</span>}
              {isSidebarExpanded && <button type="button" onClick={(e) => { e.stopPropagation(); setConversations(p => p.filter(x => x.id !== c.id)); if (activeThreadId === c.id) setActiveThreadId(null); }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-500 ml-auto"><Trash2 size={14}/></button>}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col relative w-full">
        <div className="bg-gradient-to-r from-[#10B981] to-[#059669] text-white px-4 py-2 flex items-center justify-between z-20 shadow-lg">
           <div className="flex items-center gap-2">
             <button onClick={() => setShowSidebar(true)} className="md:hidden p-1 text-white"><MessageCircle size={20} /></button>
             <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg shadow-inner border border-white/20 backdrop-blur-sm">🦉</div>
             <div>
                <h2 className="font-fredoka font-bold text-sm leading-none">Finny</h2>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-80 mt-0.5">Strategic Financial Coach</p>
             </div>
           </div>
           {/* ... (rest of the header) */}

           <div className="flex items-center gap-2">
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-0.5 md:p-10 space-y-0.5 md:space-y-8 no-scrollbar bg-[#FBFCFE]">
          {isOfflineMode && (
            <div className="bg-amber-100 text-amber-800 p-4 rounded-lg mb-4 text-center font-bold">
              Offline Mode: Using local mock responses.
            </div>
          )}
          {activeThread ? (
            activeThread.messages.map((m, i) => {
              const lesson = m.metadata?.lessonId ? getLessonDetails(m.metadata.lessonId) : null;
              
              return (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`flex gap-0.5 md:gap-4 max-w-[98%] md:max-w-[75%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-4 h-4 md:w-10 md:h-10 rounded-md md:rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${m.role === 'user' ? 'bg-indigo-50 border-indigo-100 text-indigo-500' : 'bg-slate-900 border-slate-800 text-emerald-400'}`}>
                      {m.role === 'user' ? (user.username[0]) : '🦉'}
                    </div>
                    <div className="space-y-0.5 md:space-y-4 flex-1">
                      <div className={`p-1 md:p-5 rounded-md md:rounded-3xl text-[8px] md:text-base leading-relaxed shadow-sm font-medium ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'}`}>
                        {m.content}
                      </div>

                      {/* TREATMENT CARD RENDERER */}
                      {m.metadata?.type === 'treatment_card' && lesson && (
                        <div className="bg-white border-2 border-emerald-500/20 rounded-2xl p-4 md:p-8 shadow-lg animate-in zoom-in-95 duration-500 flex flex-col gap-4 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><HeartPulse size={80} className="text-emerald-500" /></div>
                           <div className="flex items-start gap-4 relative z-10">
                              <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl md:text-4xl shrink-0 border border-emerald-100 shadow-sm">
                                {lesson.icon}
                              </div>
                              <div className="space-y-1">
                                 <div className="flex items-center gap-2">
                                    <div className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-black uppercase tracking-widest">Treatment Plan</div>
                                    <div className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-black uppercase tracking-widest">{lesson.difficulty}</div>
                                 </div>
                                 <h4 className="font-fredoka font-bold text-sm md:text-xl text-gray-800">{lesson.title}</h4>
                                 <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-2">{lesson.description}</p>
                              </div>
                           </div>
                           <button 
                            onClick={() => onStartLesson(lesson.id)}
                            className="w-full bg-[#059669] text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-98 transition-all shadow-lg shadow-emerald-500/20 group/btn text-sm"
                           >
                             START TREATMENT <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                           </button>
                        </div>
                      )}

                      {/* SYMPTOM SUMMARY CARD RENDERER */}
                      {m.metadata?.type === 'symptom_summary_card' && m.metadata.symptomId && (
                        (() => {
                          const activeSymptomData = activeSymptoms.find(s => s.symptomId === m.metadata!.symptomId);
                          return activeSymptomData ? <SymptomSummaryCard symptomId={m.metadata!.symptomId} activeSymptom={activeSymptomData} /> : null;
                        })()
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4 py-8">
               <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-emerald-100">🦉</div>
               <div className="space-y-2">
                  <h3 className="text-lg font-fredoka font-bold text-gray-800">Welcome back!</h3>
                  <p className="text-gray-500 text-sm font-medium">Which part of your financial health should we analyze today?</p>
               </div>
               <div className="grid grid-cols-1 gap-2 w-full">
                 {activeSymptoms
                   .sort((a, b) => b.severity - a.severity)
                   .slice(0, 3)
                   .map(s => {
                     const libSymptom = SYMPTOM_LIBRARY.find(ls => ls.id === s.symptomId);
                     return (
                       <button 
                         key={s.symptomId} 
                         onClick={() => {
                           // Start a new thread for the selected symptom
                           const newThread: Conversation = {
                             id: Date.now().toString(),
                             title: `Analysis: ${libSymptom?.name || 'Symptom'}`,
                             messages: [{ 
                               role: 'assistant', 
                               content: `I've pulled up the data for your ${libSymptom?.name || 'symptom'}. Here is what the numbers are telling me...`, 
                               timestamp: Date.now(),
                               metadata: { type: 'symptom_summary_card', symptomId: s.symptomId }
                             }],
                             lastUpdated: Date.now()
                           };
                           setConversations(prev => [newThread, ...prev]);
                           setActiveThreadId(newThread.id);
                         }}
                         className="w-full bg-white border border-emerald-100 p-4 rounded-xl text-left hover:border-emerald-300 transition-all shadow-sm flex items-center justify-between group"
                       >
                         <span className="font-bold text-sm text-gray-700">{libSymptom?.name}</span>
                         <ChevronRight size={16} className="text-emerald-500 group-hover:translate-x-1 transition-transform" />
                       </button>
                     );
                   })}
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-2 md:p-8 bg-white border-t border-gray-100 shrink-0">
          {!isTyping && activeThread && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2 md:mb-4">
              {suggestedActions.map(action => (
                <button key={action.label} onClick={() => handleSend(action.prompt)} className="whitespace-nowrap px-3 py-1.5 md:px-4 md:py-2 bg-gray-50 border border-gray-100 rounded-full text-[10px] md:text-[10px] font-bold text-gray-500 hover:text-emerald-500 hover:border-emerald-200 transition-all uppercase tracking-widest">{action.label}</button>
              ))}
            </div>
          )}
          <div className="max-w-4xl mx-auto relative flex items-center">
             <input id="finny-message-input" name="message" autoComplete="off" aria-label="Chat with Finny" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Consult forensic advisor..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-full px-4 py-3 pr-12 font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm text-sm" />
             <button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className="absolute right-2 bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-50"><Send size={16}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

// export default ChatView;
