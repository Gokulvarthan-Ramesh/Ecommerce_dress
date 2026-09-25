import { Router } from 'express';
import { VendorAuthController } from '../controllers/vendorAuthController';
import { VendorApplicationController } from '../controllers/vendorApplicationController';
import { ShopController } from '../controllers/shopController';
import { ReviewController } from '../controllers/reviewController';
import { DeliveryController } from '../controllers/deliveryController';
import { authenticateVendorToken } from '../middleware/vendorAuth';

const router = Router();

// ==========================================
// VENDOR AUTH (No token required — public)
// ==========================================
router.post('/auth/register/send-otp', VendorAuthController.sendRegisterOtp);
router.post('/auth/login/send-otp', VendorAuthController.sendLoginOtp);
router.post('/auth/resend-otp', VendorAuthController.resendOtp);
router.post('/auth/register', VendorAuthController.register);
router.post('/auth/login', VendorAuthController.login);
router.post('/register', VendorAuthController.registerWithShop); // One-shot: OTP + shop details → VendorUser + Shop

// ==========================================
// VENDOR PROFILE (Vendor token required)
// ==========================================
router.get('/auth/profile', authenticateVendorToken, VendorAuthController.getProfile);
router.put('/auth/profile', authenticateVendorToken, VendorAuthController.updateProfile);

// ==========================================
// VENDOR APPLICATION (Vendor token required)
// ==========================================
router.post('/application', authenticateVendorToken, VendorApplicationController.createApplication);
router.get('/application', authenticateVendorToken, VendorApplicationController.getMyApplication);
router.put('/application', authenticateVendorToken, VendorApplicationController.updateApplication);
router.post('/application/submit', authenticateVendorToken, VendorApplicationController.submitApplication);

// Document Management
router.post('/application/documents', authenticateVendorToken, VendorApplicationController.addDocument);
router.get('/application/documents', authenticateVendorToken, VendorApplicationController.getMyDocuments);
router.delete('/application/documents/:id', authenticateVendorToken, VendorApplicationController.deleteDocument);

// Bank Account
router.post('/application/bank-account', authenticateVendorToken, VendorApplicationController.upsertBankAccount);
router.get('/application/bank-account', authenticateVendorToken, VendorApplicationController.getMyBankAccount);

// Pickup Address
router.post('/application/pickup-address', authenticateVendorToken, VendorApplicationController.upsertPickupAddress);
router.get('/application/pickup-address', authenticateVendorToken, VendorApplicationController.getMyPickupAddress);

// ==========================================
// VENDOR PORTAL (Vendor token required - shop must exist)
// ==========================================
router.get('/shop', authenticateVendorToken, ShopController.getMyVendorShop);
router.put('/shop', authenticateVendorToken, ShopController.updateMyVendorShop);
router.get('/dashboard', authenticateVendorToken, ShopController.getVendorDashboard);

// Vendor Product Management
router.get('/products', authenticateVendorToken, ShopController.getVendorProducts);
router.post('/products', authenticateVendorToken, ShopController.saveVendorProduct);
router.delete('/products/:id', authenticateVendorToken, ShopController.deleteVendorProduct);

// Vendor Orders
router.get('/orders', authenticateVendorToken, ShopController.getVendorSubOrders);
router.put('/orders/:subOrderId/status', authenticateVendorToken, ShopController.updateSubOrderStatus);
router.post('/orders/:subOrderId/return', authenticateVendorToken, ShopController.processSubOrderReturn);

// Analytics & Inventory
router.get('/analytics/top-products', authenticateVendorToken, ShopController.getVendorTopProducts);
router.get('/inventory/transactions', authenticateVendorToken, ShopController.getVendorInventoryTransactions);
router.patch('/inventory/bulk-update', authenticateVendorToken, ShopController.bulkUpdateVendorInventory);

// Reviews
router.get('/reviews', authenticateVendorToken, ReviewController.getVendorReviews);

// Payouts
router.get('/payouts', authenticateVendorToken, ShopController.getVendorPayouts);
router.post('/payouts', authenticateVendorToken, ShopController.requestPayout);

// Delivery & Serviceability
router.get('/delivery/settings', authenticateVendorToken, DeliveryController.getDeliverySettings);
router.put('/delivery/settings', authenticateVendorToken, DeliveryController.updateDeliverySettings);
router.get('/delivery/service-areas', authenticateVendorToken, DeliveryController.getServiceAreas);
router.post('/delivery/service-areas/bulk', authenticateVendorToken, DeliveryController.addBulkServiceAreas);
router.delete('/delivery/service-areas/:id', authenticateVendorToken, DeliveryController.deleteServiceArea);

export default router;
