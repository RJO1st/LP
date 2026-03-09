// lib/trialTracking.js - Trial Period Utilities
import { supabase } from './supabase';

/**
 * Initialize trial period for new parent
 * Called during signup
 */
export async function initializeTrial(parentId) {
  try {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30); // 30 days from now

    const { error } = await supabase
      .from('parents')
      .update({
        trial_end: trialEnd.toISOString(),
        subscription_status: 'trial'
      })
      .eq('id', parentId);

    if (error) throw error;

    console.log(`✅ Trial initialized for parent ${parentId}, expires: ${trialEnd}`);
    return { success: true, trialEnd };
  } catch (error) {
    console.error('Error initializing trial:', error);
    return { success: false, error };
  }
}

/**
 * Check if parent has active access (trial or subscription)
 */
export async function checkAccess(parentId) {
  try {
    const { data: parent, error } = await supabase
      .from('parents')
      .select('subscription_status, subscription_end, trial_end')
      .eq('id', parentId)
      .single();

    if (error) throw error;
    if (!parent) return { hasAccess: false, reason: 'parent_not_found' };

    const now = new Date();
    const trialEnd = parent.trial_end ? new Date(parent.trial_end) : null;
    const subscriptionEnd = parent.subscription_end ? new Date(parent.subscription_end) : null;

    // Check if trial is still active
    const trialActive = trialEnd && now <= trialEnd;

    // Check if subscription is active
    const subscriptionActive =
      parent.subscription_status === 'active' &&
      (!subscriptionEnd || now <= subscriptionEnd);

    const hasAccess = trialActive || subscriptionActive;

    return {
      hasAccess,
      isTrialActive: trialActive,
      isSubscriptionActive: subscriptionActive,
      trialEnd,
      subscriptionEnd,
      daysLeftInTrial: trialEnd ? Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)) : 0,
      subscriptionStatus: parent.subscription_status
    };
  } catch (error) {
    console.error('Error checking access:', error);
    return { hasAccess: false, error };
  }
}

/**
 * Get trial status for display in UI
 */
export async function getTrialStatus(parentId) {
  const accessInfo = await checkAccess(parentId);

  if (!accessInfo.hasAccess) {
    return {
      status: 'expired',
      message: 'Your trial has ended. Subscribe to continue.',
      ctaText: 'Subscribe Now',
      ctaLink: '/subscribe'
    };
  }

  if (accessInfo.isTrialActive && !accessInfo.isSubscriptionActive) {
    const daysLeft = accessInfo.daysLeftInTrial;
    return {
      status: 'trial',
      daysLeft,
      message: daysLeft === 0
        ? 'Your trial ends today!'
        : `${daysLeft} day${daysLeft > 1 ? 's' : ''} left in your trial`,
      ctaText: 'Subscribe to Continue',
      ctaLink: '/subscribe'
    };
  }

  if (accessInfo.isSubscriptionActive) {
    return {
      status: 'subscribed',
      message: 'Active subscription',
      subscriptionStatus: accessInfo.subscriptionStatus
    };
  }

  return {
    status: 'unknown',
    message: 'Please contact support'
  };
}

/**
 * Convert trial to paid subscription
 * Called after successful Stripe payment
 */
export async function convertTrialToSubscription(parentId, subscriptionData) {
  try {
    const subscriptionEnd = new Date(subscriptionData.current_period_end * 1000);

    const { error } = await supabase
      .from('parents')
      .update({
        subscription_status: 'active',
        subscription_end: subscriptionEnd.toISOString(),
        stripe_customer_id: subscriptionData.customer,
        stripe_subscription_id: subscriptionData.id,
        trial_end: null // Clear trial_end once converted
      })
      .eq('id', parentId);

    if (error) throw error;

    console.log(`✅ Trial converted to subscription for parent ${parentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error converting trial:', error);
    return { success: false, error };
  }
}

/**
 * Extend trial period (admin function)
 */
export async function extendTrial(parentId, additionalDays = 30) {
  try {
    const { data: parent } = await supabase
      .from('parents')
      .select('trial_end')
      .eq('id', parentId)
      .single();

    if (!parent) throw new Error('Parent not found');

    const currentTrialEnd = parent.trial_end ? new Date(parent.trial_end) : new Date();
    const newTrialEnd = new Date(currentTrialEnd);
    newTrialEnd.setDate(newTrialEnd.getDate() + additionalDays);

    const { error } = await supabase
      .from('parents')
      .update({ trial_end: newTrialEnd.toISOString() })
      .eq('id', parentId);

    if (error) throw error;

    console.log(`✅ Trial extended for parent ${parentId} by ${additionalDays} days`);
    return { success: true, newTrialEnd };
  } catch (error) {
    console.error('Error extending trial:', error);
    return { success: false, error };
  }
}

/**
 * Cancel subscription (keep access until end of period)
 */
export async function cancelSubscription(parentId) {
  try {
    const { error } = await supabase
      .from('parents')
      .update({
        subscription_status: 'canceled'
        // Keep subscription_end - they have access until then
      })
      .eq('id', parentId);

    if (error) throw error;

    console.log(`✅ Subscription canceled for parent ${parentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return { success: false, error };
  }
}

/**
 * Expire access (called by cron or webhook)
 */
export async function expireAccess(parentId) {
  try {
    const { error } = await supabase
      .from('parents')
      .update({
        subscription_status: 'expired'
      })
      .eq('id', parentId);

    if (error) throw error;

    console.log(`✅ Access expired for parent ${parentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error expiring access:', error);
    return { success: false, error };
  }
}

export default {
  initializeTrial,
  checkAccess,
  getTrialStatus,
  convertTrialToSubscription,
  extendTrial,
  cancelSubscription,
  expireAccess
};
