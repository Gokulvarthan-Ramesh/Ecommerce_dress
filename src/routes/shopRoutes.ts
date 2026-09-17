import { Router } from 'express';
import { ShopController } from '../controllers/shopController';

const router = Router();

// Public Storefront Discovery
router.get('/', ShopController.listShops);
router.get('/:slug', ShopController.getShopBySlug);
router.get('/:slug/products', ShopController.getShopProducts);

export default router;
