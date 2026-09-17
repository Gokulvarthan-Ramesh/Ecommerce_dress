import { prisma } from '../config/db';

export const UserRepository = {
  ...prisma.user,

  saveOtp(phone: string, otpHash: string, expiresAt: Date) {
    return prisma.otpVerification.create({
      data: { phone, otpHash, expiresAt },
    });
  },

  getLatestOtp(phone: string) {
    return prisma.otpVerification.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
  },

  updateOtp(id: string, data: any) {
    return prisma.otpVerification.update({ where: { id }, data });
  },
};
