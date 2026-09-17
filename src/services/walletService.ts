import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { WalletTxType, WalletTxCategory, Prisma } from '@prisma/client';

export class WalletService {
  /**
   * Get or create wallet for a user
   */
  static async getOrCreateWallet(userId: string) {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: new Prisma.Decimal(0.0),
        },
      });
    }

    return wallet;
  }

  /**
   * Credit user's wallet and log transaction
   */
  static async creditWallet(params: {
    userId: string;
    amount: number;
    category: WalletTxCategory;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }) {
    const { userId, amount, category, description, referenceType, referenceId } = params;
    if (amount <= 0) {
      throw new AppError('Credit amount must be greater than 0');
    }

    return prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId,
            balance: new Prisma.Decimal(0.0),
          },
        });
      }

      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + amount;

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: new Prisma.Decimal(balanceAfter) },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: new Prisma.Decimal(amount),
          balanceBefore: new Prisma.Decimal(balanceBefore),
          balanceAfter: new Prisma.Decimal(balanceAfter),
          type: WalletTxType.CREDIT,
          category,
          referenceType,
          referenceId,
          description,
        },
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  /**
   * Debit user's wallet with concurrency safety
   */
  static async debitWallet(params: {
    userId: string;
    amount: number;
    category: WalletTxCategory;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }) {
    const { userId, amount, category, description, referenceType, referenceId } = params;
    if (amount <= 0) {
      throw new AppError('Debit amount must be greater than 0');
    }

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new AppError('Insufficient wallet balance for this transaction');
      }

      const balanceBefore = Number(wallet.balance);
      if (balanceBefore < amount) {
        throw new AppError('Insufficient wallet balance for this transaction');
      }

      const balanceAfter = balanceBefore - amount;

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: new Prisma.Decimal(balanceAfter) },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: new Prisma.Decimal(amount),
          balanceBefore: new Prisma.Decimal(balanceBefore),
          balanceAfter: new Prisma.Decimal(balanceAfter),
          type: WalletTxType.DEBIT,
          category,
          referenceType,
          referenceId,
          description,
        },
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  /**
   * Get wallet balance and transaction history
   */
  static async getWalletDetails(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      balance: Number(wallet.balance),
      transactions,
    };
  }
}
