import { Router } from 'express';
import { SplashController } from '../controllers/splashController';

const router = Router();

// Endpoint for app startup / splash screen
router.get('/splash', SplashController.getAppSplash);

export default router;
