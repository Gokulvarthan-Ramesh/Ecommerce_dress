import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { verifyCashfreeWebhook } from '../middleware/cashfreeWebhook';

const router = Router();

// Secure Cashfree payment notifications webhook endpoint
router.post('/cashfree', verifyCashfreeWebhook, WebhookController.handleCashfreeWebhook);

export default router;
