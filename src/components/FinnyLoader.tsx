
import React from 'react';

interface FinnyLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const FinnyLoader: React.FC<FinnyLoaderProps> = ({ message = 'Thinking...', size = 'md' }) => {
  const iconSize = size === 'lg' ? 'text-6xl' : size === 'md' ? 'text-4xl' : 'text-2xl';
  
  return (
    <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
      <div className="relative">
        {/* Main Icon Circle */}
        <div className={`
          ${size === 'lg' ? 'w-24 h-24' : size === 'md' ? 'w-16 h-16' : 'w-12 h-12'}
          bg-emerald-50 rounded-[2rem] flex items-center justify-center shadow-inner border-2 border-emerald-100/50
        `}>
          <span className={`${iconSize} animate-bounce drop-shadow-sm`}>🦉</span>
        </div>
        
        {/* Thinking Indicator Dots */}
        <div className="absolute -bottom-2 -right-2">
          <div className="flex gap-1 bg-white px-2.5 py-1.5 rounded-full shadow-lg border border-emerald-100">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
      
      {message && (
        <div className="space-y-1 text-center">
          <p className={`font-black text-emerald-600 uppercase tracking-[0.2em] ${size === 'lg' ? 'text-xs' : 'text-[10px]'}`}>
            {message}
          </p>
          {size === 'lg' && <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Consulting Financial Node</p>}
        </div>
      )}
    </div>
  );
};

export default FinnyLoader;
