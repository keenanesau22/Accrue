export interface MockAccount {
  id: string;
  name: string;
  type: 'Depository' | 'Investment' | 'Liability' | 'Crypto';
  balance: number;
  interestRate?: number;
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  { id: 'dep-1', name: 'Checking', type: 'Depository', balance: 2450 },
  { id: 'dep-2', name: 'Savings', type: 'Depository', balance: 12000 },
  { id: 'inv-1', name: '401k', type: 'Investment', balance: 45000 },
  { id: 'inv-2', name: 'Individual Brokerage', type: 'Investment', balance: 8200 },
  { id: 'lia-1', name: 'Mortgage', type: 'Liability', balance: 350000, interestRate: 6.5 },
  { id: 'lia-2', name: 'Student Loan', type: 'Liability', balance: 22000, interestRate: 4.5 },
  { id: 'cry-1', name: 'Coinbase Wallet', type: 'Crypto', balance: 0.5 * 90000 }, // Mock BTC price
];
