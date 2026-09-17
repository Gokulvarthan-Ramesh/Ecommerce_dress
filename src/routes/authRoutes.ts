import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { sendOtpSchema, registerSchema, loginSchema } from '../validators/authValidator';

const router = Router();

router.post('/send-otp', validateRequest(sendOtpSchema), AuthController.sendWhatsAppOtp);
router.post('/register', validateRequest(registerSchema), AuthController.register);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.get('/profile', authenticateToken, AuthController.getProfile);

export default router;
