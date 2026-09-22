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
                include: {
                  images: true,
                  variants: true,
                  category: {
                    select: { id: true, name: true, slug: true }
                  },
                  _count: {
                    select: { reviews: true }
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
          include: { 
            items: { 
              include: { 
                product: { 
                  include: { 
                    images: true, 
                    variants: true, 
                    category: { select: { id: true, name: true, slug: true } },
                    _count: { select: { reviews: true } }
                  } 
                } 
              } 
            } 
          }
        });
      }

      const items = wishlist!.items || [];
      const formattedItems = items.map((item: any) => {
        const p = item.product;
        // Construct full product object just like in ProductService
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: Number(p.sellingPrice),
          mrp: Number(p.mrp),
          discountPercent: p.discountPercent,
          imageUrl: p.images.find((img: any) => img.isPrimary)?.imageUrl || p.images[0]?.imageUrl || null,
          images: p.images,
          variants: p.variants,
          category: p.category,
          isActive: p.isActive,
          tags: p.tags,
          isNew: p.isNew,
          isFeatured: p.isFeatured,
          rating: Number(p.rating || 0),
          reviewsCount: p._count?.reviews || 0,
          isAvailable: p.isActive,
          addedAt: item.createdAt,
        };
      });

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
