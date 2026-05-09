import React from 'react';
import { ChevronDown, BarChart, CreditCard, Landmark, TrendingUp, Filter } from 'lucide-react';
import { UNITS } from '../constants';
import { Difficulty } from '../types';

interface UnitHeaderProps {
  selectedUnitId: string;
  selectedDifficulty: Difficulty;
  onSelectUnit: (id: string) => void;
  onSelectDifficulty: (diff: Difficulty) => void;
}

const UnitHeader: React.FC<UnitHeaderProps> = ({ 
  selectedUnitId, 
  selectedDifficulty, 
  onSelectUnit, 
  onSelectDifficulty 
}) => {
  const currentUnit = UNITS.find(u => u.id === selectedUnitId);

  const getIcon = (id: string) => {
    const size = 20;
    if (id === 'u1') return <BarChart size={size} />;
    if (id === 'u2') return <CreditCard size={size} />;
    if (id === 'u3') return <Landmark size={size} />;
    return <TrendingUp size={size} />;
  };

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4 md:px-12">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Unit Selector Dropdown */}
        <div className="relative w-full sm:w-auto min-w-[240px]">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">
            Current Module
          </label>
          <div className="relative group">
            <select
              value={selectedUnitId}
              onChange={(e) => onSelectUnit(e.target.value)}
              className="w-full appearance-none bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3.5 pr-12 font-bold text-black focus:outline-none focus:border-emerald-500 transition-all cursor-pointer hover:bg-white"
            >
              {UNITS.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.title}
                </option>
              ))}
            </select>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none hidden">
              {getIcon(selectedUnitId)}
            </div>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:rotate-180 transition-transform" size={20} />
          </div>
        </div>

        {/* Difficulty Selector Dropdown */}
        <div className="relative w-full sm:w-auto min-w-[180px]">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">
            Proficiency Level
          </label>
          <div className="relative group">
            <select
              value={selectedDifficulty}
              onChange={(e) => onSelectDifficulty(e.target.value as Difficulty)}
              className="w-full appearance-none bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3.5 pr-12 font-bold text-black focus:outline-none focus:border-emerald-500 transition-all cursor-pointer hover:bg-white"
            >
              <option value={Difficulty.BEGINNER}>Beginner</option>
              <option value={Difficulty.INTERMEDIATE}>Intermediate</option>
              <option value={Difficulty.ADVANCED}>Advanced</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:rotate-180 transition-transform" size={20} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitHeader;