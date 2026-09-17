import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../utils/response';

export class WishlistController {
  /**
   * Get user's wishlist
   */
  static async getWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      
      let wishlist = await prisma.wishlist.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  sellingPrice: true,
                  isActive: true,
                  images: {
                    where: { isPrimary: true },
                    select: { imageUrl: true },
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!wishlist) {
        wishlist = await prisma.wishlist.create({
          data: { userId },
          include: { items: { include: { product: { select: { id: true, name: true, slug: true, sellingPrice: true, isActive: true, images: { where: { isPrimary: true }, select: { imageUrl: true } } } } } } }
        });
      }

      const items = wishlist!.items || [];
      const formattedItems = items.map((item: any) => ({
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: Number(item.product.sellingPrice),
        imageUrl: item.product.images[0]?.imageUrl || null,
        isAvailable: item.product.isActive,
        addedAt: item.createdAt,
      }));

      ApiResponse.success(res, formattedItems);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a product to wishlist
   */
  static async addWishlistItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { productId } = req.params;

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) throw new AppError('Product not found', 404);

      let wishlist = await prisma.wishlist.findUnique({ where: { userId } });
      if (!wishlist) {
        wishlist = await prisma.wishlist.create({ data: { userId } });
      }

      // Check if already in wishlist
      const existing = await prisma.wishlistItem.findUnique({
        where: {
          wishlistId_productId: {
            wishlistId: wishlist.id,
            productId,
          }
        }
      });

      if (existing) {
        ApiResponse.success(res, null, 'Product is already in your wishlist');
        return;
      }

      await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
        }
      });

      ApiResponse.success(res, null, 'Product added to wishlist', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove a product from wishlist
   */
  static async removeWishlistItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { productId } = req.params;

      const wishlist = await prisma.wishlist.findUnique({ where: { userId } });
      if (!wishlist) throw new AppError('Wishlist not found', 404);

      await prisma.wishlistItem.deleteMany({
        where: {
          wishlistId: wishlist.id,
          productId,
        }
      });

      ApiResponse.success(res, null, 'Product removed from wishlist');
    } catch (error) {
      next(error);
    }
  }
}
