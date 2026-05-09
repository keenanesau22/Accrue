import { Symptom } from './types';

export const ARCHETYPES = [
  { id: 'a1', name: 'Saver', icon: '💰', tagline: 'The Foundation Builder', description: 'You prioritize security and long-term stability.', stats: { riskTolerance: 10, timeHorizon: 90, spendingDiscipline: 90, marketSavvy: 50, debtSentiment: 90, assetGrowth: 50 } },
  { id: 'a2', name: 'Investor', icon: '📈', tagline: 'The Growth Architect', description: 'You focus on compounding and market opportunities.', stats: { riskTolerance: 50, timeHorizon: 50, spendingDiscipline: 50, marketSavvy: 90, debtSentiment: 50, assetGrowth: 90 } },
  { id: 'a3', name: 'Spender', icon: '🛍️', tagline: 'The Experience Seeker', description: 'You value immediate enjoyment and lifestyle.', stats: { riskTolerance: 90, timeHorizon: 10, spendingDiscipline: 10, marketSavvy: 10, debtSentiment: 10, assetGrowth: 10 } }
];

export const UNITS = [
  {
    id: 'u1',
    title: 'Budgeting Basics',
    lessons: [
      { id: 'u1-l1', title: 'Tracking Expenses', description: 'Learn to track your spending.', icon: '💰', difficulty: 'Beginner', status: 'locked', learningMaterial: '', questions: [] }
    ]
  }
];

export const SYMPTOM_DICTIONARY: Symptom[] = [
  { 
    id: 'liq-001', 
    name: 'Liquidity Trap', 
    severity: 3, 
    description: 'Low cash balance',
    icon: '💰',
    remissionCriteria: 'Balance > 1000',
    category: 'Budgeting', 
    module: 'Budgeting', 
    triggerField: 'balance', 
    triggerOperator: '<', 
    triggerThreshold: 1000, 
    finnyConsultTitle: 'Liquidity Trap', 
    finnyConsultScript: 'Your liquidity is low.', 
    prescribedLessonId: 'u1-l1', 
    unlockToolId: 't1', 
    remedyAction: 'Save more', 
    badgeId: 'b1' 
  }
];

export const BUDGET_CATEGORIES = ['Housing', 'Food', 'Transport', 'Entertainment'];
export const ARCHETYPE_TEST_QUESTIONS = [
  { 
    id: 'q1', 
    question: 'How do you spend money?', 
    options: [
      { text: 'I save it', scores: { riskTolerance: 10, timeHorizon: 90, spendingDiscipline: 90, marketSavvy: 50, debtSentiment: 90, assetGrowth: 50 } },
      { text: 'I spend it', scores: { riskTolerance: 90, timeHorizon: 10, spendingDiscipline: 10, marketSavvy: 50, debtSentiment: 10, assetGrowth: 50 } }
    ]
  }
];
export const TEMPLATES = [];
