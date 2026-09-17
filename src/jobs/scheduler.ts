import cron from 'node-cron';
import { cancelExpiredPendingOrders } from './cancelExpiredOrders';
import { deactivateExpiredOffers } from './deactivateExpiredOffers';
import { processReferralRewards } from './processReferralRewards';

/**
 * Simple V1 scheduler using node-cron.
 * No Redis, no Kafka — just in-process cron that runs alongside the API.
 *
 * Schedule reference (5-field cron):
 *   ┌──────── minute (0-59)
 *   │ ┌────── hour (0-23)
 *   │ │ ┌──── day of month (1-31)
 *   │ │ │ ┌── month (1-12)
 *   │ │ │ │ ┌ day of week (0-7, 0 and 7 = Sunday)
 *   * * * * *
 */
export function startScheduler() {
  console.log('[SCHEDULER] Starting background jobs...');

  // Every 5 minutes: Cancel orders stuck in PENDING_PAYMENT > 30 min
  cron.schedule('*/5 * * * *', async () => {
    console.log('[SCHEDULER] Running: cancelExpiredPendingOrders');
    await cancelExpiredPendingOrders();
  });

  // Every 15 minutes: Deactivate expired offers and coupons
  cron.schedule('*/15 * * * *', async () => {
    console.log('[SCHEDULER] Running: deactivateExpiredOffers');
    await deactivateExpiredOffers();
  });

  // Every hour: Process eligible referral rewards
  cron.schedule('0 * * * *', async () => {
    console.log('[SCHEDULER] Running: processReferralRewards');
    await processReferralRewards();
  });

  console.log('[SCHEDULER] Background jobs registered:');
  console.log('  - cancelExpiredPendingOrders  (every 5 min)');
  console.log('  - deactivateExpiredOffers     (every 15 min)');
  console.log('  - processReferralRewards      (every hour)');
}
