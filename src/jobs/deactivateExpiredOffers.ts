import { prisma } from '../config/db';

/**
 * Deactivate offers that have passed their endAt date.
 */
export async function deactivateExpiredOffers() {
  const now = new Date();

  const result = await prisma.offer.updateMany({
    where: {
      isActive: true,
      endAt: { lt: now, not: null },
    },
    data: { isActive: false },
  });

  if (result.count > 0) {
    console.log('[JOB] deactivateExpiredOffers: Deactivated ' + result.count + ' expired offers');
  }

  // Also deactivate expired coupons
  const couponResult = await prisma.coupon.updateMany({
    where: {
      isActive: true,
      expiresAt: { lt: now, not: null },
    },
    data: { isActive: false },
  });

  if (couponResult.count > 0) {
    console.log('[JOB] deactivateExpiredOffers: Deactivated ' + couponResult.count + ' expired coupons');
  }
}
