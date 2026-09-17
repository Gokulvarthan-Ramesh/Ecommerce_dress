import { Router } from 'express';
import { ReviewController } from '../controllers/reviewController';
import { authenticateToken } from '../middleware/auth';
import { requireVendor } from '../middleware/adminGuard';

const router = Router();

// Public route to get reviews for a product
router.get('/product/:productId', ReviewController.getProductReviews);

// Customer route to submit a review
router.post('/', authenticateToken, ReviewController.submitReview);

export default router;
