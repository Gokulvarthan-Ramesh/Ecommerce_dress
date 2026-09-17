import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ENV } from '../config/env';

export const verifyCashfreeWebhook = (req: Request, res: Response, next: NextFunction): void => {
  const signature = req.headers['x-webhook-signature'] as string;
  const timestamp = req.headers['x-webhook-timestamp'] as string;

  if (!signature || !timestamp) {
    res.status(400).json({
      success: false,
      message: 'Missing Cashfree webhook security headers (x-webhook-signature or x-webhook-timestamp)',
    });
    return;
  }

  // Prevent replay attacks: ensure timestamp is within 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp, 10);
  if (Math.abs(currentTime - webhookTime) > 300) {
    res.status(400).json({
      success: false,
      message: 'Webhook timestamp expired or out of tolerance',
    });
    return;
  }

  const rawBody = req.rawBody || JSON.stringify(req.body);
  const clientSecret = ENV.CASHFREE.SECRET_KEY;

  if (!clientSecret) {
    res.status(500).json({
      success: false,
      message: 'Cashfree secret key not configured on server',
    });
    return;
  }

  // Cashfree Signature Data = timestamp + rawBody
  const signatureData = timestamp + rawBody;

  // Generate HMAC-SHA256
  const computedSignature = crypto
    .createHmac('sha256', clientSecret)
    .update(signatureData)
    .digest('base64');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );

  if (!isValid) {
    console.warn('[CASHFREE WEBHOOK] Invalid signature detected. Rejected.');
    res.status(400).json({
      success: false,
      message: 'Invalid Cashfree webhook signature',
    });
    return;
  }

  next();
};
