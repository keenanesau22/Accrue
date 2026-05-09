
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ShieldAlert, Database, 
  Settings, Zap, BarChart3, AlertCircle, RefreshCw, Activity,
  Users, TrendingUp, Cloud, Globe, Cpu, Clock, Server, ArrowUpRight, PlusCircle, BookOpen,
  CheckCircle2, XCircle, UploadCloud
} from 'lucide-react';
import { ARCHETYPES, UNITS } from '../constants';
import { startVideoGeneration, getVideosOperation } from '../services/geminiService';
import LibraryModal from '../components/LibraryModal';
import { generateMockData } from '../services/mockDataService';
import { supabase } from '../lib/supabase';

export const AdminView: React.FC = () => {
  const [provisioningStatus, setProvisioningStatus] = useState<'idle' | 'running' | 'complete'>('idle');
  const [currentLessonProvisioning, setCurrentLessonProvisioning] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [accountCount, setAccountCount] = useState(5);
  
  // Silo Management State
  const [isDragging, setIsDragging] = useState(false);
  const connections = [
    { id: 'plaid', name: 'Plaid', status: 'connected' as const },
    { id: 'supabase', name: 'Supabase', status: 'connected' as const },
    { id: 'firebase', name: 'Firebase', status: 'disconnected' as const },
    { id: 'stripe', name: 'Stripe', status: 'connected' as const },
  ];

  const deleteTableData = async (tableName: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select('id');
      
      if (fetchError) throw fetchError;
      
      if (data && data.length > 0) {
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .in('id', data.map(d => d.id));
        if (deleteError) throw deleteError;
      }
      console.log(`Deleted table: ${tableName}`);
    } catch (err) {
      console.error(`Error deleting table ${tableName}:`, err);
    }
  };

  const performSystemCleanup = async () => {
    if (window.confirm("Are you sure you want to delete all tools, lessons, and symptoms from Supabase? This action is irreversible.")) {
      await deleteTableData('tools');
      await deleteTableData('lessons');
      await deleteTableData('symptoms');
      await deleteTableData('quizzes');
      alert("Cleanup complete.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-rose-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full inline-block mb-4 shadow-lg animate-pulse">
        Developer Mode: Admin Access Forced
      </div>

      <LibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 dark:bg-gray-950 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12"><Database size={160} /></div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center border-2 border-emerald-500/40 shadow-xl shadow-emerald-500/10">
            <ShieldAlert size={32} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-fredoka font-bold">Admin Console</h1>
            <p className="text-slate-400 mt-1 font-medium text-sm md:text-base">System-wide forensic intelligence & provisioning.</p>
          </div>
        </div>
        
        {/* Tab Switcher */}
        <div className="relative z-10 flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full md:w-auto">
          <div className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white flex items-center justify-center gap-2">
            <Activity size={14} /> Platform Pulse
          </div>
        </div>
      </div>

      {/* Silo Management */}
      <section className="space-y-6">
        <h2 className="text-2xl font-fredoka font-bold text-slate-900 dark:text-white">Silo Management</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {connections.map(conn => (
            <div key={conn.id} className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-white/20 dark:border-gray-700/50 p-6 rounded-3xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-slate-600 dark:text-gray-300">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{conn.name}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-400">
                    {conn.status === 'connected' ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-rose-500" />}
                    {conn.status}
                  </div>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300">
                <Settings size={18} />
              </button>
            </div>
          ))}
        </div>

        <div 
          className={`border-4 border-dashed rounded-3xl p-12 text-center transition-all ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); alert('File dropped!'); }}
        >
          <UploadCloud size={48} className="mx-auto text-slate-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-fredoka font-bold text-slate-900 dark:text-white">Smart Folders Upload</h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">Drag and drop files here to ingest into the forensic vault.</p>
        </div>
      </section>

      {/* Existing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 animate-in zoom-in-95 duration-300">
          
          {/* User Signups Card */}
          <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border-2 border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 text-emerald-500/5 group-hover:scale-110 transition-transform"><Users size={80} /></div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total Active Users</p>
                <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full flex items-center gap-1"><ArrowUpRight size={10} /> +12%</span>
              </div>
              <div className="text-5xl font-fredoka font-black text-slate-900 dark:text-white">4,821</div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 bg-slate-200 dark:bg-gray-600 flex items-center justify-center text-[8px] font-bold">👤</div>)}
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">Joined in last 24h</p>
              </div>
            </div>
          </div>

          {/* Revenue / Pro Subs Card */}
          <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border-2 border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 text-indigo-500/5 group-hover:scale-110 transition-transform"><TrendingUp size={80} /></div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Pro Memberships</p>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full flex items-center gap-1"><ArrowUpRight size={10} /> +5.2%</span>
              </div>
              <div className="text-5xl font-fredoka font-black text-slate-900 dark:text-white">1,240</div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: '26%' }}></div>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">26% conversion rate</p>
            </div>
          </div>

          {/* Daily Active Learners Card */}
          <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border-2 border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 text-amber-500/5 group-hover:scale-110 transition-transform"><Cpu size={80} /></div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Daily Active Learners</p>
                <button 
                  className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                >
                  <PlusCircle size={10} /> Add Test Symptoms
                </button>
              </div>
              <div className="text-5xl font-fredoka font-black text-slate-900 dark:text-white">2,108</div>
              <div className="grid grid-cols-4 gap-1 items-end h-8">
                 {[40, 70, 45, 90, 60, 80, 50, 95].map((h, i) => <div key={i} className="bg-amber-400 rounded-sm w-full" style={{ height: `${h}%` }}></div>)}
              </div>
            </div>
          </div>

          {/* Library Management Card */}
          <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border-2 border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 text-indigo-500/5 group-hover:scale-110 transition-transform"><BookOpen size={80} /></div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Library Management</p>
              </div>
              <div className="text-2xl font-fredoka font-black text-slate-900 dark:text-white">Content Library</div>
              <button 
                className="w-full text-xs font-black text-white bg-indigo-600 px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700"
                onClick={() => setIsLibraryOpen(true)}
              >
                <BookOpen size={14} /> View Library
              </button>
            </div>
          </div>

          {/* Mock Data Generator Card */}
          <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border-2 border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 text-emerald-500/5 group-hover:scale-110 transition-transform"><Database size={80} /></div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Mock Data</p>
              </div>
              <div className="text-2xl font-fredoka font-black text-slate-900 dark:text-white">Data Generator</div>
              <input 
                id="mock-data-account-count"
                name="account-count"
                aria-label="Number of accounts to generate"
                type="number" 
                value={accountCount} 
                onChange={(e) => setAccountCount(parseInt(e.target.value))}
                className="w-full p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Number of accounts"
              />
              <button 
                className="w-full text-xs font-black text-white bg-emerald-600 px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700"
                onClick={async () => {
                  const user = await import('../services/supabaseService').then(m => m.getUser());
                  if (user) {
                    await generateMockData(user.id, accountCount);
                    alert(`Generated ${accountCount} accounts.`);
                  }
                }}
              >
                <Database size={14} /> Generate Data
              </button>
              <button 
                className="w-full text-xs font-black text-white bg-blue-600 px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700"
                onClick={async () => {
                   const { SYMPTOM_LIBRARY, updateSymptomProgress } = await import('../lib/symptomLibrary');
                   SYMPTOM_LIBRARY.forEach(s => {
                     const increment = (Math.random() * 0.05 + 0.05) * s.remissionCriteria.targetValue;
                     updateSymptomProgress(s.id, increment);
                   });
                   alert("Simulated progress for all active symptoms.");
                }}
              >
                <Activity size={14} /> Simulate Progress
              </button>
            </div>
          </div>

          {/* System Health Module */}
          <div className="lg:col-span-12 bg-slate-900 dark:bg-gray-950 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Globe size={150} /></div>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 relative z-10">
               <div className="space-y-1">
                  <h3 className="text-2xl font-fredoka font-bold flex items-center gap-3">
                    <Server className="text-emerald-400" /> Infrastructure Pulse
                  </h3>
                  <p className="text-slate-400 text-sm font-medium">Real-time monitoring of global forensic nodes.</p>
               </div>
               <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Operational Status: All Systems Go</span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
               <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Cloud size={18} />
                    <p className="text-[8px] font-black uppercase tracking-widest">Cloud Uptime</p>
                  </div>
                  <div className="text-3xl font-black text-white">99.98%</div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: '99.9%' }}></div>
                  </div>
               </div>

               <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Clock size={18} />
                    <p className="text-[8px] font-black uppercase tracking-widest">DB Latency</p>
                  </div>
                  <div className="text-3xl font-black text-white">42ms</div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: '42%' }}></div>
                  </div>
               </div>

               <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Zap size={18} />
                    <p className="text-[8px] font-black uppercase tracking-widest">AI Inference</p>
                  </div>
                  <div className="text-3xl font-black text-white">1.2s</div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: '65%' }}></div>
                  </div>
               </div>

               <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 text-slate-400">
                    <RefreshCw size={18} />
                    <p className="text-[8px] font-black uppercase tracking-widest">Vault Capacity</p>
                  </div>
                  <div className="text-3xl font-black text-white">12.4TB</div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: '78%' }}></div>
                  </div>
               </div>
            </div>
          </div>
      </div>
    </div>
  );
};

// export default AdminDashboard;
