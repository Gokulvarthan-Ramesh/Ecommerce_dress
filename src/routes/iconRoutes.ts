import { Router } from 'express';
import { IconController } from '../controllers/iconController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminGuard';

const router = Router();

// Public routes
router.get('/', IconController.getIcons);
router.get('/:id', IconController.getIconById);

// Admin only routes
router.post('/', authenticateToken, requireAdmin, IconController.createIcon);
router.put('/:id', authenticateToken, requireAdmin, IconController.updateIcon);
router.delete('/:id', authenticateToken, requireAdmin, IconController.deleteIcon);

export default router;
