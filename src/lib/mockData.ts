export const mockWealthData = [
  { id: '1', name: 'Primary Checking', type: 'asset', category: 'cash', balance: 5000, provider: 'Chase' },
  { id: '2', name: 'High Yield Savings', type: 'asset', category: 'cash', balance: 25000, provider: 'Ally' },
  { id: '3', name: '401k Retirement', type: 'asset', category: 'investment', balance: 150000, provider: 'Fidelity' },
  { id: '4', name: 'Credit Card', type: 'liability', category: 'credit-card', balance: 1200, provider: 'Amex' },
  { id: '5', name: 'Student Loan', type: 'liability', category: 'debt', balance: 35000, provider: 'Nelnet' },
];

export const mockDiagnosticLogs = [
  { id: '1', timestamp: new Date().toISOString(), message: 'High burn rate detected', severity: 2 },
  { id: '2', timestamp: new Date().toISOString(), message: 'Low savings pulse', severity: 3 },
  { id: '3', timestamp: new Date().toISOString(), message: 'Debt pressure increasing', severity: 2 },
];

export const mockUserData = {
  CheckingBalance: 15000,
  BufferAmount: 6000,
  BankName: 'Chase',
  CardName: 'Sapphire Preferred',
  BalanceAmount: 4500,
  DailyInterest: 2.15,
  TotalSavings: 850,
  SmallBump: 50,
  Months: 12,
  MonthlyExpenses: 5000,
  TargetValue: 15000,
  LeakedAmount: 320,
  PrimaryCard: 'Amex Gold',
  TransactionCount: 14,
  TotalAmount: 1200,
  TaxSavings: 300,
  CashAmount: 10000,
  InflationRate: 3.2,
  BrokerageName: 'Fidelity',
  SubscriptionName: 'Adobe Creative Cloud',
  MonthlyCost: 52,
  Category: 'Streaming',
  UnclaimedDeductions: 500,
  InvestmentReturnRate: 2,
  InterestRate: 0,
  CreditCardInterestRate: 18,
  EmergencyFundMonths: 0.5,
  InactiveSubscriptionsCount: 2
};
