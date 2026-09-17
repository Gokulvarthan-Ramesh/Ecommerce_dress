import { Router } from 'express';
import { WishlistController } from '../controllers/wishlistController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All wishlist routes require authentication
router.use(authenticateToken);

router.get('/', WishlistController.getWishlist);
router.post('/:productId', WishlistController.addWishlistItem);
router.delete('/:productId', WishlistController.removeWishlistItem);

export default router;
