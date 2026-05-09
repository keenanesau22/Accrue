import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-white/50 backdrop-blur-md border border-white/20 p-4 rounded-xl shadow-sm dark:bg-gray-800/50 dark:border-gray-700/50">
      <div className="flex items-center gap-2 text-gray-500 mb-2 dark:text-gray-400">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-widest">{title}</p>
      </div>
      <p className="text-xl font-fredoka font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
};
