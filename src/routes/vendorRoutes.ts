import { Router } from 'express';
import { ShopController } from '../controllers/shopController';
import { ReviewController } from '../controllers/reviewController';
import { DeliveryController } from '../controllers/deliveryController';
import { authenticateToken } from '../middleware/auth';
import { requireVendor } from '../middleware/adminGuard';

const router = Router();

// 1. Vendor Self-Registration (Any logged-in customer can apply to open a shop)
router.post('/register', authenticateToken, ShopController.registerVendorShop);

// 2. Vendor Portal Management (Requires VENDOR or ADMIN role)
router.use(authenticateToken, requireVendor);

router.get('/shop', ShopController.getMyVendorShop);
router.put('/shop', ShopController.updateMyVendorShop);
router.get('/dashboard', ShopController.getVendorDashboard);

// Vendor Product Management
router.get('/products', ShopController.getVendorProducts);
router.post('/products', ShopController.saveVendorProduct);
router.delete('/products/:id', ShopController.deleteVendorProduct);

router.get('/orders', requireVendor, ShopController.getVendorSubOrders);
router.put('/orders/:subOrderId/status', requireVendor, ShopController.updateSubOrderStatus);
router.post('/orders/:subOrderId/return', requireVendor, ShopController.processSubOrderReturn);

// Analytics & Inventory
router.get('/analytics/top-products', requireVendor, ShopController.getVendorTopProducts);
router.get('/inventory/transactions', requireVendor, ShopController.getVendorInventoryTransactions);
router.patch('/inventory/bulk-update', requireVendor, ShopController.bulkUpdateVendorInventory);

// Reviews
router.get('/reviews', requireVendor, ReviewController.getVendorReviews);

// Payouts
router.get('/payouts', requireVendor, ShopController.getVendorPayouts);
router.post('/payouts', requireVendor, ShopController.requestPayout);

// Delivery & Serviceability
router.get('/delivery/settings', requireVendor, DeliveryController.getDeliverySettings);
router.put('/delivery/settings', requireVendor, DeliveryController.updateDeliverySettings);
router.get('/delivery/service-areas', requireVendor, DeliveryController.getServiceAreas);
router.post('/delivery/service-areas/bulk', requireVendor, DeliveryController.addBulkServiceAreas);
router.delete('/delivery/service-areas/:id', requireVendor, DeliveryController.deleteServiceArea);

export default router;
