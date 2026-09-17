import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';

export class WebhookController {
  /**
   * Handle authenticated Cashfree Webhooks
   */
  static async handleCashfreeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body;
      console.log(`[CASHFREE WEBHOOK RECEIVED] Event Type: ${payload.type}`);

      // We always return 200 immediately to prevent Cashfree retries, 
      // but we await processing here for simplicity. In a highly scalable system,
      // this would push to a queue (like RabbitMQ/SQS) and return 200 instantly.
      await OrderService.processCashfreeWebhook(payload);

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('[CASHFREE WEBHOOK PROCESSING ERROR]:', error);
      // Still return 200 to prevent continuous Cashfree retries if internal parsing fails
      res.status(200).json({ received: true, error: 'Processing error logged' });
    }
  }
}
