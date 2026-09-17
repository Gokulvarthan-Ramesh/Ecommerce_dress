import { ReferralService } from '../services/referralService';

/**
 * Process ELIGIBLE referral rewards and credit wallets.
 * This is the cron-safe wrapper around the service method.
 */
export async function processReferralRewards() {
  try {
    await ReferralService.processEligibleReferrals();
    console.log('[JOB] processReferralRewards: Completed');
  } catch (error) {
    console.error('[JOB] processReferralRewards: Failed', error);
  }
}
