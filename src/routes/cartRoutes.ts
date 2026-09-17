import { Router } from 'express';
import { CartController } from '../controllers/cartController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { addToCartSchema, updateCartItemSchema } from '../validators/cartValidator';

const router = Router();

router.use(authenticateToken);

router.get('/', CartController.getCart);
router.post('/items', validateRequest(addToCartSchema), CartController.addToCart);
router.post('/add', validateRequest(addToCartSchema), CartController.addToCart);
router.patch('/items/:id', validateRequest(updateCartItemSchema), CartController.updateQuantity);
router.put('/items/:id', validateRequest(updateCartItemSchema), CartController.updateQuantity);
router.delete('/items/:id', CartController.removeFromCart);

router.delete('/', CartController.clearCart);

export default router;
