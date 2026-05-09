
export enum Difficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED'
}

export enum LessonStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  COMPLETED = 'COMPLETED'
}

export enum BadgeTier {
  LOCKED = 'LOCKED',
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  HOF = 'HOF'
}

export interface Account {
  id: string;
  name: string;
  type: 'Checking' | 'Savings' | 'Investment' | 'asset' | 'liability';
  balance: number;
  category?: string;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'matching';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface LearnSection {
  title: string;
  content: string;
  keyTakeaway: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: Difficulty;
  status: LessonStatus;
  learningMaterial: LearnSection[];
  questions: Question[];
  toolId?: string; // New: Links the lesson to the tool it unlocks
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    type?: 'treatment_card' | 'symptom_summary_card';
    lessonId?: string;
    symptomId?: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface ArchetypeStats {
  riskTolerance: number;
  timeHorizon: number;
  spendingDiscipline: number;
  marketSavvy: number;
  debtSentiment: number;
  assetGrowth: number;
}

export interface FinancialArchetype {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  stats: ArchetypeStats;
  color?: string;
}

export interface Demographics {
  ageRange?: string;
  incomeBracket?: string;
  employmentStatus?: string;
  primaryGoal?: string;
}

export interface SmartNotification {
  id: string;
  type: 'anomaly' | 'tip' | 'goal' | 'system';
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  severity: 'low' | 'medium' | 'high';
}

export interface ActiveSymptom {
  id: string;
  symptomId: string;
  severity: number;
  message: string;
  recommendedLesson: string;
  timestamp: any;
  detectedAmount?: number;
}

export interface UserStats {
  username: string;
  email: string;
  id: string;
  bio: string;
  profilePicture: string | null;
  streak: number;
  level: number;
  isPremium: boolean;
  isAdmin: boolean;
  role: string;
  isVerified: boolean;
  dailyAiQuestionsCount: number;
  lastAiQuestionDate: string | null;
  completedLessonIds: string[];
  unlockedToolIds: string[]; // New: Tracks tools earned through education
  lastActiveDate: string | null;
  totalCorrectAnswers: number;
  perfectLessons: number;
  gems: number;
  archetypeId: string | null;
  archetypeScores: ArchetypeStats;
  demographics?: Demographics;
  hasCompletedTutorial: boolean;
  notifications: SmartNotification[];
  purchasedTemplateIds: string[];
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: 'asset' | 'liability';
  category: 'cash' | 'investment' | 'property' | 'debt' | 'mortgage' | 'car-loan' | 'student-loan' | 'student' | 'credit-card' | 'credit' | 'credit card' | 'loan' | 'overdraft' | 'line of credit' | 'general-loan' | 'crypto' | 'other';
  balance: number;
  interestRate?: number;
  monthlyPayment?: number;
  yearsRemaining?: number;
  nextDueDate?: string;
  isLinked?: boolean;
  provider?: string;
  taxType?: 'roth' | 'traditional' | 'taxable';
  plaid_account_id?: string;
}

export interface NetWorthData {
  accounts: FinancialAccount[];
  lastSynced: string;
  retirementGoal?: {
    targetAmount: number;
    targetAge: number;
    currentAge: number;
  };
}

export type ToolArchetype = 'allocator' | 'accelerator' | 'leak-finder' | 'projector' | 'stress-test' | 'fee-hunter';

export interface Template {
  id: string;
  lessonId: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  category: string;
  toolType: ToolArchetype;
}

export interface Bundle {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  templateIds: string[];
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'Wealth' | 'Defense' | 'Consistency';
  requirements: {
    bronze: number;
    silver: number;
    gold: number;
    hof: number;
  };
  statKey: keyof UserStats | 'unit_u1' | 'unit_u2' | 'unit_u3' | 'unit_u4';
}

export type ViewType = 'dashboard' | 'lesson' | 'profile' | 'leaderboard' | 'archetype-test' | 'chat' | 'wealth' | 'upgrade-checkout' | 'admin' | 'demographics' | 'tutorial' | 'profile-toolbox' | 'complete-profile';

export interface AppState {
  user: UserStats | null;
  accounts: Account[];
  isLoggedIn: boolean;
  netWorth: NetWorthData;
  activeSymptoms: ActiveSymptom[];
  currentView: ViewType;
  activeLesson: Lesson | null;
  selectedUnitId: string;
  selectedDifficulty: Difficulty;
  activeMode: 'learn' | 'play';
  selectedToolId: string | null;
  activeSymptomId: string | null;
  rules: CategorizationRule[];
}

export interface Symptom {
  id: string;
  name: string;
  severity: 1 | 2 | 3 | 4 | 5;
  description: string;
  icon: string;
  remissionCriteria: string;
  category: string;
  module: 'Budgeting' | 'Credit' | 'Retirement' | 'Wealth';
  triggerField: string;
  triggerOperator: '>' | '<' | '==' | '!=' | 'contains';
  triggerThreshold: number | string;
  finnyConsultTitle: string;
  finnyConsultScript: string;
  symptomExplanation?: string;
  prescribedLessonId: string;
  unlockToolId: string;
  remedyAction: string;
  badgeId: string;
}

export interface Challenge {
  id: string;
  symptom_id: string;
  title: string;
  description: string;
}

export interface Tool {
  id: string;
  symptom_id: string;
  title: string;
  description: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // ISO date string
  category: 'savings' | 'debt-payoff' | 'investment' | 'other';
  status: 'active' | 'completed' | 'abandoned';
  // Debt specific fields
  interestRate?: number;
  minimumMonthlyPayment?: number;
  description?: string; // New field for user explanation
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  percentage?: number; // Optional percentage of income
  period: 'monthly' | 'weekly';
  current_actual?: number;
}

export interface CategorizationRule {
  id: string;
  merchantPattern: string; // Regex or simple string match
  targetCategory: string;
  description: string;
}

export interface Transaction {
  id: string;
  plaid_transaction_id: string;
  amount: number;
  date: string;
  category: string;
  merchant_name: string;
  user_id: string;
  plaid_account_id?: string;
  is_interest_payment?: boolean;
  entry_type?: 'income' | 'expense' | 'debt_service' | 'investment';
  category_primary?: string;
  category_detailed?: string;
}
