
import React from 'react';
import { Activity, DollarSign, MessageSquare, User as UserIcon, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { UserStats, ActiveSymptom } from '../types';

interface BottomNavProps {
  user: UserStats;
  currentView: string;
  setView: (view: 'dashboard' | 'lesson' | 'profile' | 'leaderboard' | 'chat' | 'wealth' | 'admin') => void;
  activeSymptoms: ActiveSymptom[];
}

const BottomNav: React.FC<BottomNavProps> = ({ user, currentView, setView, activeSymptoms }) => {
  const navItems = [
    { id: 'dashboard', icon: Activity, label: 'Analyze' },
    { id: 'wealth', icon: DollarSign, label: 'Wealth', premium: true },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'profile', icon: UserIcon, label: 'Profile' },
  ];

  if (user.isAdmin) {
    navItems.push({ id: 'admin', icon: ShieldCheck, label: 'Admin', premium: false });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-emerald-800 border-t border-emerald-900 z-[100] px-2 pb-safe-area-inset-bottom transition-all">
      <div className="max-w-xl mx-auto flex items-center justify-between h-16">
        {navItems.map(({ id, icon: Icon, label, premium }) => {
          const isActive = currentView === id || (id === 'dashboard' && currentView === 'lesson');
          const isLocked = premium && !user.isPremium;
          const hasSymptom = id === 'dashboard' && activeSymptoms.length > 0;
          
          return (
            <button
              key={id}
              onClick={() => setView(id as any)}
              className={`flex flex-col items-center justify-center flex-1 transition-all relative py-1 rounded-xl ${
                isActive ? 'text-emerald-500' : 'text-white'
              } ${
                hasSymptom ? 'animate-pulse' : ''
              }`}
            >
              <div className="relative mb-0.5">
                <Icon size={22} strokeWidth={isActive ? 3 : 2} />
              </div>
              <span className={`text-[10px] font-bold tracking-tight ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
