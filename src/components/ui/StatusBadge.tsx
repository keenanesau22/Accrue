import React from 'react';

interface StatusBadgeProps {
  status: 'active' | 'pending' | 'inactive';
  label: string;
  priority?: 'high' | 'normal';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, priority }) => {
  const colors = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };

  const glow = priority === 'high' ? 'animate-pulse shadow-[0_0_10px_rgba(225,29,72,0.5)]' : '';

  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${colors[status]} ${glow}`}>
      {label}
    </span>
  );
};
