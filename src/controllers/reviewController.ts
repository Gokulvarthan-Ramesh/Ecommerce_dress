import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../utils/response';
import { OrderStatus } from '@prisma/client';

export class ReviewController {
  /**
   * Submit a product review
   */
  static async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { productId, rating, comment } = req.body;

      if (!productId || typeof rating !== 'number' || rating < 1 || rating > 5) {
        throw new AppError('Product ID and a valid rating (1-5) are required', 400);
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      // Check if user has already reviewed this product
      const existingReview = await prisma.review.findFirst({
        where: { userId, productId },
      });

      if (existingReview) {
        throw new AppError('You have already reviewed this product', 400);
      }

      // Check if user has purchased this product and it was delivered
      const hasPurchased = await prisma.orderItem.findFirst({
        where: {
          product: { id: productId },
          order: {
            userId,
            status: OrderStatus.DELIVERED,
          },
        },
      });

      const isVerifiedPurchase = !!hasPurchased;

      const review = await prisma.review.create({
        data: {
          userId,
          productId,
          shopId: product.shopId, // link to shop if it exists
          rating,
          comment,
          isVerifiedPurchase,
        },
      });

      // Recalculate Shop Rating if shopId exists
      if (product.shopId) {
        const shopReviews = await prisma.review.findMany({
          where: { shopId: product.shopId },
          select: { rating: true },
        });

        const reviewCount = shopReviews.length;
        const totalRating = shopReviews.reduce((sum, r) => sum + r.rating, 0);
        const newRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(2) : 5.0;

        await prisma.shop.update({
          where: { id: product.shopId },
          data: {
            rating: Number(newRating),
            reviewCount,
          },
        });
      }

      ApiResponse.success(res, review, 'Review submitted successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get public reviews for a product
   */
  static async getProductReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.params;
      const { page = '1', limit = '10' } = req.query;
      
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;
      const skip = (pageNum - 1) * limitNum;

      const [reviews, total, aggr] = await Promise.all([
        prisma.review.findMany({
          where: { productId },
          include: {
            user: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.review.count({ where: { productId } }),
        prisma.review.aggregate({
          where: { productId },
          _avg: { rating: true }
        })
      ]);

      ApiResponse.success(res, {
        reviews,
        summary: {
          totalReviews: total,
          averageRating: aggr._avg.rating ? Number(aggr._avg.rating.toFixed(2)) : 0
        },
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Vendor: Get reviews for their shop
   */
  static async getVendorReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      
      const shop = await prisma.shop.findFirst({ where: { ownerId: userId } });
      if (!shop) throw new AppError('Shop not found', 404);

      const { page = '1', limit = '10' } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;
      const skip = (pageNum - 1) * limitNum;

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where: { shopId: shop.id },
          include: {
            user: { select: { name: true } },
            product: { select: { name: true, slug: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.review.count({ where: { shopId: shop.id } })
      ]);

      ApiResponse.success(res, {
        reviews,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get all reviews with filters
   */
  static async adminGetReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = '1', limit = '10', shopId, productId } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;
      const skip = (pageNum - 1) * limitNum;

      const where = {
        ...(shopId ? { shopId: String(shopId) } : {}),
        ...(productId ? { productId: String(productId) } : {})
      };

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true } },
            product: { select: { id: true, name: true, slug: true } },
            shop: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.review.count({ where })
      ]);

      ApiResponse.success(res, {
        reviews,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Delete a review (Moderation)
   */
  static async adminDeleteReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const review = await prisma.review.findUnique({ where: { id } });
      if (!review) throw new AppError('Review not found', 404);

      await prisma.review.delete({ where: { id } });

      // Recalculate Shop Rating if shopId exists
      if (review.shopId) {
        const shopReviews = await prisma.review.findMany({
          where: { shopId: review.shopId },
          select: { rating: true },
        });

        const reviewCount = shopReviews.length;
        const totalRating = shopReviews.reduce((sum, r) => sum + r.rating, 0);
        const newRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(2) : 5.0;

        await prisma.shop.update({
          where: { id: review.shopId },
          data: {
            rating: Number(newRating),
            reviewCount,
          },
        });
      }

      ApiResponse.success(res, null, 'Review deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
