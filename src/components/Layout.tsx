import React from 'react';
import { Header } from './layout/Header';
import BottomNav from './BottomNav';
import { UserStats, ActiveSymptom, NetWorthData } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserStats;
  netWorth: NetWorthData;
  currentView: string;
  setView: (view: any) => void;
  activeSymptoms: ActiveSymptom[];
  onMarkNotificationsRead: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, netWorth, currentView, setView, activeSymptoms, onMarkNotificationsRead }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header user={user} netWorth={netWorth} setView={setView} onMarkNotificationsRead={onMarkNotificationsRead} />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      <BottomNav user={user} currentView={currentView} setView={setView} activeSymptoms={activeSymptoms} />
    </div>
  );
};

export default Layout;
