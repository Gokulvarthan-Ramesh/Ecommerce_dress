import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { WalletService } from '../services/walletService';
import { ApiResponse } from '../utils/response';

export class WalletController {
  static async getWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const walletDetails = await WalletService.getWalletDetails(userId);
      ApiResponse.success(res, { balance: walletDetails.balance });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet transaction ledger
   */
  static async getWalletTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const walletDetails = await WalletService.getWalletDetails(userId);
      ApiResponse.success(res, walletDetails.transactions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get referral performance and invite details
   */
  static async getReferralInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
      });

      const referrals = await prisma.referral.findMany({
        where: { referrerId: userId },
        include: {
          referee: {
            select: { name: true, createdAt: true },
          },
          rewards: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const totalEarned = referrals.reduce((sum, r) => {
        const rewardSum = r.rewards.reduce((rSum, reward) => rSum + Number(reward.amount), 0);
        return sum + rewardSum;
      }, 0);

      ApiResponse.success(res, {
        referralCode: user?.referralCode,
        totalEarned,
        successfulReferrals: referrals.filter((r) => r.status === 'CREDITED').length,
        pendingReferrals: referrals.filter((r) => r.status === 'PENDING' || r.status === 'ELIGIBLE').length,
        referralList: referrals,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate a referral code before registration
   */
  static async validateReferralCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { referral_code } = req.body;

      if (!referral_code) {
        ApiResponse.success(res, { valid: false, message: 'Referral code is required' });
        return;
      }

      const referrer = await prisma.user.findUnique({
        where: { referralCode: referral_code },
        select: { id: true, name: true },
      });

      if (!referrer) {
        ApiResponse.success(res, { valid: false, message: 'Invalid referral code' });
        return;
      }

      ApiResponse.success(res, { valid: true, referrerName: referrer.name });
    } catch (error) {
      next(error);
    }
  }
}
