import { Request, Response, NextFunction } from 'express';
import { ShopService } from '../services/shopService';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { GoogleDriveService } from '../services/googleDriveService';


export class ShopController {
  /**
   * ==========================================
   * 1. PUBLIC STOREFRONT ENDPOINTS
   * ==========================================
   */

  static async listShops(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ShopService.listPublicShops(req.query);
      res.status(200).json({
        success: true,
        message: 'Active shops retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getShopBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ShopService.getPublicShopBySlug(req.params.slug);
      res.status(200).json({
        success: true,
        message: 'Shop details retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getShopProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ShopService.getPublicShopProducts(req.params.slug, req.query);
      res.status(200).json({
        success: true,
        message: 'Shop products retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ==========================================
   * 2. VENDOR PORTAL ENDPOINTS
   * ==========================================
   */

  static async registerVendorShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const result = await ShopService.registerVendorShop(userId, req.body);
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.shop,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyVendorShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const shop = await ShopService.getMyVendorShop(userId);
      res.status(200).json({
        success: true,
        message: 'Vendor shop retrieved successfully',
        data: shop,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateMyVendorShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const shop = await ShopService.updateMyVendorShop(userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Vendor shop updated successfully',
        data: shop,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVendorDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const dashboard = await ShopService.getVendorDashboard(userId);
      res.status(200).json({
        success: true,
        message: 'Vendor dashboard retrieved successfully',
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVendorSubOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const data = await ShopService.getVendorSubOrders(userId, req.query);
      res.status(200).json({
        success: true,
        message: 'Vendor sub-orders retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSubOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const updated = await ShopService.updateSubOrderStatus(userId, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: `Sub-order status updated to ${updated.status}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async requestPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { amount, notes } = req.body;
      const result = await ShopService.requestVendorPayout(userId, parseFloat(amount), notes);
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.payout,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVendorPayouts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const payouts = await ShopService.getVendorPayouts(userId);
      res.status(200).json({
        success: true,
        message: 'Vendor payouts retrieved successfully',
        data: payouts,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVendorProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const shop = await ShopService.getMyVendorShop(userId);

      const { page = '1', limit = '20', search } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const where: any = { shopId: shop.id };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: { category: true, variants: true, images: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.product.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        message: 'Vendor products retrieved',
        data: {
          products,
          pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async saveVendorProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const shop = await ShopService.getMyVendorShop(userId);

      const {
        id, name, slug, description, brand, fabric, fit, sleeve, pattern,
        categoryId, basePrice, sellingPrice, buyingPrice, isActive = true,
        images = [], variants = []
      } = req.body;

      if (!name || !slug || !categoryId || basePrice === undefined || sellingPrice === undefined) {
        throw new AppError('Name, slug, categoryId, basePrice, and sellingPrice are required');
      }

      if (id) {
        // Ensure the product being updated belongs to the vendor
        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing || existing.shopId !== shop.id) {
          throw new AppError('Product not found or unauthorized', 404);
        }
      } else {
        // Enforce unique slug specifically for this shop if we want, but globally unique for now
        const existingSlug = await prisma.product.findUnique({ where: { slug } });
        if (existingSlug) {
          throw new AppError('A product with this slug already exists. Please choose a unique slug.');
        }
      }

      const formattedImages = GoogleDriveService.formatImageUrls(images || []);

      const product = await prisma.$transaction(async (tx) => {
        const prod = await tx.product.upsert({
          where: { id: id || 'new-product' },
          update: {
            name, slug, description, brand, fabric, fit, sleeve, pattern,
            categoryId, basePrice, sellingPrice, buyingPrice, isActive,
            images: {
              deleteMany: {},
              create: formattedImages.map((imageUrl, i) => ({ imageUrl, sortOrder: i, isPrimary: i === 0 }))
            }
          },
          create: {
            name, slug, description, brand, fabric, fit, sleeve, pattern,
            categoryId, basePrice, sellingPrice, buyingPrice, isActive,
            shopId: shop.id, // FORCE shopId to vendor's shop
            images: {
              create: formattedImages.map((imageUrl, i) => ({ imageUrl, sortOrder: i, isPrimary: i === 0 }))
            }
          },
        });

        for (const variant of variants) {
          if (!variant.sku || !variant.size || !variant.color) {
            throw new AppError('Each variant must have sku, size, and color');
          }

          // Important: sku must be globally unique
          await tx.productVariant.upsert({
            where: { sku: variant.sku },
            update: {
              size: variant.size, color: variant.color, colorHex: variant.colorHex,
              price: variant.price || 0, stockQuantity: variant.stockQuantity ?? 0, isActive: variant.isActive ?? true,
            },
            create: {
              productId: prod.id, sku: variant.sku,
              size: variant.size, color: variant.color, colorHex: variant.colorHex,
              price: variant.price || 0, stockQuantity: variant.stockQuantity ?? 0, isActive: variant.isActive ?? true,
            },
          });
        }

        return tx.product.findUnique({
          where: { id: prod.id },
          include: { variants: true, images: true },
        });
      });

      res.status(200).json({
        success: true,
        message: 'Vendor product saved successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteVendorProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const shop = await ShopService.getMyVendorShop(userId);
      const { id } = req.params;

      const product = await prisma.product.findUnique({ where: { id } });
      if (!product || product.shopId !== shop.id) {
        throw new AppError('Product not found or unauthorized', 404);
      }

      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      res.status(200).json({
        success: true,
        message: 'Vendor product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ==========================================
   * 3. SUPER ADMIN GOVERNANCE ENDPOINTS
   * ==========================================
   */

  static async adminListShops(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ShopService.adminListShops(req.query);
      res.status(200).json({
        success: true,
        message: 'All marketplace shops retrieved',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminGetShopById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shop = await ShopService.adminGetShopById(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Shop details retrieved',
        data: shop,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminUpdateShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shop = await ShopService.adminUpdateShop(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Shop updated successfully',
        data: shop,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminListPayouts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ShopService.adminListPayouts(req.query);
      res.status(200).json({
        success: true,
        message: 'Vendor payout requests retrieved',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminProcessPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payout = await ShopService.adminProcessPayout(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: `Payout marked as ${payout.status}`,
        data: payout,
      });
    } catch (error) {
      next(error);
    }
  }
}
