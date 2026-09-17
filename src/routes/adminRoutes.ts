import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminGuard';

const router = Router();

// Protect all admin endpoints
router.use(authenticateToken, requireAdmin);

// Dashboard KPI Metrics & Customers
router.get('/metrics', AdminController.getDashboardMetrics);
router.get('/customers/:id', AdminController.getCustomerDetails);

// Catalog Management
router.post('/categories', AdminController.saveCategory);
router.patch('/categories/:id/status', AdminController.toggleCategoryStatus);
router.delete('/categories/:id', AdminController.deleteCategory);
router.post('/products', AdminController.saveProductWithVariants);
router.patch('/variants/:variantId/stock', AdminController.updateVariantStock);

// Order Fulfillment & Status
router.get('/orders', AdminController.getOrders);
router.get('/orders/:id', AdminController.getOrderDetails);
router.patch('/orders/:id/status', AdminController.updateOrderStatus);

// Payment & Refund Operations
router.post('/refunds', AdminController.triggerCashfreeRefund);

// Wallet Management
router.post('/wallet/adjust', AdminController.adjustCustomerWallet);

// Live Dynamic System Settings (First order offer, Referral program, Shipping, COD)
router.get('/settings', AdminController.getSystemSettings);
router.put('/settings/:key', AdminController.updateSystemSetting);

// Offer Management
router.get('/offers', AdminController.getOffers);
router.post('/offers', AdminController.saveOffer);

export default router;
