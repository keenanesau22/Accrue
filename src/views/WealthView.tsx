import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { NetWorthData, FinancialAccount, Goal, Budget, ViewType } from '../types';
import { useFinancialData } from '../context/FinancialDataContext';
import { MockAccount, MOCK_ACCOUNTS } from '../lib/mockAccounts';
import { 
  TrendingUp, TrendingDown, Sparkles, Loader2, 
  Wallet, Landmark, Building, CreditCard, Trash2, 
  Info, ArrowUpRight, ArrowDownRight, RefreshCw, X, Volume2,
  PieChart, Activity, ShieldCheck, Target, ChevronRight, Zap,
  Home, GraduationCap, Car, ListTodo, Calculator, Timer, Coins, HelpCircle,
  PiggyBank, Receipt, Calendar, Camera, FileText, CheckCircle2, AlertCircle, Percent, DollarSign, CalendarDays, ArrowRight,
  Upload, Link as LinkIcon, Search, Shield, ArrowLeft, BarChart3, Repeat, Eye, BarChart, CalendarRange, Lightbulb, Beaker,
  Bitcoin, Scale, Briefcase, History, Lock, Check, ShieldAlert, User as UserIcon, Tag, Inbox, Gauge
} from 'lucide-react';
import { parseFinancialSnapshot, parseFinancialDocument, generateTTS, decodeBase64, decodeAudioData, generateFinancialAudit } from '../services/geminiService';
import { getUser } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import { PlaidLinker } from '../components/PlaidLinker';
import FinnyLoader from '../components/FinnyLoader';
import TransactionTable from '../components/TransactionTable';
import WealthDashboard from '../components/WealthDashboard';
import TransactionDashboard from '../components/TransactionDashboard';

const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

const getCategoryIcon = (cat: string) => {
  switch(cat) {
    case 'cash': return <Coins size={18} />;
    case 'investment': return <TrendingUp size={18} />;
    case 'mortgage': return <Home size={18} />;
    case 'car-loan': return <Car size={18} />;
    case 'student-loan':
    case 'student': return <GraduationCap size={18} />;
    case 'credit-card':
    case 'credit card':
    case 'credit': return <CreditCard size={18} />;
    case 'debt': return <Receipt size={18} />;
    case 'general-loan': return <Landmark size={18} />;
    case 'crypto': return <Bitcoin size={18} />;
    case 'other-assets': return <Info size={18} />;
    case 'other-liabilities': return <ShieldAlert size={18} />;
    default: return <Wallet size={18} />;
  }
};

interface Transaction {
  id: string;
  plaid_transaction_id: string;
  amount: number;
  date: string;
  category: string;
  merchant_name: string;
  user_id: string;
  plaid_account_id?: string;
  is_interest_payment?: boolean;
  entry_type?: 'income' | 'expense' | 'debt_service' | 'investment';
  category_primary?: string;
  category_detailed?: string;
}

interface WealthViewProps {
  data: NetWorthData;
  onUpdate: (data: NetWorthData) => void;
  onSync: (accessToken: string) => Promise<void>;
  setPrefilledChat: (message: string | null) => void;
  setView: (view: ViewType) => void;
}

