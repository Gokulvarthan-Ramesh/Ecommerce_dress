import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { ShopController } from '../controllers/shopController';
import { ReviewController } from '../controllers/reviewController';
import { DeliveryController } from '../controllers/deliveryController';
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
router.get('/customers/:id/addresses', AdminController.getCustomerAddresses);
router.post('/customers/:id/addresses', AdminController.createCustomerAddress);
router.put('/customers/:id/addresses/:addressId', AdminController.updateCustomerAddress);
router.delete('/customers/:id/addresses/:addressId', AdminController.deleteCustomerAddress);
router.get('/customers/:id/cart', AdminController.getCustomerCart);
router.get('/customers/:id/wishlist', AdminController.getCustomerWishlist);
router.post('/customers/:id/orders', AdminController.adminCreateOrder);

// 2.5 Vendor Management (CRUD)
router.get('/vendors', AdminController.getVendors);
router.get('/vendors/:id', AdminController.getVendorDetails);
router.post('/vendors', AdminController.createVendor);
router.put('/vendors/:id', AdminController.updateVendor);
router.patch('/vendors/:id/status', AdminController.toggleVendorStatus);

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

// Vendor-specific analytical views (Impersonation) & Advanced Controls
router.get('/shops/:shopId/dashboard', ShopController.adminGetShopDashboard);
router.get('/shops/:shopId/analytics/top-products', ShopController.adminGetShopTopProducts);
router.get('/shops/:shopId/inventory/transactions', ShopController.adminGetShopInventoryTransactions);
router.get('/shops/:shopId/orders', ShopController.adminGetShopSubOrders);
router.delete('/shops/:id', ShopController.adminDeleteShop);
router.patch('/shops/:shopId/inventory/bulk-update', ShopController.adminBulkUpdateInventory);

// 17. Reviews & Ratings Moderation
router.get('/reviews', ReviewController.adminGetReviews);
router.delete('/reviews/:id', ReviewController.adminDeleteReview);

// 18. Global Attributes Management
router.get('/attributes', AdminController.getAttributes);
router.post('/attributes', AdminController.createAttribute);
router.put('/attributes/:id', AdminController.updateAttribute);
router.delete('/attributes/:id', AdminController.deleteAttribute);

// 19. Admin / Staff User Management
router.get('/staff', AdminController.getAdminUsers);
router.post('/staff', AdminController.createAdminUser);
router.put('/staff/:id', AdminController.updateAdminUser);

// 20. Referral Tracking
router.get('/referrals', AdminController.getReferrals);

// --- NEW EXTENDED GAP API ROUTES ---

// Payments
router.get('/payments', AdminController.getPayments);
router.get('/payments/:id', AdminController.getPaymentDetails);

// Refunds
router.get('/refunds', AdminController.getRefunds);
router.patch('/refunds/:id/status', AdminController.updateRefundStatus);

// Wallet Transactions Audit
router.get('/customers/:id/wallet/transactions', AdminController.getCustomerWalletTransactions);

// Finance Reconciliation
router.get('/finance/reconciliation', AdminController.getFinanceReconciliation);

// Vendor Onboarding
router.get('/shops/pending', ShopController.getPendingShops);
router.post('/shops/:id/approve', ShopController.approveShop);
router.post('/shops/:id/reject', ShopController.rejectShop);

// Payout Workflow
router.patch('/payouts/:id/approve', ShopController.adminApprovePayout);
router.patch('/payouts/:id/reject', ShopController.adminRejectPayout);
router.patch('/payouts/:id/mark-paid', ShopController.adminMarkPayoutPaid);

// Granular Return Management
router.patch('/returns/:id/approve', AdminController.adminApproveReturn);
router.patch('/returns/:id/reject', AdminController.adminRejectReturn);
router.patch('/returns/:id/receive', AdminController.adminReceiveReturn);

import { OrderController } from '../controllers/orderController';
router.post('/orders/sub/:subOrderId/rto', OrderController.markSubOrderRTO);

// Product Moderation
router.get('/products/pending', AdminController.getPendingProducts);
router.post('/products/:id/approve', AdminController.approveProduct);
router.post('/products/:id/reject', AdminController.rejectProduct);

// Inventory
router.get('/inventory/reservations', AdminController.getInventoryReservations);
router.get('/inventory/low-stock', AdminController.getLowStockReport);

// Staff Permissions
router.get('/staff/permissions/master', AdminController.getAvailablePermissions);
router.get('/staff/:id/permissions', AdminController.getStaffPermissions);
router.put('/staff/:id/permissions', AdminController.updateStaffPermissions);

// 25. Serviceability Diagnostic
router.post('/serviceability/check', DeliveryController.adminDiagnosticCheck);

export default router;
