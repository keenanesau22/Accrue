import { supabase } from '../lib/supabase';
import { SmartNotification } from '../types';

export const triggerNotification = async (uid: string, title: string, message: string, severity: 'low' | 'medium' | 'high') => {
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('profile')
    .eq('id', uid)
    .single();

  if (fetchError || !user) {
    console.error("Error fetching user for notification:", fetchError);
    return;
  }

  const notification: SmartNotification = {
    id: Date.now().toString(),
    type: 'system',
    title,
    message,
    timestamp: Date.now(),
    isRead: false,
    severity
  };

  const notifications = user.profile.notifications || [];
  notifications.push(notification);

  const { error: updateError } = await supabase
    .from('users')
    .update({ profile: { ...user.profile, notifications } })
    .eq('id', uid);
  
  if (updateError) {
    console.error("Error updating notifications:", updateError);
    return;
  }
  
  console.log(`[Finny Notification] ${title}: ${message}`);
};
