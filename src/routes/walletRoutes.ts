import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Balance only — no POST /add-money (this is a promotional/refund ledger, not a regulated PPI)
router.get('/', WalletController.getWallet);
router.get('/transactions', WalletController.getWalletTransactions);

export default router;