export const WealthView: React.FC<WealthViewProps> = ({ data, onUpdate, onSync, setPrefilledChat, setView }) => {
  const { allAccounts, setAllAccounts, isDataLoading, dashboardMetrics, errorStatus } = useFinancialData();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const [isAiSyncing, setIsAiSyncing] = useState(false);
  const [syncText, setSyncText] = useState('');
  const [syncMode, setSyncMode] = useState<'none' | 'vision' | 'narrative' | 'plaid'>('none');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showWealthDashboard, setShowWealthDashboard] = useState(false);
  const [showTransactionDashboard, setShowTransactionDashboard] = useState(false);
  const [pendingAccounts, setPendingAccounts] = useState<FinancialAccount[]>([]);
  const [localRetirementGoal, setLocalRetirementGoal] = useState(data.retirementGoal?.targetAmount || 1000000);
  const [localCurrentAge, setLocalCurrentAge] = useState(data.retirementGoal?.currentAge || 30);
  const [localRetireAge, setLocalRetireAge] = useState(data.retirementGoal?.targetAge || 65);

  // Sync local state when incoming data changes (e.g. initial load)
  useEffect(() => {
    if (data.retirementGoal) {
      setLocalRetirementGoal(data.retirementGoal.targetAmount);
      setLocalCurrentAge(data.retirementGoal.currentAge);
      setLocalRetireAge(data.retirementGoal.targetAge);
    }
  }, [data.retirementGoal?.targetAmount, data.retirementGoal?.currentAge, data.retirementGoal?.targetAge]);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [selectedAccountForInsights, setSelectedAccountForInsights] = useState<FinancialAccount | null>(null);
  const [isMonthly, setIsMonthly] = useState(true);

  // Fetch transactions to determine saving habits
  useEffect(() => {
    const loadTransactions = async () => {
      if (!user) return;
      setIsLoadingTransactions(true);
      try {
        const { data: txData, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        setTransactions(txData || []);
      } catch (err) {
        console.error("Error loading transactions for wealth analysis:", err);
      } finally {
        setIsLoadingTransactions(false);
      }
    };
    loadTransactions();
  }, [user]);

  // Plaid Integration States
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [isPlaidLoading, setIsPlaidLoading] = useState(false);
  const [isPlaidSuccess, setIsPlaidSuccess] = useState(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState('Negotiating Handshake...');

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const [activeFilter, setActiveFilter] = useState<'All Accounts' | 'Assets' | 'Liabilities'>('All Accounts');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleBalanceSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const response = await fetch('/proxy/plaid/balance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-supabase-auth': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({ userId: user.id })
      });
      if (!response.ok) throw new Error('Sync failed');
      const { accounts } = await response.json();
      
      setAllAccounts(accounts.map((acc: any) => ({
        id: acc.id,
        name: acc.account_name,
        balance: acc.balance,
        type: (acc.category === 'debt' || acc.category === 'mortgage' || acc.category === 'car-loan' || acc.category === 'student-loan' || acc.category === 'student' || acc.category === 'credit-card' || acc.category === 'credit card' || acc.category === 'credit' || acc.category === 'loan' || acc.category === 'overdraft' || acc.category === 'line of credit') ? 'liability' : 'asset',
        category: acc.category,
        provider: acc.institution,
        interestRate: acc.interest_rate,
        isLinked: true,
        plaid_account_id: acc.plaid_account_id
      })));
    } catch (err) {
      console.error(err);
      alert('Failed to sync balances.');
    } finally {
      setIsSyncing(false);
    }
  };

  const totals = useMemo(() => {
    const assets = allAccounts.filter(a => a.type === 'asset').reduce((sum, a) => sum + a.balance, 0);
    const liabilities = allAccounts.filter(a => a.type === 'liability').reduce((sum, a) => sum + a.balance, 0);
    const categories = allAccounts.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.balance;
      return acc;
    }, {} as Record<string, number>);
    return { assets, liabilities, net: assets - liabilities, categories };
  }, [allAccounts]);

  const filteredAccounts = useMemo(() => {
    if (activeFilter === 'Assets') return allAccounts.filter(a => a.type === 'asset');
    if (activeFilter === 'Liabilities') return allAccounts.filter(a => a.type === 'liability');
    return allAccounts;
  }, [allAccounts, activeFilter]);

  const txTotals = useMemo(() => {
    const spending = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const income = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
    
    // Retirement Savings: Transfers to investment/crypto accounts or retirement categories
    // We look for transactions where the account matches an investment-type account and amount < 0 (money going in)
    const retireSavings = transactions.filter(t => {
      const targetAcc = allAccounts.find(a => a.plaid_account_id === t.plaid_account_id);
      return targetAcc && targetAcc.type === 'asset' && 
             (targetAcc.category === 'investment' || targetAcc.category === 'crypto') &&
             t.amount < 0; // Negative amount means inflow in Plaid/Supabase schema for our app
    }).reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return { spending, income, net: income - spending, retireSavings };
  }, [transactions, allAccounts]);

  const handlePlayTTS = async (text?: string) => {
    const content = text || (totals.assets > 0 ? `Hoo! Based on your accounts, your net worth is ${formatCurrency(totals.net)}.` : "Hoo-hoo! Let's build your path to financial freedom!");
    if (isPlayingAudio) { audioSourceRef.current?.stop(); setIsPlayingAudio(false); return; }
    setIsPlayingAudio(true);
    try {
      const base64Audio = await generateTTS(content);
      if (!base64Audio) throw new Error("Audio failed");
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlayingAudio(false);
      audioSourceRef.current = source;
      source.start();
    } catch (err) { console.error(err); setIsPlayingAudio(false); }
  };

  const deleteAccount = (id: string) => {
    onUpdate({ ...data, accounts: allAccounts.filter(a => a.id !== id) });
  };

  const confirmPendingAccounts = () => {
    onUpdate({ ...data, accounts: [...data.accounts, ...pendingAccounts], lastSynced: new Date().toISOString() });
    setPendingAccounts([]);
    setShowReviewModal(false);
  };

  const [showInfoModal, setShowInfoModal] = useState(false);

  const weightedReturn = useMemo(() => {
    const totalBalance = allAccounts.reduce((sum, a) => sum + a.balance, 0);
    if (totalBalance === 0) return 0.05; // Default 5% if no accounts
    const weightedSum = allAccounts.reduce((sum, a) => sum + (a.balance * (a.interestRate || 0.05)), 0);
    return weightedSum / totalBalance;
  }, [allAccounts]);

  const retirementGoalValue = localRetirementGoal;
  const currentAgeValue = localCurrentAge;
  const retireAgeValue = localRetireAge;

  // 1. Current Retirement Savings (Investment/Crypto Accounts)
  const currentRetirementSavings = allAccounts
    .filter(a => a.type === 'asset' && (a.category === 'investment' || a.category === 'crypto'))
    .reduce((sum, a) => sum + a.balance, 0);

  // 2. Monthly Saving Habit (Retirement Specific)
  // We use retireSavings from txTotals which is already calculated as absolute inflow to investment accounts
  const monthlyRetireHabit = txTotals.retireSavings;

  const yearsToRetire = Math.max(1, retireAgeValue - currentAgeValue);
  
  // Advanced Calculation
  const inflationRate = 0.03;
  const baseTaxRate = 0.20;
  
  // Estimate tax increase: 0.1% per year
  const averageTaxRate = baseTaxRate + (yearsToRetire * 0.001);
  
  // Real return rate
  const realReturnRate = Math.max(0.01, (weightedReturn - inflationRate) * (1 - averageTaxRate));
  
  // Future value of current net worth
  const futureNetWorth = totals.net * Math.pow(1 + realReturnRate, yearsToRetire);
  
  // Amount needed
  const amountNeeded = Math.max(0, retirementGoalValue - futureNetWorth);
  
  // Monthly savings needed (FV formula)
  const monthlySavingsNeeded = amountNeeded > 0 
    ? (amountNeeded * (realReturnRate / 12)) / (Math.pow(1 + realReturnRate / 12, yearsToRetire * 12) - 1)
    : 0;

  // 3. Projected Retirement Age calculation based on Retirement HABITS
  const i_rate = realReturnRate / 12;
  const S_0 = currentRetirementSavings;
  const M_habit = monthlyRetireHabit;
  const G_goal = retirementGoalValue;

  let expectedRetireAge = retireAgeValue;
  if (S_0 >= G_goal) {
    expectedRetireAge = currentAgeValue;
  } else if (M_habit > 0 || i_rate > 0) {
    try {
      const numerator = G_goal + (M_habit / i_rate);
      const denominator = S_0 + (M_habit / i_rate);
      if (numerator <= 0 || denominator <= 0) throw new Error("Math limit");
      const n_months = Math.log(numerator / denominator) / Math.log(1 + i_rate);
      expectedRetireAge = Math.round(currentAgeValue + (n_months / 12));
    } catch (e) {
      expectedRetireAge = 120;
    }
  } else {
    expectedRetireAge = 120;
  }

  const displaySavings = isMonthly ? monthlySavingsNeeded : monthlySavingsNeeded * 12;
  const displaySavingHabit = isMonthly ? monthlyRetireHabit : monthlyRetireHabit * 12;

  const wealthData = useMemo(() => ({
    ...data,
    accounts: allAccounts
  }), [data, allAccounts]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-32 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
      {errorStatus === 'MISSING_TABLES' && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-rose-500 animate-pulse"></div>
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center rotate-3">
                <ShieldAlert size={44} />
              </div>
              <div>
                <h2 className="text-3xl font-fredoka font-bold text-slate-900 mb-3">Database Setup Required</h2>
                <p className="text-slate-500 leading-relaxed max-w-md mx-auto">
                  To activate your forensic portfolio, we need to initialize the secure vaults in your Supabase project.
                </p>
              </div>
              
              <div className="w-full bg-slate-50 rounded-3xl p-6 border border-slate-100 text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Action Item</p>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0 mt-1 font-bold text-xs">1</div>
                  <p className="text-sm text-slate-700 font-medium">Open your <span className="font-bold">Supabase Dashboard</span> and go to the <span className="font-bold">SQL Editor</span>.</p>
                </div>
                <div className="flex items-start gap-4 mt-4">
                  <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0 mt-1 font-bold text-xs">2</div>
                  <p className="text-sm text-slate-700 font-medium">Copy the contents of <code className="bg-slate-200 px-1.5 py-0.5 rounded text-emerald-700">SETUP_SUPABASE.sql</code> from this project.</p>
                </div>
                <div className="flex items-start gap-4 mt-4">
                  <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0 mt-1 font-bold text-xs">3</div>
                  <p className="text-sm text-slate-700 font-medium">Paste it into a new query and click <span className="font-bold">Run</span>.</p>
                </div>
              </div>

              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={() => window.location.reload()} 
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-slate-800 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} /> I've Run the Script
                </button>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 py-2 rounded-lg">
                  Project: {import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPlaidSuccess && (
        <div className="fixed inset-0 z-[500] bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
           <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-6 animate-bounce border-4 border-emerald-50 shadow-lg">
             <Check size={40} strokeWidth={4} />
           </div>
           <h2 className="text-3xl font-fredoka font-bold text-slate-900 mb-2">Success!</h2>
           <p className="text-lg font-medium text-emerald-700">Bank Account Linked & Vitals Scanned!</p>
        </div>
      )}

      {isAiSyncing && (
        <div className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center">
           <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 animate-spin-slow"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={24} className="text-emerald-500 animate-pulse" />
              </div>
           </div>
           <h2 className="text-xl md:text-2xl font-fredoka font-bold mb-2">Forensic Scanning...</h2>
           <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px]">Mapping balances & verified bank data</p>
        </div>
      )}

      {showWealthDashboard && (
        <WealthDashboard data={wealthData} transactions={transactions} onClose={() => setShowWealthDashboard(false)} />
      )}

      {selectedAccountForInsights && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white rounded-3xl w-full max-w-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-fredoka font-bold text-slate-900">{selectedAccountForInsights.name} Insights</h3>
                <button onClick={() => setSelectedAccountForInsights(null)}><X size={20}/></button>
              </div>
              <p className="text-slate-600 text-sm">Deep forensic analysis for this registry node is active.</p>
           </div>
        </div>
      )}

      {/* Buttons at the top */}
      <div className="grid grid-cols-3 gap-2 md:gap-6">
        <PlaidLinker userId={user?.id} className="bg-white border border-slate-100 p-3 md:p-6 rounded-3xl flex flex-col items-center gap-2 md:gap-3 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all relative">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center"><LinkIcon size={18} /></div>
          <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Link Bank</p>
        </PlaidLinker>
        <motion.button whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} onClick={() => setSyncMode('vision')} className="bg-white border border-slate-100 p-3 md:p-6 rounded-3xl flex flex-col items-center gap-2 md:gap-3 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center"><Camera size={18} /></div>
          <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Upload File</p>
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} onClick={() => setSyncMode('narrative')} className="bg-white border border-slate-100 p-3 md:p-6 rounded-3xl flex flex-col items-center gap-2 md:gap-3 shadow-sm hover:border-slate-200 hover:shadow-md transition-all">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 text-slate-700 rounded-2xl flex items-center justify-center"><FileText size={18} /></div>
          <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Manual Entry</p>
        </motion.button>
      </div>

      <div className="flex flex-col gap-4">
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} onClick={() => setShowWealthDashboard(true)} className="group w-full bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4 md:gap-8 hover:border-emerald-500 hover:shadow-md transition-all text-left relative overflow-hidden cursor-pointer" role="button" tabIndex={0}>
          <div className="absolute top-6 right-6 text-slate-300 group-hover:text-emerald-600 transition-colors"><ArrowUpRight size={20} /></div>
          <div className="relative w-20 h-20 md:w-36 md:h-36 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#f1f5f9" strokeWidth="3.5" />
              <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#10b981" strokeWidth="3.8" strokeDasharray={`${Math.max(1, (dashboardMetrics.totalAssets / (Math.max(1, dashboardMetrics.totalAssets + dashboardMetrics.totalLiabilities))) * 100)} 100`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isDataLoading || isSyncing ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-1" />
                  <p className="text-[8px] font-black text-emerald-600 uppercase">Syncing...</p>
                </div>
              ) : (
                <>
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase">Net Worth</p>
                  <div className="flex items-center gap-1 group/sync relative">
                    <p className="text-sm md:text-xl font-fredoka font-bold text-slate-900">{formatCurrency(dashboardMetrics.netWorth)}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleBalanceSync(); }}
                      disabled={isSyncing}
                      className="p-1 rounded-full text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all opacity-0 group-hover/sync:opacity-100"
                      title="Sync with Bank"
                    >
                      <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                    </button>
                    {isSyncing && (
                       <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                         <p className="text-[7px] font-black text-emerald-600 uppercase">Live Update Active</p>
                       </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 w-full space-y-2 md:space-y-5 relative z-10">
            <h2 className="text-lg md:text-4xl font-fredoka font-bold text-slate-900">Wealth Dashboard</h2>
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div className="bg-emerald-50 p-3 md:p-4 rounded-2xl border border-emerald-100">
                <p className="text-[8px] md:text-[10px] font-black text-emerald-700 uppercase mb-1">Total Assets</p>
                <div className="text-xs md:text-lg font-bold text-slate-900">{formatCurrency(dashboardMetrics.totalAssets)}</div>
              </div>
              <div className="bg-rose-50 p-3 md:p-4 rounded-2xl border border-rose-100">
                <p className="text-[8px] md:text-[10px] font-black text-rose-700 uppercase mb-1">Total Liabilities</p>
                <div className="text-xs md:text-lg font-bold text-slate-900">{formatCurrency(dashboardMetrics.totalLiabilities)}</div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} onClick={() => setShowTransactionDashboard(true)} className="group w-full bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4 md:gap-8 hover:border-indigo-500 hover:shadow-md transition-all text-left relative overflow-hidden cursor-pointer" role="button" tabIndex={0}>
          <div className="absolute top-6 right-6 text-slate-300 group-hover:text-indigo-600 transition-colors"><ArrowUpRight size={20} /></div>
          <div className="relative w-20 h-20 md:w-36 md:h-36 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#f1f5f9" strokeWidth="3.5" />
              <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#6366f1" strokeWidth="3.8" strokeDasharray={`${Math.min(100, Math.max(1, (txTotals.income / (Math.max(1, txTotals.income + txTotals.spending))) * 100))} 100`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase">Cash Flow</p><p className="text-sm md:text-xl font-fredoka font-bold text-slate-900">{formatCurrency(txTotals.income - txTotals.spending)}</p></div>
          </div>
          <div className="flex-1 w-full space-y-2 md:space-y-5 relative z-10">
            <h2 className="text-lg md:text-4xl font-fredoka font-bold text-slate-900">Transactions Dashboard</h2>
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div className="bg-emerald-50 p-3 md:p-4 rounded-2xl border border-emerald-100">
                <p className="text-[8px] md:text-[10px] font-black text-emerald-700 uppercase mb-1">Total Income</p>
                <div className="text-xs md:text-lg font-bold text-slate-900">{formatCurrency(txTotals.income)}</div>
              </div>
              <div className="bg-rose-50 p-3 md:p-4 rounded-2xl border border-rose-100">
                <p className="text-[8px] md:text-[10px] font-black text-rose-700 uppercase mb-1">Total Expenses</p>
                <div className="text-xs md:text-lg font-bold text-slate-900">{formatCurrency(txTotals.spending)}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Retirement Calculator */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center"><Calculator size={24} /></div>
            <div>
              <h3 className="text-base md:text-xl font-fredoka font-bold text-slate-900">Retirement Calculator</h3>
              <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">PATH TO FINANCIAL FREEDOM</p>
            </div>
            <button onClick={() => setShowInfoModal(true)} className="text-slate-400 hover:text-emerald-700"><HelpCircle size={16} /></button>
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button onClick={() => setIsMonthly(true)} className={`px-2 md:px-4 py-2 rounded-lg font-black text-[9px] md:text-[10px] ${isMonthly ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>MONTHLY</button>
            <button onClick={() => setIsMonthly(false)} className={`px-2 md:px-4 py-2 rounded-lg font-black text-[9px] md:text-[10px] ${!isMonthly ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>ANNUAL</button>
          </div>
        </div>

      {showInfoModal && (
        <div className="fixed inset-0 z-[600] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-fredoka font-bold text-slate-900">How it works</h3>
                 <button onClick={() => setShowInfoModal(false)}><X size={20}/></button>
              </div>
              <div className="text-slate-600 space-y-3 text-xs leading-relaxed">
                <p>This calculator uses a sophisticated projection model to estimate your path to retirement:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Inflation:</strong> Assumes a constant 3% annual inflation rate.</li>
                  <li><strong>Taxes:</strong> Accounts for historic tax trends.</li>
                  <li><strong>Expected Returns:</strong> Calculates a weighted average return.</li>
                  <li><strong>Real Return:</strong> We calculate your "real" return by subtracting inflation and taxes.</li>
                </ul>
              </div>
              <button onClick={() => setShowInfoModal(false)} className="w-full mt-6 bg-emerald-700 text-white font-black py-3 rounded-xl shadow-lg text-xs uppercase tracking-widest">GOT IT</button>
           </div>
        </div>
      )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retirement Goal</label>
                <span className="text-lg font-fredoka font-bold text-emerald-700">{formatCurrency(localRetirementGoal)}</span>
              </div>
              <input 
                type="range" 
                min="100000" 
                max="10000000" 
                step="10000" 
                value={localRetirementGoal} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setLocalRetirementGoal(val);
                  onUpdate({...data, retirementGoal: {...data.retirementGoal, targetAmount: val, targetAge: localRetireAge, currentAge: localCurrentAge}});
                }} 
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-700" 
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Age</label>
                  <span className="text-lg font-fredoka font-bold text-slate-900">{localCurrentAge}</span>
                </div>
                <input 
                  type="range" 
                  min="18" 
                  max="100" 
                  value={localCurrentAge} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLocalCurrentAge(val);
                    if (val >= localRetireAge) setLocalRetireAge(val + 1);
                    onUpdate({...data, retirementGoal: {...data.retirementGoal, targetAmount: localRetirementGoal, targetAge: localRetireAge, currentAge: val}});
                  }} 
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-700" 
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retire Age</label>
                  <span className="text-lg font-fredoka font-bold text-slate-900">{localRetireAge}</span>
                </div>
                <input 
                  type="range" 
                  min={localCurrentAge + 1} 
                  max="100" 
                  value={localRetireAge} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLocalRetireAge(val);
                    onUpdate({...data, retirementGoal: {...data.retirementGoal, targetAmount: localRetirementGoal, targetAge: val, currentAge: localCurrentAge}});
                  }} 
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-700" 
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Savings Target</p>
              <p className="text-2xl font-fredoka font-bold text-slate-900">{formatCurrency(displaySavings)}</p>
            </div>
            <div className="bg-emerald-700 p-6 rounded-3xl flex flex-col justify-center">
              <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-2">Retirement Budget</p>
              <p className="text-2xl font-fredoka font-bold text-white">{formatCurrency(isMonthly ? (retirementGoalValue * (0.04 * (30 / Math.max(1, 100 - retireAgeValue))) / 12) : (retirementGoalValue * (0.04 * (30 / Math.max(1, 100 - retireAgeValue)))))}</p>
            </div>
          </div>
        </div>

        {/* Dynamic Ticker Line */}
        <div className="mt-8 pt-6 border-t border-slate-100 overflow-hidden relative">
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
               <Timer size={20} className="animate-pulse" />
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-xs md:text-sm font-medium text-slate-700 leading-tight">
                 {expectedRetireAge > 100 
                   ? "Based on your current financial habits, it is unlikely you will reach the desired amount."
                   : <>Based on your current financial habits, you are on pace to retire at age <span className="font-bold text-indigo-700">{expectedRetireAge}</span> with <span className="font-bold text-emerald-700">{formatCurrency(retirementGoalValue)}</span> saved.</>
                 }
               </p>
               <div className="flex flex-wrap gap-2 md:gap-4 mt-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                   Retirement Balance: <span className="text-slate-600">{formatCurrency(currentRetirementSavings)}</span>
                 </p>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                   Saving Rate ({isMonthly ? 'Monthly' : 'Annual'}): <span className="text-slate-600">{formatCurrency(displaySavingHabit)}</span>
                 </p>
               </div>
             </div>
             <div className="hidden lg:flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Live Projection</span>
             </div>
          </div>
        </div>
      </div>

      {showTransactionDashboard && (
        <TransactionDashboard onClose={() => setShowTransactionDashboard(false)} />
      )}

      {showReviewModal && (
        <div className="fixed inset-0 z-[600] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-fredoka font-bold text-slate-900">Review Registry Updates</h3>
                 <button onClick={() => setShowReviewModal(false)}><X size={20}/></button>
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar mb-6">
                 {pendingAccounts.map(acc => (
                   <div key={acc.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                      <div><p className="font-bold text-slate-900 text-xs">{acc.name}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{acc.category}</p></div>
                      <p className="font-black text-emerald-700 text-xs">{formatCurrency(acc.balance)}</p>
                   </div>
                 ))}
              </div>
              <button onClick={confirmPendingAccounts} className="w-full bg-emerald-700 text-white font-black py-3 rounded-xl shadow-lg text-xs uppercase tracking-widest">CONFIRM UPDATES</button>
           </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-fredoka font-bold text-slate-900 flex items-center gap-3"><ListTodo className="text-emerald-700" size={20} /> Account Registry</h3>
          <div className="flex bg-slate-100 rounded-xl p-1">
            {['All Accounts', 'Assets', 'Liabilities'].map(filter => (
              <button key={filter} onClick={() => setActiveFilter(filter as any)} className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest ${activeFilter === filter ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>{filter}</button>
            ))}
          </div>
        </div>
        
        {filteredAccounts.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><ShieldAlert size={40} /></div>
            <h3 className="text-xl font-fredoka font-bold text-slate-900">No Active Silos Connected</h3>
            <p className="text-slate-500 text-sm max-w-xs">Your portfolio is currently empty. Connect your first account to start tracking.</p>
            <PlaidLinker className="bg-emerald-600 text-white font-black px-8 py-4 rounded-2xl shadow-lg uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all">Link First Account</PlaidLinker>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAccounts.map(acc => (
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} key={acc.id} onClick={() => setSelectedAccountForInsights(acc)} className="w-full text-left p-4 bg-slate-50/50 rounded-2xl flex items-center justify-between hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-emerald-100 cursor-pointer" role="button" tabIndex={0}>
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${acc.type === 'asset' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{getCategoryIcon(acc.category)}</div>
                  <div className="overflow-hidden"><h4 className="font-bold text-slate-900 text-sm truncate">{acc.name}</h4><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{acc.category.replace('-', ' ')}</p></div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className={`text-sm font-black ${acc.type === 'asset' ? 'text-emerald-700' : 'text-rose-700'}`}>{acc.type === 'liability' ? '-' : ''}{formatCurrency(acc.balance)}</p>
                    {activeFilter === 'Assets' && acc.type === 'asset' && <p className="text-[10px] font-bold text-slate-400">{((acc.balance / dashboardMetrics.totalAssets) * 100).toFixed(1)}% of Assets</p>}
                    {activeFilter === 'Liabilities' && acc.type === 'liability' && acc.interestRate && <p className="text-[10px] font-bold text-slate-400">{(acc.interestRate * 100).toFixed(1)}% APR</p>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setPrefilledChat(`Can you explain the ${acc.name} in my wealth dashboard?`); setView('chat'); }} className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-all"><Sparkles size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteAccount(acc.id); }} className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-600 transition-all"><Trash2 size={14} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// export default WealthView;