import { Router } from 'express';
import { HomeController } from '../controllers/homeController';

const router = Router();

// Unified Dynamic Home Screen Feed
router.get('/', HomeController.getHomeFeed);

export default router;
