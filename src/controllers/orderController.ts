import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { OrderStatus } from '@prisma/client';
import { CheckoutService } from '../services/checkoutService';
import { OrderService } from '../services/OrderService';
import { ApiResponse } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { SystemSettingService } from '../services/systemSettingService';

export class OrderController {
  /**
   * Preview checkout calculation before placing order
   */
  static async previewCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { items, couponCode, useWallet } = req.body;

      const summary = await CheckoutService.previewCheckout(userId, req.body);

      ApiResponse.success(res, summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create and initiate an order (Cashfree or COD)
   */
  static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await CheckoutService.processCheckout(userId, req.body);

      const message = result.isCashfree ? 'Order created. Complete payment via Cashfree.' : 'Order placed successfully!';
      const { isCashfree, ...data } = result;

      ApiResponse.created(res, data, message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all orders of current user
   */
  static async getMyOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const orders = await OrderService.getMyOrders(userId);
      ApiResponse.success(res, orders);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single order details
   */
  static async getOrderDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const order = await OrderService.getOrderDetails(userId, id);
      ApiResponse.success(res, order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify Cashfree payment status explicitly (supports both authenticated and public verification)
   */
  static async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const order = await OrderService.verifyAndSyncCashfreePayment(id);
      if (!order) {
        throw new AppError('Order not found', 404);
      }
      ApiResponse.success(res, order, `Order payment status: ${order.paymentStatus}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cashfree Return URL callback handler (for iframe/browser redirects upon payment completion)
   */
  static async handleCashfreeReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = (req.query.order_id as string) || (req.query.orderId as string);
      if (!orderId) {
        res.status(400).send('<h3>Missing order_id</h3>');
        return;
      }

      const order = await OrderService.verifyAndSyncCashfreePayment(orderId);

      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Status</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 28px 36px; border-radius: 12px; text-align: center; border: 1px solid #334155; }
            .status { font-size: 20px; font-weight: bold; color: ${order?.paymentStatus === 'SUCCESS' ? '#34d399' : '#f59e0b'}; margin-bottom: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="status">${order?.paymentStatus === 'SUCCESS' ? '✅ Payment Completed' : '⏳ Processing Payment...'}</div>
            <p>Order: <b>${order?.orderNumber || orderId}</b></p>
            <p>Status: <b>${order?.status || 'PENDING'}</b></p>
          </div>
          <script>
            try {
              if (window.opener) window.opener.postMessage({ event: 'PAYMENT_SUCCESS', orderId: '${orderId}' }, '*');
              if (window.parent && window.parent !== window) window.parent.postMessage({ event: 'PAYMENT_SUCCESS', orderId: '${orderId}' }, '*');
            } catch(e) {}
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Customer-initiated order cancellation (prior to shipping)
   */
  static async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { reason = 'Cancelled by customer' } = req.body;

      await OrderService.cancelOrder(userId, id, reason);

      ApiResponse.success(res, null, 'Order cancelled successfully. Any payments or wallet amounts have been refunded.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Customer-initiated return request within the 7-day policy window
   */
  static async requestReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        throw new AppError('Return reason is required', 400);
      }

      const order = await prisma.order.findFirst({
        where: { id, userId },
      });

      if (!order) throw new AppError('Order not found', 404);
      if (order.status !== OrderStatus.DELIVERED) {
        throw new AppError('Only delivered orders can be returned', 400);
      }

      // Check dynamic return policy window configured by admin
      const storeConfig = await SystemSettingService.getStoreConfig();
      const returnWindowDays = storeConfig.return_window_days || 7;
      const deliveredDays = Math.floor((Date.now() - new Date(order.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      if (deliveredDays > returnWindowDays) {
        throw new AppError(`The ${returnWindowDays}-day return policy window has expired for this order`, 400);
      }

      const updated = await prisma.$transaction(async (tx: any) => {
        const o = await tx.order.update({
          where: { id },
          data: {
            status: OrderStatus.RETURN_REQUESTED,
            returnReason: reason,
            returnRequestedAt: new Date(),
            returnStatus: 'REQUESTED',
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            oldStatus: OrderStatus.DELIVERED,
            newStatus: OrderStatus.RETURN_REQUESTED,
            changedBy: 'CUSTOMER',
            reason: `Return requested: ${reason}`,
          },
        });

        return o;
      });

      ApiResponse.success(
        res,
        updated,
        'Return request submitted successfully. Our team will arrange reverse pickup within 48 hours.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Customer-initiated sub-order (vendor specific) cancellation
   */
  static async cancelSubOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { subOrderId } = req.params;
      const { reason = 'Cancelled by customer' } = req.body;

      const result = await OrderService.cancelSubOrder(userId, subOrderId, reason);
      ApiResponse.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Customer-initiated return request for a specific sub-order
   */
  static async requestSubOrderReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { subOrderId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        throw new AppError('Return reason is required', 400);
      }

      const updated = await OrderService.requestSubOrderReturn(userId, subOrderId, reason);
      ApiResponse.success(res, updated, 'Sub-order return request submitted successfully.');
    } catch (error) {
      next(error);
    }
  }
}
