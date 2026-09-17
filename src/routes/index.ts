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

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/wallet', walletRoutes);
router.use('/referrals', referralRoutes);
router.use('/notifications', notificationRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/admin', adminRoutes);

export default router;
