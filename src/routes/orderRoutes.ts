import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public verification & return endpoints (Cashfree callbacks and frontend polling)
router.get('/return', OrderController.handleCashfreeReturn);
router.get('/:id/verify', OrderController.verifyPayment);
router.post('/:id/verify', OrderController.verifyPayment);

// Authenticated customer order routes
router.use(authenticateToken);

router.post('/preview', OrderController.previewCheckout);
router.post('/checkout', OrderController.createOrder);
router.get('/', OrderController.getMyOrders);
router.get('/:id', OrderController.getOrderDetails);
router.post('/:id/cancel', OrderController.cancelOrder);
router.post('/:id/return', OrderController.requestReturn);

export default router;
