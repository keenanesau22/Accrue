export interface Badge {
  id: string;
  name: string;
  icon: string;
  level: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  count: number;
}

export interface LibrarySymptom {
  id: string;
  name: string;
  category: 'Liquidity' | 'Debt' | 'Risk' | 'Tax' | 'Growth' | 'Lifestyle';
  severity: number; // 1-10
  description: string;
  symptomExplanation: string;
  icon: string;
  lessonTitle: string;
  toolName: string;
  dataTrigger: string;
  rewardPoints: number;
  difficultyMultiplier: number;
  badgeId: string;
  remissionCriteria: {
    targetValue: number;
    currentValue: number;
    principleFormula: string;
  };
  resolutionType: 'Instant' | 'Accretive';
  actionSteps: (data: any) => string[];
}

export const updateSymptomProgress = (symptomId: string, increment: number) => {
  const symptom = SYMPTOM_LIBRARY.find(s => s.id === symptomId);
  if (symptom) {
    symptom.remissionCriteria.currentValue += increment;
  }
};

export const SYMPTOM_LIBRARY: LibrarySymptom[] = [
  {
    id: 'liq-001',
    name: 'Lazy Cash',
    category: 'Liquidity',
    severity: 4,
    description: 'Cash sitting in 0% interest checking.',
    symptomExplanation: 'Your cash reserves are sitting idle in a low-interest account at {{bankName}}. Moving these funds into a high-yield vehicle isn’t just about math—it’s about ensuring your money works as hard as you do.',
    icon: '💰',
    lessonTitle: 'Optimizing Your Cash',
    toolName: 'High-Yield Switcher',
    dataTrigger: 'cash_balance > 5000 && interest_rate == 0',
    rewardPoints: 100,
    difficultyMultiplier: 1.0,
    badgeId: 'liq-badge-001',
    remissionCriteria: { targetValue: 0, currentValue: 9000, principleFormula: 'Checking Balance - (Monthly Bills * 1.5)' },
    resolutionType: 'Instant',
    actionSteps: (data: any) => {
      if (!data) return ['Data loading...'];
      return [
        `Transfer the $${data?.CheckingBalance ?? 0} sitting idle in your ${data?.BankName ?? 'Primary'} checking account.`,
        `Open a High-Yield Savings Account (HYSA) to capture an estimated $${data?.AnnualInterest ?? 0} in lost interest.`,
        `Set an automated sweep for any balance exceeding your $${data?.BufferAmount ?? 0} threshold.`
      ];
    }
  },
  {
    id: 'debt-001',
    name: 'Interest Leak',
    category: 'Debt',
    severity: 9,
    description: 'Paying >15% APR on credit cards.',
    symptomExplanation: 'High-interest debt at {{apr}}% APR is a silent drain on your financial future. Tackling this aggressively isn’t just about the balance—it’s about reclaiming your cash flow and peace of mind.',
    icon: '💳',
    lessonTitle: 'Strategies for Debt Paydown',
    toolName: 'Balance Transfer Engine',
    dataTrigger: 'credit_card_interest_rate > 15',
    rewardPoints: 250,
    difficultyMultiplier: 1.5,
    badgeId: 'debt-badge-001',
    remissionCriteria: { targetValue: 0, currentValue: 4500, principleFormula: 'Total Debt Balances with APR > 7%' },
    resolutionType: 'Accretive',
    actionSteps: (data: any) => {
      if (!data) return ['Data loading...'];
      return [
        `Redirect $${data?.TotalAmount ?? 0} from your surplus to the ${data?.CardName ?? 'Credit Card'} balance to stop the $${data?.DailyInterest ?? 0} daily leak.`,
        `Apply for a 0% APR transfer for your $${data?.BalanceAmount ?? 0} debt to save $${data?.TotalSavings ?? 0} over 18 months.`,
        `Increase your monthly payment by $${data?.SmallBump ?? 0} to shave ${data?.Months ?? 0} months off your repayment timeline.`
      ];
    }
  },
  {
    id: 'risk-001',
    name: 'Safety Net Void',
    category: 'Risk',
    severity: 10,
    description: 'Emergency fund < 1 month expenses.',
    symptomExplanation: 'It looks like your cash reserves are at {{balance}}, which is only {{percentage}}% of your monthly overhead. Building this buffer isn’t just about math—it’s about giving you the breathing room to make bold moves without fear.',
    icon: '🛡️',
    lessonTitle: 'Building Your Safety Net',
    toolName: 'Rainy Day Builder',
    dataTrigger: 'emergency_fund_months < 1',
    rewardPoints: 300,
    difficultyMultiplier: 2.0,
    badgeId: 'risk-badge-001',
    remissionCriteria: { targetValue: 12000, currentValue: 2000, principleFormula: 'Mock Monthly Expenses * 6' },
    resolutionType: 'Accretive',
    actionSteps: (data: any) => {
      if (!data) return ['Data loading...'];
      return [
        `Allocate $${data?.MonthlyExpenses ?? 0} to your Safety Net to reach your 6-month goal of $${data?.TargetValue ?? 0} by ${data?.Months ?? 6} months.`,
        `Identify $${data?.LeakedAmount ?? 0} in non-essential 'Lifestyle' spending this month to accelerate your protection.`,
        `Enable 'Round-Ups' on your ${data?.PrimaryCard ?? 'Primary Card'} to passively contribute to this fund.`
      ];
    }
  },
  {
    id: 'tax-001',
    name: 'Deduction Ghosting',
    category: 'Tax',
    severity: 6,
    description: 'Missed business expenses.',
    symptomExplanation: 'Unclaimed business expenses of {{amount}} are essentially leaving money on the table. Organizing these deductions isn’t just about compliance—it’s about maximizing your hard-earned profit.',
    icon: '📊',
    lessonTitle: 'Tax-Efficient Business Practices',
    toolName: 'Write-off Scanner',
    dataTrigger: 'unclaimed_deductions > 0',
    rewardPoints: 150,
    difficultyMultiplier: 1.2,
    badgeId: 'tax-badge-001',
    remissionCriteria: { targetValue: 0, currentValue: 1200, principleFormula: 'Sum of Uncategorized 1099/Business Expenses' },
    resolutionType: 'Instant',
    actionSteps: (data: any) => {
      if (!data) return ['Data loading...'];
      return [
        `Review the ${data?.TransactionCount ?? 0} uncategorized transactions from ${data?.LastMonth ?? 'last month'} that look like business expenses.`,
        `Reclassify $${data?.TotalAmount ?? 0} in potential write-offs to lower your estimated tax liability by $${data?.TaxSavings ?? 0}.`,
        `Link your ${data?.AccountingSoftware ?? 'Accounting Software'} to automate this forensic scan weekly.`
      ];
    }
  },
  {
    id: 'growth-001',
    name: 'Inflation Erosion',
    category: 'Growth',
    severity: 7,
    description: 'Investments returning < 3%.',
    symptomExplanation: 'Low-yield investments returning {{returnRate}}% can lose purchasing power over time. Optimizing your portfolio isn’t just about returns—it’s about protecting your future lifestyle from the silent impact of inflation.',
    icon: '📈',
    lessonTitle: 'The Power of Compounding',
    toolName: 'Real-Return Calculator',
    dataTrigger: 'investment_return_rate < 3',
    rewardPoints: 200,
    difficultyMultiplier: 1.3,
    badgeId: 'growth-badge-001',
    remissionCriteria: { targetValue: 0.1, currentValue: -1.5, principleFormula: 'Average Portfolio Yield - Current Inflation Rate (3.2%)' },
    resolutionType: 'Accretive',
    actionSteps: (data: any) => {
      if (!data) return ['Data loading...'];
      return [
        `Move $${data?.CashAmount ?? 0} from cash into a diversified index fund to beat the current ${data?.InflationRate ?? 0}% inflation rate.`,
        `Rebalance your ${data?.BrokerageName ?? 'Brokerage'} portfolio to increase your real return by an estimated ${data?.Percentage ?? 0}%.`,
        `Set up a recurring $${data?.Amount ?? 0} buy to utilize dollar-cost averaging.`
      ];
    }
  },
  {
    id: 'life-001',
    name: 'Subscription Parasite',
    category: 'Lifestyle',
    severity: 3,
    description: 'Inactive recurring debits.',
    symptomExplanation: 'Inactive subscriptions are small leaks that add up quickly. You currently have {{count}} subscriptions that aren\'t adding value. Pruning these expenses isn’t just about saving a few dollars—it’s about being intentional with where your capital flows.',
    icon: '✂️',
    lessonTitle: 'Mindful Spending Habits',
    toolName: 'Silo-Cutter',
    dataTrigger: 'inactive_subscriptions_count > 0',
    rewardPoints: 50,
    difficultyMultiplier: 1.0,
    badgeId: 'life-badge-001',
    remissionCriteria: { targetValue: 5, currentValue: 15, principleFormula: 'Sum of Monthly Subscriptions / Total Monthly Income' },
    resolutionType: 'Instant',
    actionSteps: (data: any) => {
      if (!data) return ['Data loading...'];
      return [
        `Cancel the ${data?.SubscriptionName ?? 'Subscription'} 'Silo' immediately to save $${data?.MonthlyCost ?? 0} per month.`,
        `Review ${data?.Count ?? 0} recurring charges that have had zero engagement in the last 60 days.`,
        `Consolidate your ${data?.Category ?? 'Streaming'} subscriptions to save an average of $${data?.Savings ?? 0} annually.`
      ];
    }
  }
];
