import { Router, Request, Response } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { verifyCashfreeWebhook } from '../middleware/cashfreeWebhook';
import { OrderService } from '../services/OrderService';
import { prisma } from '../config/db';

const router = Router();

// Secure Cashfree payment notifications webhook endpoint
router.post('/cashfree', verifyCashfreeWebhook, WebhookController.handleCashfreeWebhook);

// Development test endpoint to simulate a Cashfree payment webhook locally
router.post('/simulate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, status = 'SUCCESS', paymentMethod = 'upi' } = req.body;
    if (!orderId) {
      res.status(400).json({ success: false, message: 'orderId is required' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const finalAmount = req.body.amount !== undefined ? Number(req.body.amount) : Number(order.paymentAmount);

    const payload = {
      type: status === 'SUCCESS' ? 'PAYMENT_SUCCESS_WEBHOOK' : 'PAYMENT_FAILED_WEBHOOK',
      data: {
        order: {
          order_id: orderId,
          order_amount: finalAmount,
          order_currency: 'INR',
        },
        payment: {
          cf_payment_id: `SIM_CF_${Date.now()}`,
          payment_status: status,
          payment_amount: finalAmount,
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

// WhatsApp Webhook - Verification (GET)
router.get('/whatsapp', (req: Request, res: Response): any => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// WhatsApp Webhook - Incoming Events (POST)
router.post('/whatsapp', (req: Request, res: Response): any => {
  console.log('WhatsApp webhook event:');
  console.log(JSON.stringify(req.body, null, 2));

  return res.sendStatus(200);
});

export default router;
