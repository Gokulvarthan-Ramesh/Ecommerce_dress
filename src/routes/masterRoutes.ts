import { Router } from 'express';
import { MasterController } from '../controllers/masterController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminGuard';

const router = Router();

// Master type is a URL param: /api/v1/admin/masters/:masterType
router.get(
  '/:masterType',
  authenticateToken,
  requireAdmin,
  MasterController.getAll
);

router.get(
  '/:masterType/:id',
  authenticateToken,
  requireAdmin,
  MasterController.getById
);

router.post(
  '/:masterType',
  authenticateToken,
  requireAdmin,
  MasterController.create
);

router.patch(
  '/:masterType/:id',
  authenticateToken,
  requireAdmin,
  MasterController.update
);

router.delete(
  '/:masterType/:id',
  authenticateToken,
  requireAdmin,
  MasterController.delete
);

export default router;
