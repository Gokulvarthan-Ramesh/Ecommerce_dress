import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/CartService';
import { ApiResponse } from '../utils/response';

export class CartController {
  static async getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await CartService.getCart(userId);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async addToCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { variantId, quantity = 1 } = req.body;
      const result = await CartService.addToCart(userId, variantId, quantity);
      ApiResponse.success(res, result, 'Item added to cart');
    } catch (error) {
      next(error);
    }
  }

  static async updateQuantity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { quantity } = req.body;
      
      const result = await CartService.updateQuantity(userId, id, quantity);
      if (!result) {
        ApiResponse.success(res, null, 'Item removed from cart');
      } else {
        ApiResponse.success(res, result, 'Cart updated');
      }
    } catch (error) {
      next(error);
    }
  }

  static async removeFromCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      await CartService.removeFromCart(userId, id);
      ApiResponse.success(res, null, 'Item removed from cart');
    } catch (error) {
      next(error);
    }
  }

  static async clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      await CartService.clearCart(userId);
      ApiResponse.success(res, null, 'Cart cleared');
    } catch (error) {
      next(error);
    }
  }
}
