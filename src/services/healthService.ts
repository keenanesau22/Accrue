import { Symptom, Account } from '../types';

/**
 * The "Brain" of Accrue. 
 * This function scans the user's linked accounts against the Symptom Dictionary.
 */
export const runFinancialHealthCheck = (
  accounts: Account[], 
  dictionary: Symptom[]
): Symptom[] => {
  const detectedSymptoms: Symptom[] = [];

  if (!accounts || !dictionary) return [];

  dictionary.forEach((symptom) => {
    // Defensive check: Skip if trigger is missing
    if (!symptom) return; 

    const { triggerField: field, triggerOperator: operator, triggerThreshold: threshold } = symptom;
    
    // Check if ANY account triggers this symptom
    const isTriggered = accounts.some(account => {
      // Get the value from the account (e.g., account['balance'])
      const accountValue = (account as any)[field];
      
      if (accountValue === undefined || accountValue === null) return false;

      // Execute the logic gate
      if (operator === '>') {
        return Number(accountValue) > Number(threshold);
      } else if (operator === '<') {
        return Number(accountValue) < Number(threshold);
      }
      return false;
    });

    if (isTriggered) {
      detectedSymptoms.push(symptom);
    }
  });

  // Sort by severity (Critical first)
  return detectedSymptoms.sort((a, b) => b.severity - a.severity);
};

export const calculateSymptomProgress = (symptom: Symptom, accounts: Account[]): number => {
  const account = accounts.find(a => a.id === symptom.triggerField || a.name.toLowerCase() === symptom.triggerField.toLowerCase());
  if (!account) return 0;

  const value = account.balance;
  const threshold = Number(symptom.triggerThreshold);

  if (symptom.triggerOperator === '<') {
    // e.g., balance < 1000. Progress = (1000 - balance) / 1000 * 100
    return Math.min(100, Math.max(0, ((threshold - value) / threshold) * 100));
  } else if (symptom.triggerOperator === '>') {
    // e.g., balance > 1000. Progress = (balance / 1000) * 100
    return Math.min(100, Math.max(0, (value / threshold) * 100));
  }
  return 0;
};
