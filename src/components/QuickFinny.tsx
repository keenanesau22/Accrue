
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Loader2, Sparkles, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { UserStats, NetWorthData } from '../types';
import { ARCHETYPES, UNITS } from '../constants';

interface QuickFinnyProps {
  user: UserStats;
  netWorth: NetWorthData;
  onIncrementUsage: () => void;
}

const QuickFinny: React.FC<QuickFinnyProps> = ({ user, netWorth, onIncrementUsage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Limits removed for global unlimited access
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [response, isTyping]);

  const handleAsk = async () => {
    if (!input.trim() || isTyping) return;

    const query = input.trim();
    setInput('');
    setIsTyping(true);
    setResponse('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentArchetype = ARCHETYPES.find(a => a.id === user.archetypeId);
      
      const assets = netWorth.accounts.filter(a => a.type === 'asset');
      const cashAssets = assets.filter(a => a.category === 'cash');
      const totalCash = cashAssets.reduce((sum, a) => sum + a.balance, 0);
      
      const liabilities = netWorth.accounts.filter(a => a.type === 'liability').reduce((sum, a) => sum + a.balance, 0);
      const netWorthVal = assets.reduce((sum, a) => sum + a.balance, 0) - liabilities;

      const activeAlerts = user.notifications.filter(n => !n.isRead).map(n => n.title).join(', ');

      const masteredLessonTitles = user.completedLessonIds.map(id => {
        for (const unit of UNITS) {
          const lesson = unit.lessons.find(l => l.id === id);
          if (lesson) return lesson.title;
        }
        return null;
      }).filter(Boolean);

      const systemInstruction = `You are Finny, a Senior Financial Advisor with 20 years of experience.
      This is a "Quick Ask" context. Answer briefly (1-3 sentences maximum) but with professional authority.
      User: ${user.username}, Archetype: ${currentArchetype?.name || 'Explorer'}.
      
      USER CONTEXT:
      - Net Worth: $${netWorthVal} (Cash: $${totalCash})
      - Lessons Mastered: ${masteredLessonTitles.slice(0, 5).join(', ') || 'None yet'}
      - Active Smart Alerts: ${activeAlerts || 'None unread.'}
      
      HANDLING AMBIGUITY:
      - If user asks "Can I afford this?", ALWAYS ask for the price if not provided.
      - Discretionary Spending Budget is 10% of their cash ($${totalCash * 0.1}).
      - Compare known prices against this budget.
      - Refer to active alerts (like duplicate charges or high interest leaks) if relevant to the user query.
      - Be encouraging, professional, and data-driven.
      - Never name specific stock tickers; focus on strategic principles.`;

      const stream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { systemInstruction, temperature: 0.7 }
      });

      let fullText = '';
      for await (const chunk of stream) {
        if (chunk.text) {
          fullText += chunk.text;
          setResponse(fullText);
          setIsTyping(false);
        }
      }
      onIncrementUsage();
    } catch (err) {
      setResponse("Hoo! A market storm! I can't think clearly right now.");
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-6 z-[110] flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-72 sm:w-80 bg-white rounded-[2rem] border-2 border-emerald-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-emerald-800 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-xl">🦉</div>
              <span className="font-fredoka font-bold">Ask Your Advisor</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-black/10 p-1 rounded-lg">
              <X size={18} />
            </button>
          </div>
          
          <div ref={scrollRef} className="p-4 max-h-60 overflow-y-auto bg-gray-50/50 space-y-3 no-scrollbar">
            {response ? (
              <div className="bg-white border border-emerald-100 p-3 rounded-2xl text-sm text-gray-700 shadow-sm leading-relaxed text-black font-medium">
                {response}
              </div>
            ) : !isTyping && (
              <p className="text-gray-400 text-xs text-center italic py-2">Consult your advisor...</p>
            )}
            {isTyping && (
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-[10px] uppercase tracking-widest">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce"></div>
                </div>
                Thinking...
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-100 flex flex-col gap-1 bg-white">
            <div className="flex gap-2">
              <input 
                autoFocus
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="Type a question..."
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 text-black font-medium"
              />
              <button 
                onClick={handleAsk}
                disabled={!input.trim() || isTyping}
                className="bg-emerald-800 text-white p-2 rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all disabled:bg-gray-200"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="absolute -top-2 -left-2 bg-white rounded-full p-1 shadow-md border border-emerald-100 text-emerald-800 z-10"
        >
          {isMinimized ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`group bg-emerald-800 text-white rounded-2xl shadow-xl shadow-emerald-200 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all border-4 border-white ${
            isMinimized ? 'p-2' : 'px-4 py-2'
          }`}
        >
          {!isMinimized && (
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-80 leading-none mb-0.5">Finny</span>
              <span className="text-[10px] font-bold leading-none">Consult</span>
            </div>
          )}
          <div className={`bg-white/20 rounded-xl flex items-center justify-center text-xl relative ${isMinimized ? 'w-8 h-8' : 'w-8 h-8'}`}>
            🦉
          </div>
        </button>
      </div>
    </div>
  );
};

export default QuickFinny;
