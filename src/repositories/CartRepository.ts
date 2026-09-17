import { prisma } from '../config/db';

export const CartRepository = {
  ...prisma.cartItem,
  getCart(userId: string) {
    return prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  },
};
