import { Request, Response, NextFunction } from 'express';
import { CheckoutService } from '../services/checkoutService';
import { OrderService } from '../services/OrderService';
import { ApiResponse } from '../utils/response';

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
}
