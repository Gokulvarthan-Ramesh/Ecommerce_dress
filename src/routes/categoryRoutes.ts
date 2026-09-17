import { Router } from 'express';  
import { ProductController } from '../controllers/productController';  
  
const router = Router();  
router.get('/', ProductController.getCategories);  
router.get('/:id', ProductController.getCategoryDetails);  
export default router; 
