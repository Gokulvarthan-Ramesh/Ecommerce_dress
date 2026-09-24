import { Router } from 'express';
import { ProductController } from '../controllers/productController';

const router = Router();

router.get('/filters', ProductController.getCatalogFilters);
router.get('/specification-keys', ProductController.getSpecificationKeys);
router.get('/', ProductController.getProducts);
router.post('/recent', ProductController.getRecentProducts);
router.get('/:identifier/suggestions', ProductController.getSuggestedProducts);
router.get('/:identifier', ProductController.getProductDetails);

export default router;
