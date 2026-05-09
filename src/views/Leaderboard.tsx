
import React, { useState, useMemo } from 'react';
import { UserStats } from '../types';
import { Award, Flame, Trophy, TrendingUp, Search, Crown, ChevronRight, User as UserIcon, ArrowLeft } from 'lucide-react';

interface LeaderboardProps {
  user: UserStats;
  onBack?: () => void;
}

interface FakeUser {
  username: string;
  badges: number;
  streak: number;
  icon?: string | null;
  isMe?: boolean;
}

const GLOBAL_USERS: FakeUser[] = [
  { username: 'WealthWiz', badges: 142, streak: 89, icon: '🦅' },
  { username: 'StockSniper', badges: 128, streak: 120, icon: '🎯' },
  { username: 'BudgetBoss', badges: 115, streak: 45, icon: '🏢' },
  { username: 'CryptoQueen', badges: 104, streak: 72, icon: '💎' },
  { username: 'SaverSam', badges: 98, streak: 210, icon: '🐻' },
  { username: 'PassivePat', badges: 92, streak: 33, icon: '🧘' },
  { username: 'GrowthGal', badges: 88, streak: 15, icon: '🌱' },
  { username: 'YieldYoda', badges: 76, streak: 54, icon: '⚖️' },
  { username: 'CashFlowChris', badges: 64, streak: 12, icon: '⚡' },
  { username: 'DividendDon', badges: 52, streak: 9, icon: '💰' },
  { username: 'IndexIris', badges: 48, streak: 105, icon: '📊' },
  { username: 'BullishBen', badges: 42, streak: 28, icon: '📈' },
  { username: 'MarketMina', badges: 31, streak: 4, icon: '🎯' },
  { username: 'FundFanatic', badges: 25, streak: 18, icon: '🏢' },
  { username: 'OptionOwl', badges: 14, streak: 3, icon: '🦉' },
];

const Leaderboard: React.FC<LeaderboardProps> = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState<'badges' | 'streak'>('badges');

  const rankings = useMemo(() => {
    const me: FakeUser = {
      username: user.username,
      badges: (user.completedLessonIds || []).length,
      streak: user.streak,
      icon: user.profilePicture,
      isMe: true
    };
    
    const all = [...GLOBAL_USERS, me];
    
    if (activeTab === 'badges') {
      return all.sort((a, b) => b.badges - a.badges);
    }
    return all.sort((a, b) => b.streak - a.streak);
  }, [user, activeTab]);

  const myRank = rankings.findIndex(u => u.isMe) + 1;
  const topThree = rankings.slice(0, 3);
  const remaining = rankings.slice(3);

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {onBack && (
        <button 
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-slate-400 hover:text-emerald-600 font-bold text-[10px] uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={14} /> Back to Profile
        </button>
      )}

      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
          <Trophy size={12} /> Global Hall of Fame
        </div>
        <h1 className="text-3xl font-fredoka font-bold text-slate-900">
          Rankings
        </h1>
        <p className="text-slate-500 text-xs">Compete with the world's most disciplined investors.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl mb-8 max-w-xs mx-auto">
        <button 
          onClick={() => setActiveTab('badges')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold transition-all ${
            activeTab === 'badges' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Award size={14} /> Badges
        </button>
        <button 
          onClick={() => setActiveTab('streak')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold transition-all ${
            activeTab === 'streak' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Flame size={14} /> Streak
        </button>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-3 mb-8 items-end px-2">
        {/* 2nd Place */}
        <div className="flex flex-col items-center gap-2 order-1">
          <div className="relative">
            <div className="w-14 h-14 bg-slate-100 rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-2xl">
              {topThree[1]?.icon || <UserIcon size={24} className="text-slate-300" />}
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-800 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white">2</div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-900 truncate w-20">{topThree[1]?.username}</p>
            <p className="text-[9px] font-black text-emerald-600">
              {activeTab === 'badges' ? topThree[1]?.badges : topThree[1]?.streak} {activeTab === 'badges' ? 'Badges' : 'Days'}
            </p>
          </div>
          <div className="h-16 w-full bg-gradient-to-t from-slate-100 to-slate-50/50 rounded-t-xl border-t border-x border-slate-100"></div>
        </div>

        {/* 1st Place */}
        <div className="flex flex-col items-center gap-2 order-2">
          <div className="relative -mb-2">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce">
              <Crown className="text-amber-400 fill-amber-400" size={24} />
            </div>
            <div className="w-16 h-16 bg-amber-50 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-3xl">
              {topThree[0]?.icon || <UserIcon size={32} className="text-amber-200" />}
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">1</div>
          </div>
          <div className="text-center mt-3">
            <p className="text-xs font-black text-slate-900 truncate w-20">{topThree[0]?.username}</p>
            <p className="text-[9px] font-black text-emerald-700">
              {activeTab === 'badges' ? topThree[0]?.badges : topThree[0]?.streak} {activeTab === 'badges' ? 'Badges' : 'Days'}
            </p>
          </div>
          <div className="h-24 w-full bg-gradient-to-t from-emerald-100 to-emerald-50/50 rounded-t-xl border-t border-x border-emerald-100"></div>
        </div>

        {/* 3rd Place */}
        <div className="flex flex-col items-center gap-2 order-3">
          <div className="relative">
            <div className="w-14 h-14 bg-orange-50 rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-2xl">
              {topThree[2]?.icon || <UserIcon size={24} className="text-orange-200" />}
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-orange-400 text-orange-900 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white">3</div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-900 truncate w-20">{topThree[2]?.username}</p>
            <p className="text-[9px] font-black text-emerald-600">
              {activeTab === 'badges' ? topThree[2]?.badges : topThree[2]?.streak} {activeTab === 'badges' ? 'Badges' : 'Days'}
            </p>
          </div>
          <div className="h-12 w-full bg-gradient-to-t from-orange-50 to-orange-50/50 rounded-t-xl border-t border-x border-orange-100"></div>
        </div>
      </div>

      {/* User Card */}
      <div className="mb-6 p-5 bg-emerald-700 rounded-2xl text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
            {user.profilePicture || '🦉'}
          </div>
          <div>
            <h4 className="font-fredoka font-bold text-sm">{user.username} (You)</h4>
            <p className="text-[9px] font-bold uppercase opacity-70 tracking-widest">
              Rank #{myRank} • Top {Math.max(1, Math.round((myRank / rankings.length) * 100))}%
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black">
            {activeTab === 'badges' ? (user.completedLessonIds || []).length : user.streak}
          </div>
          <div className="text-[9px] font-bold uppercase opacity-70">
            {activeTab === 'badges' ? 'Badges' : 'Streak'}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {remaining.map((u, i) => {
          const rank = i + 4;
          return (
            <div 
              key={u.username}
              className={`flex items-center justify-between p-4 border-b border-slate-50 last:border-0 transition-colors ${
                u.isMe ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                  u.isMe ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {rank}
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-lg">
                  {u.icon || '👤'}
                </div>
                <div className="flex flex-col">
                  <span className={`font-bold text-xs ${u.isMe ? 'text-emerald-800' : 'text-slate-900'}`}>
                    {u.username} {u.isMe && '(Me)'}
                  </span>
                  {rank <= 10 && (
                    <span className="text-[8px] font-black uppercase text-emerald-500 tracking-tighter">Top Trader</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <div className="text-right">
                    <div className={`font-black text-xs ${u.isMe ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {activeTab === 'badges' ? u.badges : u.streak}
                    </div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase">
                      {activeTab === 'badges' ? 'Badges' : 'Days'}
                    </div>
                 </div>
                 <ChevronRight size={14} className="text-slate-300" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
