import React from 'react';
import { Activity, DollarSign, MessageSquare, User as UserIcon, ShieldCheck } from 'lucide-react';
import { ViewType } from '../../types';

interface SidebarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isAdmin }) => {
  const navItems = [
    { id: 'dashboard', icon: Activity, label: 'Analyze' },
    { id: 'wealth', icon: DollarSign, label: 'Wealth' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'profile', icon: UserIcon, label: 'Profile' },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', icon: ShieldCheck, label: 'Admin' });
  }

  return (
    <aside className="hidden sm:flex flex-col w-20 lg:w-64 bg-white border-r border-gray-100 h-screen p-6 transition-all duration-300 sticky top-0">
      <h2 className="text-xl font-fredoka font-bold text-emerald-800 mb-8 flex items-center justify-center lg:justify-start">
        <span className="lg:hidden">A</span>
        <span className="hidden lg:inline">Accrue</span>
      </h2>
      <nav className="space-y-2">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = currentView === id;
          return (
            <button
              key={id}
              onClick={() => setView(id as ViewType)}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all w-full ${
                isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon size={24} />
              <span className="hidden lg:inline font-bold text-sm">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
