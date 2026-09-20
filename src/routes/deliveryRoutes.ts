import { Router } from 'express';
import { DeliveryController } from '../controllers/deliveryController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Check if a cart (list of shops) is serviceable to an address
router.post('/serviceability/check', DeliveryController.checkServiceability);

export default router;
