import { Router } from 'express';
import { SplashController } from '../controllers/splashController';

const router = Router();

router.get('/', SplashController.getAll);
router.post('/', SplashController.create);
router.get('/:id', SplashController.getById);
router.put('/:id', SplashController.update);
router.delete('/:id', SplashController.delete);

export default router;
