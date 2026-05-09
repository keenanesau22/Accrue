import React, { useState, useMemo, useEffect } from 'react';
import { 
  RadialBarChart, 
  RadialBar, 
  PolarAngleAxis, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  Cell, 
  Tooltip,
  LabelList
} from 'recharts';
import { AlertCircle, Bot } from 'lucide-react';
import { NetWorthData } from '../types';

// Mock data for the charts
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs">
        <p className="font-bold mb-1">{data.name}</p>
        <p>{data.value}%</p>
        <p className="text-slate-400 mt-1 text-[10px]">{data.explanation}</p>
      </div>
    );
  }
  return null;
};

const getVitalColor = (name: string, value: number) => {
  const isGoodHigh = name === 'Liquidity Oxygen' || name === 'Savings Pulse';
  
  if (isGoodHigh) {
    if (value >= 70) return '#22c55e'; // Green
    if (value >= 40) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  } else {
    // Good is low (Burn Rate, Debt Pressure)
    if (value <= 40) return '#22c55e'; // Green
    if (value <= 70) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  }
};

interface FinancialVitalsProps {
  transactions: any[];
  netWorth: NetWorthData;
}

const FinancialVitals: React.FC<FinancialVitalsProps> = ({ transactions, netWorth }) => {
  const [finnyPopup, setFinnyPopup] = useState<{content: string, x: number, y: number} | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const vitalsData = useMemo(() => {
    const totalAssets = netWorth.accounts.filter(a => a.type === 'asset').reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = netWorth.accounts.filter(a => a.type === 'liability').reduce((sum, a) => sum + a.balance, 0);
    const cashAssets = netWorth.accounts.filter(a => a.category === 'cash').reduce((sum, a) => sum + a.balance, 0);
    
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    const burnRate = income > 0 ? Math.min(100, Math.max(0, ((expenses - income) / income) * 100)) : 50;
    const liquidity = expenses > 0 ? Math.min(100, (cashAssets / expenses) * 100) : 50;
    const savings = income > 0 ? Math.min(100, ((income - expenses) / income) * 100) : 50;
    const debtPressure = totalAssets > 0 ? Math.min(100, (totalLiabilities / totalAssets) * 100) : 50;

    return [
      { name: 'Burn Rate', value: Math.round(burnRate), fill: '#ef4444', explanation: `Your burn rate is ${Math.round(burnRate)}%.` },
      { name: 'Liquidity Oxygen', value: Math.round(liquidity), fill: '#22c55e', explanation: `Your liquidity is ${Math.round(liquidity)}%.` },
      { name: 'Savings Pulse', value: Math.round(savings), fill: '#eab308', explanation: `Your savings rate is ${Math.round(savings)}%.` },
      { name: 'Debt Pressure', value: Math.round(debtPressure), fill: '#7c3aed', explanation: `Your debt pressure is ${Math.round(debtPressure)}%.` },
    ];
  }, [netWorth, transactions]);

  const symptomData = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    transactions.forEach(tx => {
      if (new Date(tx.date) >= oneYearAgo) {
        categoryCounts[tx.category] = (categoryCounts[tx.category] || 0) + 1;
      }
    });

    // Simple mapping of categories to symptoms
    const mapping: Record<string, string> = {
      'credit-card': 'Interest Hemorrhage',
      'credit card': 'Interest Hemorrhage',
      'credit': 'Interest Hemorrhage',
      'debt': 'Interest Hemorrhage',
      'mortgage': 'Interest Hemorrhage',
      'investment': 'Compound Fatigue',
      'cash': 'Cash Stagnosis',
      'other': 'Subscription Parasite',
      'student-loan': 'Minimum Payment Coma',
      'student': 'Minimum Payment Coma',
      'car-loan': 'Minimum Payment Coma',
      'general-loan': 'Minimum Payment Coma',
      'property': 'Lifestyle Hypertrophy',
      'crypto': 'Cash Stagnosis'
    };

    const symptomFrequency: Record<string, number> = {};
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      const symptom = mapping[cat] || 'Unknown';
      if (symptom !== 'Unknown') {
        symptomFrequency[symptom] = (symptomFrequency[symptom] || 0) + count;
      }
    });

    return Object.entries(symptomFrequency)
      .map(([symptom, frequency]) => ({ symptom, frequency, severity: Math.min(100, frequency * 10), explanation: `Occurred ${frequency} times in the past year.` }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }, [transactions]);

  const handleInteraction = (content: string, event: React.MouseEvent) => {
    setFinnyPopup({
      content,
      x: event.clientX + 10,
      y: event.clientY + 10,
    });
  };

  if (isLoading) {
    return (
      <div className="relative bg-white rounded-[2rem] p-8 border-2 border-gray-100 mb-8 shadow-sm animate-pulse">
        <div className="h-6 w-40 bg-gray-200 rounded mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 w-24 bg-gray-200 rounded-full mx-auto"></div>
          ))}
        </div>
        <div className="h-40 w-full bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-[2rem] p-8 border-2 border-gray-100 mb-8 shadow-sm">
      {finnyPopup && (
        <div 
          className="fixed z-50 bg-indigo-900 text-white p-4 rounded-xl shadow-lg max-w-xs text-sm"
          style={{ left: finnyPopup.x, top: finnyPopup.y }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Bot size={16} />
            <span className="font-bold">Finny Says:</span>
          </div>
          {finnyPopup.content}
        </div>
      )}

      <h2 className="text-xl font-fredoka font-bold text-gray-800 mb-6">Financial Vitals</h2>
      
      {/* 1. Financial Vitals Gauge */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {vitalsData.map((vital) => {
          const color = getVitalColor(vital.name, vital.value);
          return (
            <div 
              key={vital.name} 
              className="flex flex-col items-center cursor-pointer"
              onMouseEnter={(e) => handleInteraction(vital.explanation, e)}
              onClick={(e) => handleInteraction(vital.explanation, e)}
              onMouseLeave={() => setFinnyPopup(null)}
            >
              <div className="h-20 w-20 md:h-24 md:w-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={[{...vital, fill: color}]} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={30} fill={color} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-bold text-gray-700">
                  {vital.value}%
                </div>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-gray-500 mt-2 text-center">{vital.name}</p>
            </div>
          );
        })}
      </div>

      {/* 2. Symptom Frequency Bar Chart */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-600 mb-4">Most Frequent Symptoms</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={symptomData}>
              <XAxis dataKey="symptom" />
              <Tooltip cursor={{fill: '#f1f5f9'}} content={<CustomTooltip />} />
              <Bar 
                dataKey="frequency"
                radius={[6, 6, 0, 0]}
                onMouseEnter={(data, index, e) => handleInteraction(symptomData[index].explanation, e)}
                onClick={(data, index, e) => handleInteraction(symptomData[index].explanation, e)}
                onMouseLeave={() => setFinnyPopup(null)}
              >
                {symptomData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.severity > 70 ? '#ef4444' : entry.severity > 40 ? '#eab308' : '#22c55e'} />
                ))}
                <LabelList dataKey="frequency" position="top" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. AI Clinical Notes */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 mb-2 text-indigo-600">
          <AlertCircle size={16} />
          <h4 className="text-xs font-bold uppercase">AI Clinical Second Opinion</h4>
        </div>
        <p className="text-sm text-gray-700 italic">
          "Patient shows signs of 'Weekend Fever'—spending increases by 40% on Friday nights."
        </p>
      </div>
    </div>
  );
};

export default FinancialVitals;
