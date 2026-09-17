import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/preview', OrderController.previewCheckout);
router.post('/checkout', OrderController.createOrder);
router.get('/', OrderController.getMyOrders);
router.get('/:id', OrderController.getOrderDetails);
router.get('/:id/verify', OrderController.verifyPayment);
router.post('/:id/verify', OrderController.verifyPayment);
router.post('/:id/cancel', OrderController.cancelOrder);

export default router;
