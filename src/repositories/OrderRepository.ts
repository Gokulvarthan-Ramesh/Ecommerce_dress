import { prisma } from '../config/db';

export const OrderRepository = {
  ...prisma.order,
  findPayment: prisma.payment.findUnique,
  updatePayment: prisma.payment.update,
  createPayment: prisma.payment.create,
  createRefund: prisma.refund.create,
  findRefund: prisma.refund.findUnique,
};
