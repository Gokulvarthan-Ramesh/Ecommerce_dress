import { prisma } from '../config/db';

export const WalletRepository = {
  ...prisma.wallet,
  createTransaction: prisma.walletTransaction.create,
  getTransactions: prisma.walletTransaction.findMany,
};
