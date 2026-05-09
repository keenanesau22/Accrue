import { supabase } from '../lib/supabase';
import { SecureVault } from './secureVault';
import { triggerNotification } from './notificationService';

/**
 * Finny's Diagnostic Engine - Forensic Isolation & Remission Edition
 * Implements strict data insulation and categorical benchmarking with automatic cleanup.
 */
export const diagnoseUserVitals = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const uid = user.id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateString = thirtyDaysAgo.toISOString().split('T')[0];

  try {
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', uid)
      .gte('date', dateString);

    if (txError) throw txError;

    let interestSum = 0;

    transactions?.forEach((tx) => {
      SecureVault.maskIdentifier(tx.merchant || 'Institutional_Node_Unknown');
      SecureVault.maskIdentifier(tx.description || 'Transaction_Trace_Masked');
      
      const category = (tx.category || '').toLowerCase();
      if (category.includes('interest')) {
        interestSum += (tx.amount || 0);
      }
    });

    const { data: symptom, error: symError } = await supabase
      .from('active_symptoms')
      .select('*')
      .eq('user_id', uid)
      .eq('symptom_id', 'INTEREST_INFLAMMATION')
      .single();

    if (interestSum > 50) {
      if (!symptom) {
        await triggerNotification(uid, 'Interest Hemorrhage Detected', 'Your interest payments are too high. Check the Diagnostic Center.', 'high');
      }
      
      await supabase
        .from('active_symptoms')
        .upsert({
          user_id: uid,
          symptom_id: 'INTEREST_INFLAMMATION',
          severity: 3, 
          message: `Total interest paid exceeds safety threshold. Forensic aggregate calculation: $${interestSum.toFixed(2)}.`,
          recommended_lesson: 'u2-l1',
          timestamp: new Date().toISOString(),
          detected_amount: interestSum,
          last_scan_date: new Date().toISOString(),
          forensic_status: 'ISOLATED'
        });
      
      console.log(`[Finny] Diagnostic: Threshold breach detected in interest category.`);
    } else if (symptom) {
      await supabase
        .from('active_symptoms')
        .delete()
        .eq('user_id', uid)
        .eq('symptom_id', 'INTEREST_INFLAMMATION');
      console.log(`[Finny] Remission Confirmed: Interest Inflammation resolved.`);
    }
  } catch (error) {
    console.error("Diagnostic error:", error);
  }
};
