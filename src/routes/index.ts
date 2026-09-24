import { Router } from 'express';
import authRoutes from './authRoutes';
import productRoutes from './productRoutes';
import cartRoutes from './cartRoutes';
import orderRoutes from './orderRoutes';
import walletRoutes from './walletRoutes';
import referralRoutes from './referralRoutes';
import notificationRoutes from './notificationRoutes';
import webhookRoutes from './webhookRoutes';
import adminRoutes from './adminRoutes';
import categoryRoutes from './categoryRoutes';
import configRoutes from './configRoutes';
import { ConfigController } from '../controllers/configController';
import reviewRoutes from './reviewRoutes';
import wishlistRoutes from './wishlistRoutes';
import deliveryRoutes from './deliveryRoutes';
import masterRoutes from './masterRoutes';
import promoRoutes from '../modules/promo/promo.routes';

import addressRoutes from './addressRoutes';
import homeRoutes from './homeRoutes';
import shopRoutes from './shopRoutes';
import vendorRoutes from './vendorRoutes';
import appRoutes from './appRoutes';
import { prisma } from '../config/db';

import { ApiResponse } from '../utils/response';

const router = Router();

router.use('/home', homeRoutes);
router.use('/config', configRoutes);
router.use('/app', appRoutes);
router.get('/banners', ConfigController.getActiveBanners);

// Customer active coupons list (for cart & checkout drawers)
router.get('/coupons', async (_req, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        minOrderAmount: true,
        maxDiscount: true,
        expiresAt: true,
      },
      orderBy: { minOrderAmount: 'asc' },
    });
    ApiResponse.success(res, coupons);
  } catch (error) {
    next(error);
  }
});

router.use('/auth', authRoutes);
router.use('/addresses', addressRoutes);
router.use('/shops', shopRoutes);
router.use('/vendor', vendorRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/wallet', walletRoutes);
router.use('/referrals', referralRoutes);
router.use('/notifications', notificationRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/admin/masters', masterRoutes);
router.use('/admin', adminRoutes);
router.use('/reviews', reviewRoutes);
router.use('/wishlist', wishlistRoutes);
import iconRoutes from './iconRoutes';

router.use('/delivery', deliveryRoutes);
router.use('/icons', iconRoutes);
router.use(promoRoutes);

export default router;
