import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /referrals — requires auth (shows user's own referral info)
router.get('/', authenticateToken, WalletController.getReferralInfo);

// POST /referrals/validate — public (validate a code before registration)
router.post('/validate', WalletController.validateReferralCode);

export default router;
