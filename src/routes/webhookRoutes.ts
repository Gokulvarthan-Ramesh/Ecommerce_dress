import { Router, Request, Response } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { verifyCashfreeWebhook } from '../middleware/cashfreeWebhook';
import { OrderService } from '../services/OrderService';

const router = Router();

// Secure Cashfree payment notifications webhook endpoint
router.post('/cashfree', verifyCashfreeWebhook, WebhookController.handleCashfreeWebhook);

// Development test endpoint to simulate a Cashfree payment webhook locally
router.post('/simulate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, amount = 499, status = 'SUCCESS', paymentMethod = 'upi' } = req.body;
    if (!orderId) {
      res.status(400).json({ success: false, message: 'orderId is required' });
      return;
    }

    const payload = {
      type: status === 'SUCCESS' ? 'PAYMENT_SUCCESS_WEBHOOK' : 'PAYMENT_FAILED_WEBHOOK',
      data: {
        order: {
          order_id: orderId,
          order_amount: Number(amount),
          order_currency: 'INR',
        },
        payment: {
          cf_payment_id: `SIM_CF_${Date.now()}`,
          payment_status: status,
          payment_amount: Number(amount),
          payment_group: paymentMethod,
        },
      },
    };

    await OrderService.processCashfreeWebhook(payload);
    res.status(200).json({
      success: true,
      message: `Simulated Cashfree ${payload.type} for order ${orderId}`,
      payload,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
