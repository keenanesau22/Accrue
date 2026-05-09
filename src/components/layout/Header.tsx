
import React, { useState, useEffect } from 'react';
import { Flame, Award, Sun, Moon, ShieldAlert, RefreshCw } from 'lucide-react';
import { UserStats, SmartNotification, ViewType, NetWorthData } from '../../types';

interface HeaderProps {
  user: UserStats;
  netWorth: NetWorthData;
  setView: (view: ViewType) => void;
  onMarkNotificationsRead: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, netWorth, setView, onMarkNotificationsRead }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const totalBadgesEarned = (user?.completedLessonIds || []).length;
  const [lastSynced, setLastSynced] = useState(new Date().toLocaleTimeString());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setLastSynced(new Date().toLocaleTimeString());
  }, [netWorth.lastSynced]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 z-[60] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <button 
          onClick={() => setView('dashboard')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
        >
          <div className="w-9 h-9 bg-emerald-800 rounded-xl flex items-center justify-center text-white text-lg font-bold font-fredoka">
            A
          </div>
          <span className="font-fredoka text-lg font-bold text-emerald-800">Accrue</span>
        </button>

        {/* Sync Status */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-500 font-medium">
          <span>Last Synced: {lastSynced}</span>
          <button onClick={handleRefresh} className={`p-1 ${isRefreshing ? 'animate-pulse' : ''}`}>
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Stats (Right) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-orange-50 rounded-full text-orange-600 font-bold text-[10px] sm:text-xs border border-orange-100 shadow-sm">
            <Flame size={14} fill="currentColor" />
            <span>{user?.streak || 0}</span>
          </div>
          <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-purple-50 rounded-full text-purple-600 font-bold text-[10px] sm:text-xs border border-purple-100 shadow-sm">
            <Award size={14} fill="currentColor" />
            <span>{totalBadgesEarned}</span>
          </div>
          {user?.isAdmin && (
            <button onClick={() => setView('admin')} className="p-2 text-slate-500 hover:text-emerald-700 transition-colors">
              <ShieldAlert size={18} />
            </button>
          )}
          <button onClick={toggleDarkMode} className="p-2 text-slate-500 hover:text-emerald-700 transition-colors">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
};

// export default Header;
