import { Router } from 'express';
import { ConfigController } from '../controllers/configController';

const router = Router();

// Public store configuration for mobile & web apps
router.get('/', ConfigController.getPublicConfig);
router.get('/banners', ConfigController.getActiveBanners);
router.get('/policies', ConfigController.getPolicies);
router.get('/faqs', ConfigController.getFaqs);
router.get('/size-guides', ConfigController.getSizeGuides);
router.get('/reasons', ConfigController.getReasons);
router.get('/navigation', ConfigController.getNavigation);
router.get('/theme', ConfigController.getTheme);
router.get('/check-pincode', ConfigController.checkPincode);

export default router;
