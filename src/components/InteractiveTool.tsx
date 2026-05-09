import React, { useState } from 'react';
import { Template, NetWorthData, ToolArchetype } from '../types';
import { Zap, Play, Search, TrendingUp, ShieldAlert, MousePointer2, Info, HelpCircle, Sparkles } from 'lucide-react';

const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

export const InteractiveTool: React.FC<{ template: Template, netWorth: NetWorthData }> = ({ template, netWorth }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [sliderVal, setSliderVal] = useState(50);
  const [toggle, setToggle] = useState(false);

  const assets = netWorth.accounts.filter(a => a.type === 'asset');
  const liabilities = netWorth.accounts.filter(a => a.type === 'liability');
  const totalAssets = Math.max(5000, assets.reduce((sum, a) => sum + a.balance, 0)); 
  const totalLiabilities = Math.max(1000, liabilities.reduce((sum, a) => sum + a.balance, 0));
  
  const isSimulated = assets.length === 0 && liabilities.length === 0;

  const getToolMetadata = (type: ToolArchetype) => {
    switch(type) {
      case 'allocator': return {
        how: "Drag the slider to change how your money is divided. Sliding right focuses on growth, while sliding left focuses on safety.",
        insight: "This tool shows you how a small change in where you put your money can lead to much bigger savings or more security over time."
      };
      case 'accelerator': return {
        how: "Turn on the 'Apply Boost' button to see what happens if you add a little extra money each month.",
        insight: "This calculates your 'speed to freedom.' It shows you exactly how many months faster you finish paying debt or reaching a goal."
      };
      case 'leak-finder': return {
        how: "Tap the 'Deep Scan' button to let Finny look through your accounts for hidden costs.",
        insight: "This finds 'leaks' like high interest rates or hidden fees that are slowly taking money away from your future self."
      };
      case 'projector': return {
        how: "Use the slider to set a target profit percentage. We'll show you the 10-year result.",
        insight: "This uses the 'Rule of Compounding' to predict how much your current money will be worth in a decade if it keeps growing."
      };
      case 'stress-test': return {
        how: "Slide the 'Disaster Level' to see what happens if the stock market goes down or you lose your job.",
        insight: "This tells you your 'Survival Runway'—the amount of time your current cash will last if everything goes wrong."
      };
      case 'fee-hunter': return {
        how: "Adjust the percentage to see the cost of the management fees you might be paying on your investments.",
        insight: "Fees are the 'silent killers' of wealth. This shows you the thousands of dollars you could lose over 30 years to tiny fees."
      };
      default: return { how: "Follow the on-screen controls to interact.", insight: "This helps you apply what you learned to your real money." };
    }
  };

  const metadata = getToolMetadata(template.toolType);

  const renderToolLogic = () => {
    switch(template.toolType) {
      case 'allocator':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-end"><p className="text-xs font-bold text-gray-500">Allocation Bias</p><p className="text-2xl font-black text-emerald-600">{sliderVal}% Growth</p></div>
            <input type="range" min="0" max="100" value={sliderVal} onChange={e => setSliderVal(Number(e.target.value))} className="w-full h-2 bg-emerald-100 rounded-full appearance-none accent-emerald-600 cursor-pointer" />
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100"><p className="text-[8px] font-black text-gray-400 uppercase mb-1">Stability Bucket</p><p className="font-black text-gray-800">{formatCurrency(totalAssets * ((100 - sliderVal) / 100))}</p></div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100"><p className="text-[8px] font-black text-gray-400 uppercase mb-1">Opportunity Bucket</p><p className="font-black text-emerald-600">{formatCurrency(totalAssets * (sliderVal / 100))}</p></div>
            </div>
          </div>
        );
      case 'accelerator':
        const monthsSaved = toggle ? Math.floor(sliderVal / 4) : 0;
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
               <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Progress</p><p className="text-xl font-black text-blue-600">Level 1 Velocity</p></div>
               <button onClick={() => setToggle(!toggle)} className={`px-4 py-3 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${toggle ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border-2 border-gray-100 text-gray-400'}`}>
                {toggle ? <Zap size={14} fill="currentColor" /> : <Play size={14} />} {toggle ? 'Active' : 'Apply Boost'}
               </button>
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-black text-gray-400 uppercase">Extra Contribution Amount</label>
              <input type="range" min="100" max="2000" step="50" value={sliderVal * 20} onChange={e => setSliderVal(Number(e.target.value) / 20)} className="w-full h-2 bg-blue-100 rounded-full appearance-none accent-blue-600 cursor-pointer" />
            </div>
            {toggle && (
              <div className="p-6 bg-blue-50 border-2 border-blue-100 rounded-3xl animate-in zoom-in-95 text-center">
                <p className="text-xs text-blue-800 font-bold uppercase tracking-widest mb-1">Time Horizon Shift</p>
                <div className="text-3xl font-black text-blue-600">-{monthsSaved} Months</div>
                <p className="text-[10px] text-blue-500 font-medium mt-1 italic">Faster to your {template.category} goal.</p>
              </div>
            )}
          </div>
        );
      case 'leak-finder':
        return (
          <div className="text-center py-4 space-y-8">
            <div className="relative w-28 h-28 mx-auto">
               <div className={`absolute inset-0 rounded-full border-4 border-amber-500/20 ${toggle ? 'animate-ping' : ''}`}></div>
               <div className="relative w-28 h-28 bg-white border-4 border-amber-500 rounded-full flex items-center justify-center shadow-xl">
                 <Search className={`text-amber-500 transition-transform duration-1000 ${toggle ? 'scale-125' : ''}`} size={40} />
               </div>
            </div>
            <div className="space-y-2">
              <h5 className="font-black text-amber-600 text-[10px] uppercase tracking-[0.2em]">Forensic Logic Output</h5>
              <div className="text-3xl font-black text-gray-800">{toggle ? 'Audit Found Friction' : 'Awaiting Registry Scan'}</div>
              {toggle && <p className="text-xs text-gray-500 px-8 leading-relaxed">Detected <span className="text-amber-600 font-bold">4.8% APR inefficiencies</span>. By optimizing this {template.name}, you reclaim {formatCurrency(totalAssets * 0.048 / 12)} per month.</p>}
            </div>
            <button onClick={() => setToggle(!toggle)} className={`w-full font-black py-5 rounded-[2rem] shadow-xl uppercase text-xs tracking-widest transition-all ${toggle ? 'bg-amber-100 text-amber-600 border-2 border-amber-200' : 'bg-amber-500 text-white hover:bg-amber-600 active:translate-y-1'}`}>
              {toggle ? 'RESET AUDIT' : 'DEEP SCAN REGISTRY'}
            </button>
          </div>
        );
      case 'projector':
        const futureVal = totalAssets * Math.pow(1 + (sliderVal / 1000), 120);
        return (
          <div className="space-y-8">
            <div className="flex justify-between items-end"><p className="text-xs font-bold text-gray-500">Expected Yield</p><p className="text-2xl font-black text-indigo-600">{(sliderVal/10).toFixed(1)}% /yr</p></div>
            <input type="range" min="10" max="150" value={sliderVal} onChange={e => setSliderVal(Number(e.target.value))} className="w-full h-2 bg-indigo-100 rounded-full appearance-none accent-indigo-600 cursor-pointer" />
            <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white text-center shadow-2xl relative overflow-hidden border-4 border-indigo-500/20">
               <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><TrendingUp size={100} /></div>
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">10-Year Master Projection</p>
               <div className="text-5xl font-black mb-2">{formatCurrency(futureVal)}</div>
               <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-40 mx-auto">
                  <div className="h-full bg-indigo-500" style={{ width: '70%' }}></div>
               </div>
            </div>
          </div>
        );
      case 'stress-test':
        const loss = totalAssets * (sliderVal / 100);
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-end"><p className="text-xs font-bold text-gray-500">Market Drawdown Severity</p><p className="text-3xl font-black text-rose-500">-{sliderVal}%</p></div>
            <input type="range" min="5" max="60" value={sliderVal} onChange={e => setSliderVal(Number(e.target.value))} className="w-full h-2 bg-rose-100 rounded-full appearance-none accent-rose-500 cursor-pointer" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-rose-50 p-6 rounded-3xl border-2 border-rose-100 flex flex-col items-center">
                <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Simulated Impact</p>
                <div className="text-xl font-black text-rose-600">-{formatCurrency(loss)}</div>
              </div>
              <div className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-100 flex flex-col items-center">
                <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Liquid Safety Floor</p>
                <div className="text-xl font-black text-emerald-600">{formatCurrency(totalAssets - loss)}</div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 italic text-center px-4">"Stress Testing ensures your {template.category} plan survives black swan events."</p>
          </div>
        );
      case 'fee-hunter':
        const costOfFee = totalAssets * (sliderVal / 100) * 30; // Rough 30 year impact
        return (
          <div className="space-y-6">
             <div className="p-8 bg-emerald-900 rounded-[3rem] text-white relative overflow-hidden shadow-2xl border-4 border-emerald-500/30">
                <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><ShieldAlert size={120}/></div>
                <div className="flex justify-between items-center mb-6">
                  <h5 className="font-black text-emerald-400 text-[10px] uppercase tracking-widest">Management Expense Ratio</h5>
                  <div className="px-4 py-1.5 bg-white/10 rounded-xl font-black text-lg">{(sliderVal/100).toFixed(2)}%</div>
                </div>
                <input type="range" min="5" max="300" value={sliderVal} onChange={e => setSliderVal(Number(e.target.value))} className="w-full h-1.5 bg-white/20 rounded-full appearance-none accent-white cursor-pointer mb-10" />
                <div className="space-y-1 text-center">
                   <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">30-Year Wealth Erosion</p>
                   <div className="text-4xl font-black">{formatCurrency(costOfFee)}</div>
                   <p className="text-[8px] text-emerald-500 uppercase mt-4 font-black">Reclaim this by following {template.name} principles.</p>
                </div>
             </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isSimulated && (
        <div className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold border border-emerald-100">
          <Sparkles size={16} /> <span>Empty Registry! Using simulated high-fidelity data.</span>
        </div>
      )}

      {/* HEADER WITH INFO ICON */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <h4 className="font-fredoka font-bold text-xl text-gray-800">Interactive Engine</h4>
        <button 
          onClick={() => setShowInfo(!showInfo)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showInfo ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
        >
          <Info size={24} />
        </button>
      </div>

      {/* INFO PANEL */}
      {showInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-300">
           <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-6 rounded-[2rem] space-y-3">
              <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest"><MousePointer2 size={14}/> How to Use</div>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">{metadata.how}</p>
           </div>
           <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest"><HelpCircle size={14}/> What this tells you</div>
              <p className="text-xs text-emerald-700 leading-relaxed font-medium">{metadata.insight}</p>
           </div>
        </div>
      )}

      {/* DYNAMIC TOOL UI */}
      <div className="bg-white border-2 border-gray-100 p-8 md:p-10 rounded-[3.5rem] shadow-sm relative overflow-hidden">
         {renderToolLogic()}
      </div>
      
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">Engineered for proficiency: {template.category}</p>
    </div>
  );
};
