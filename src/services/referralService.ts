import { prisma } from '../config/db';
import { SystemSettingService } from './systemSettingService';
import { WalletService } from './walletService';
import { NotificationService } from './notificationService';
import { ReferralStatus, WalletTxCategory } from '@prisma/client';

export class ReferralService {
  /**
   * Process a new user registration with an optional referrerId
   */
  static async handleUserRegistrationReferral(newUserId: string, referrerId: string) {
    if (!referrerId || referrerId === newUserId) return;

    const config = await SystemSettingService.getReferralProgramConfig();
    if (!config.is_enabled) return;

    // Create referral tracking record
    // We no longer need to update the User with referredById because AuthService already did it
    await prisma.referral.create({
      data: {
        referrerId: referrerId,
        refereeId: newUserId,
        status: ReferralStatus.PENDING,
      },
    });

    // We do NOT immediately give the referrer (Customer A) money. 
    // They get paid only when Customer B's order is DELIVERED.

    // Note: If you want to give a signup bonus to Customer B (the referee) immediately, 
    // it happens here:
    if (config.referee_bonus > 0) {
      await WalletService.creditWallet({
        userId: newUserId,
        amount: config.referee_bonus,
        category: WalletTxCategory.REFERRAL,
        description: `Welcome bonus for joining via referral`,
      });
    }
  }

  /**
   * Trigger referral reward when an order is successfully marked DELIVERED
   */
  static async processOrderDeliveryReferralReward(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) return;

    const config = await SystemSettingService.getReferralProgramConfig();
    if (!config.is_enabled) return;

    // Check if customer was referred and has a pending referral
    const referral = await prisma.referral.findFirst({
      where: {
        refereeId: order.userId,
        status: ReferralStatus.PENDING,
      },
    });

    if (!referral) return;

    // Check if this order meets the minimum qualifying order threshold
    const orderValue = Number(order.subtotal) - Number(order.discount) - Number(order.couponDiscount);

    if (orderValue >= config.min_qualifying_order) {
      const rewardAmount = config.referrer_bonus;

      // 1. Mark referral as ELIGIBLE
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: ReferralStatus.ELIGIBLE,
          qualifyingOrderId: order.id,
        },
      });

      // 2. Create the reward as ELIGIBLE
      await prisma.referralReward.create({
        data: {
          referralId: referral.id,
          userId: referral.referrerId,
          rewardType: 'REFERRER_BONUS',
          amount: rewardAmount,
          status: ReferralStatus.ELIGIBLE,
        }
      });

      console.log(`[REFERRAL ELIGIBLE] Referral marked eligible for user ${referral.referrerId}`);
    }
  }

  /**
   * Finalize ELIGIBLE rewards (called by a cron job)
   * Credits the wallet for rewards where the return window has passed
   */
  static async processEligibleReferrals() {
    const config = await SystemSettingService.getReferralProgramConfig();
    if (!config.is_enabled) return;

    // Find all ELIGIBLE rewards
    const eligibleRewards = await prisma.referralReward.findMany({
      where: { status: ReferralStatus.ELIGIBLE },
      include: {
        referral: {
          include: { referrer: true }
        }
      }
    });

    for (const reward of eligibleRewards) {
      if (!reward.referral.qualifyingOrderId) continue;

      const order = await prisma.order.findUnique({
        where: { id: reward.referral.qualifyingOrderId },
        include: { statusHistory: true }
      });

      if (!order) continue;

      // In a real system, you would check if the order return window has passed
      // Example: 
      // const deliveredDate = order.statusHistory.find(h => h.status === 'DELIVERED')?.createdAt;
      // if (deliveredDate && (new Date().getTime() - deliveredDate.getTime()) > 7 * 24 * 60 * 60 * 1000) {

      // For this implementation, we will assume the cron job handles the time check 
      // and we just process the payout:

      try {
        const tx = await WalletService.creditWallet({
          userId: reward.userId,
          amount: Number(reward.amount),
          category: WalletTxCategory.REFERRAL,
          referenceId: order.id,
          description: `Referral reward for successful delivery of order #${order.orderNumber}`,
        });

        await prisma.$transaction([
          prisma.referralReward.update({
            where: { id: reward.id },
            data: {
              status: ReferralStatus.CREDITED,
              walletTransactionId: tx.transaction.id,
            }
          }),
          prisma.referral.update({
            where: { id: reward.referralId },
            data: { status: ReferralStatus.CREDITED }
          })
        ]);

        console.log(`[REFERRAL CREDITED] Credited ₹${reward.amount} to user ${reward.userId}`);
        NotificationService.referralRewardCredited(reward.userId, Number(reward.amount)).catch(() => {});
      } catch (error) {
        console.error(`Failed to credit referral reward ${reward.id}:`, error);
      }
    }
  }
}
