import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { ShopController } from '../controllers/shopController';
import { ReviewController } from '../controllers/reviewController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminGuard';


const router = Router();

// Protect all admin endpoints
router.use(authenticateToken, requireAdmin);

// 1. Dashboard KPI Metrics
router.get('/metrics', AdminController.getDashboardMetrics);

// 2. Customer Management (CRUD)
router.get('/customers', AdminController.getCustomers);
router.get('/customers/:id', AdminController.getCustomerDetails);
router.post('/customers', AdminController.createCustomer);
router.put('/customers/:id', AdminController.updateCustomer);
router.patch('/customers/:id/status', AdminController.toggleCustomerStatus);
router.delete('/customers/:id', AdminController.deleteCustomer);

// 3. Category Management (CRUD)
router.get('/categories', AdminController.getCategories);
router.get('/categories/:id', AdminController.getCategoryById);
router.post('/categories', AdminController.saveCategory);
router.put('/categories/:id', AdminController.updateCategory);
router.patch('/categories/:id/status', AdminController.toggleCategoryStatus);
router.delete('/categories/:id', AdminController.deleteCategory);

// 4. Product Management (CRUD)
router.get('/products', AdminController.getProducts);
router.get('/products/:id', AdminController.getProductById);
router.post('/products', AdminController.saveProductWithVariants);
router.put('/products/:id', AdminController.updateProduct);
router.patch('/products/:id/status', AdminController.toggleProductStatus);
router.delete('/products/:id', AdminController.deleteProduct);

// 5. Product Variant Management (CRUD)
router.get('/products/:productId/variants', AdminController.getProductVariants);
router.post('/products/:productId/variants', AdminController.createProductVariant);
router.get('/variants/:variantId', AdminController.getVariantById);
router.put('/variants/:variantId', AdminController.updateProductVariant);
router.patch('/variants/:variantId/stock', AdminController.updateVariantStock);
router.delete('/variants/:variantId', AdminController.deleteProductVariant);

// 6. Promotional Banners (CRUD)
router.get('/banners', AdminController.getBanners);
router.get('/banners/:id', AdminController.getBannerById);
router.post('/banners', AdminController.saveBanner);
router.put('/banners/:id', AdminController.updateBanner);
router.patch('/banners/:id/status', AdminController.toggleBannerStatus);
router.delete('/banners/:id', AdminController.deleteBanner);

// 7. Order Fulfillment & Tracking (CRUD)
router.get('/orders', AdminController.getOrders);
router.get('/orders/:id', AdminController.getOrderDetails);
router.patch('/orders/:id/status', AdminController.updateOrderStatus);
router.patch('/sub-orders/:subOrderId/status', AdminController.updateSubOrderStatus);
router.delete('/orders/:id', AdminController.deleteOrder);

// 8. Return Request Management
router.get('/returns', AdminController.getReturnRequests);
router.patch('/orders/:id/return', AdminController.processReturnRequest);

// 9. Payment & Refund Operations
router.post('/refunds', AdminController.triggerCashfreeRefund);

// 10. Wallet Management
router.post('/wallet/adjust', AdminController.adjustCustomerWallet);

// 11. Dynamic System Settings (CRUD)
router.get('/settings', AdminController.getSystemSettings);
router.get('/settings/:key', AdminController.getSystemSettingByKey);
router.post('/settings', AdminController.createSystemSetting);
router.put('/settings/:key', AdminController.updateSystemSetting);
router.delete('/settings/:key', AdminController.deleteSystemSetting);

// 12. Promotional Offers (CRUD)
router.get('/offers', AdminController.getOffers);
router.get('/offers/:id', AdminController.getOfferById);
router.post('/offers', AdminController.saveOffer);
router.put('/offers/:id', AdminController.updateOffer);
router.patch('/offers/:id/status', AdminController.toggleOfferStatus);
router.delete('/offers/:id', AdminController.deleteOffer);

// 13. Discount Coupons (CRUD)
router.get('/coupons', AdminController.getCoupons);
router.get('/coupons/:id', AdminController.getCouponById);
router.post('/coupons', AdminController.saveCoupon);
router.put('/coupons/:id', AdminController.updateCoupon);
router.patch('/coupons/:id/status', AdminController.toggleCouponStatus);
router.delete('/coupons/:id', AdminController.deleteCoupon);

// 14. Marketing Broadcast Notifications
router.post('/notifications/broadcast', AdminController.broadcastNotification);

// 15. Audit Logs & Inventory Ledger
router.get('/audit-logs', AdminController.getAuditLogs);
router.get('/inventory/transactions', AdminController.getInventoryTransactions);

// 16. Multi-Shop Marketplace & Vendor Governance
router.get('/shops', ShopController.adminListShops);
router.get('/shops/:id', ShopController.adminGetShopById);
router.put('/shops/:id', ShopController.adminUpdateShop);
router.get('/payouts', ShopController.adminListPayouts);
router.put('/payouts/:id', ShopController.adminProcessPayout);

// 17. Reviews & Ratings Moderation
router.get('/reviews', ReviewController.adminGetReviews);
router.delete('/reviews/:id', ReviewController.adminDeleteReview);

export default router;

