import { prisma } from '../config/db';
import { OrderStatus } from '@prisma/client';

export class OfferService {
  /**
   * Evaluates all active auto-apply offers and returns the best one for the user
   */
  static async calculateDiscount(userId: string, subtotal: number): Promise<{
    discountAmount: number;
    appliedOfferId: string | null;
  }> {
    let bestDiscount = 0;
    let appliedOfferId: string | null = null;

    const pastOrdersCount = await prisma.order.count({
      where: { userId, status: { not: OrderStatus.CANCELLED } },
    });

    const activeOffers = await prisma.offer.findMany({
      where: {
        isActive: true,
        OR: [
          { startAt: null },
          { startAt: { lte: new Date() } }
        ],
        AND: [
          { OR: [{ endAt: null }, { endAt: { gte: new Date() } }] }
        ]
      }
    });

    for (const offer of activeOffers) {
      if (offer.firstOrderOnly && pastOrdersCount > 0) continue;
      if (subtotal < Number(offer.minimumOrderAmount)) continue;

      const userUsages = await prisma.offerUsage.count({ where: { offerId: offer.id, userId } });
      if (userUsages >= offer.perUserLimit) continue;
      if (offer.usageLimit && offer.timesUsed >= offer.usageLimit) continue;

      let discountAmount = 0;
      if (offer.type === 'PERCENTAGE') {
        discountAmount = (subtotal * Number(offer.value)) / 100;
      } else {
        discountAmount = Number(offer.value);
      }

      if (discountAmount > bestDiscount) {
        bestDiscount = discountAmount;
        appliedOfferId = offer.id;
      }
    }

    return { discountAmount: bestDiscount, appliedOfferId };
  }
}
