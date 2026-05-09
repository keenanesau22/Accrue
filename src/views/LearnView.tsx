
import React, { useState, useEffect, useRef } from 'react';
import { Lesson } from '../types';
import { BookOpen, CheckCircle, Info, FileText, Sparkles, Loader2, Play, Volume2, ArrowLeft } from 'lucide-react';
import { generateDeepDiveStream, generateTTS, decodeBase64, decodeAudioData } from '../services/geminiService';
import FinnyLoader from '../components/FinnyLoader';

interface LearnViewProps {
  lesson: Lesson;
  onComplete: () => void;
  onClose: () => void;
}

const LearnView: React.FC<LearnViewProps> = ({ lesson, onComplete, onClose }) => {
  const [activeTab, setActiveTab] = useState<'written' | 'video'>('written');
  const [deepDive, setDeepDive] = useState<string>('');
  const [loadingDeepDive, setLoadingDeepDive] = useState(true);
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<'loading' | 'ready' | 'missing'>('missing');

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Instant Play: Fetch from High-Capacity Vault (IndexedDB)
  useEffect(() => {
    setVideoStatus('missing');
  }, [lesson.id]);

  useEffect(() => {
    const fetchContent = async () => {
      setLoadingDeepDive(true);
      setDeepDive(''); 
      await generateDeepDiveStream(lesson.title, lesson.difficulty, (text) => {
        setDeepDive(text);
        setLoadingDeepDive(false);
      });
    };
    fetchContent();
    
    return () => {
      if (audioSourceRef.current) { audioSourceRef.current.stop(); }
    };
  }, [lesson]);

  const handlePlayTTS = async () => {
    if (isPlayingAudio) { audioSourceRef.current?.stop(); setIsPlayingAudio(false); return; }
    if (!deepDive) return;
    setIsPlayingAudio(true);
    try {
      const base64Audio = await generateTTS(deepDive);
      if (!base64Audio) throw new Error("No audio");
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => { setIsPlayingAudio(false); audioSourceRef.current = null; };
      audioSourceRef.current = source;
      source.start();
    } catch (err) { setIsPlayingAudio(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-start mb-8">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 font-black text-[10px] uppercase tracking-widest transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Return to Diagnostic Center
        </button>
      </div>

      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
          <Sparkles size={14} className="animate-pulse" /> AI Masterclass Engine
        </div>
        <h1 className="text-5xl font-fredoka font-bold text-slate-900 leading-tight">{lesson.title}</h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">{lesson.description}</p>
      </div>

      <div className="min-h-[500px]">
          <div className="bg-white border border-slate-100 rounded-[3rem] p-10 md:p-16 shadow-sm relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
            {loadingDeepDive ? (
              <FinnyLoader message="Curating Masterclass..." size="lg" />
            ) : (
              <div className="w-full space-y-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4"><div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center"><BookOpen size={24} /></div><h3 className="text-2xl font-fredoka font-bold text-slate-900">Strategic Breakdown</h3></div>
                  <button onClick={handlePlayTTS} disabled={loadingDeepDive || !deepDive} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs transition-all ${isPlayingAudio ? 'bg-emerald-500 text-white shadow-lg animate-pulse' : 'bg-slate-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100'}`}>{isPlayingAudio ? 'Stop Listening' : <><Volume2 size={18} /> Listen Aloud</>}</button>
                </div>
                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-sans text-lg"><div className="whitespace-pre-wrap">{deepDive}</div></div>
              </div>
            )}
          </div>
      </div>

      <div className="pt-16 flex flex-col items-center gap-8">
        <button onClick={onComplete} className="w-full max-w-md bg-emerald-600 text-white font-black py-6 rounded-3xl shadow-lg hover:bg-emerald-700 transition-all text-xl flex items-center justify-center gap-3">
          CONTINUE TO CHALLENGE <CheckCircle size={20} />
        </button>
        
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-colors"
        >
          I'm not ready, go back to diagnostic center
        </button>

        <div className="flex items-center gap-3 text-slate-400 text-sm font-medium"><Info size={18} /><span>Master this content to earn a badge</span></div>
      </div>
    </div>
  );
};

export default LearnView;
