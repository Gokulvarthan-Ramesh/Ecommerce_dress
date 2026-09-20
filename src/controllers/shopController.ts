import { Request, Response, NextFunction } from 'express';
import { ShopService } from '../services/shopService';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { OrderService } from '../services/OrderService';
import { SecurityService } from '../services/securityService';
import { ApiResponse } from '../utils/response';
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

      const product = await prisma.$transaction(async (tx: any) => {
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

  // --- Vendor Analytical Views (Impersonation) ---
  static async adminGetShopDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId } = req.params;
      const metrics = await ShopService.getDashboardMetrics(shopId);
      ApiResponse.success(res, metrics, 'Shop dashboard metrics retrieved');
    } catch (error) { next(error); }
  }

  static async adminGetShopTopProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId } = req.params;
      const { limit = '5' } = req.query;
      const limitNum = parseInt(limit as string, 10) || 5;

      const topProducts = await prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: { shopId },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: limitNum,
      });

      res.status(200).json({
        success: true,
        message: 'Top products retrieved',
        data: topProducts.map((p: any) => ({
          productId: p.productId,
          productName: p.productName,
          totalQuantitySold: p._sum.quantity || 0,
          totalRevenue: p._sum.totalPrice || 0,
        })),
      });
    } catch (error) { next(error); }
  }

  static async adminGetShopInventoryTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId } = req.params;
      const { page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;

      const transactions = await prisma.inventoryTransaction.findMany({
        where: { variant: { product: { shopId } } },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      });
      ApiResponse.success(res, transactions, 'Shop inventory transactions retrieved');
    } catch (error) { next(error); }
  }

  static async adminGetShopSubOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId } = req.params;
      const { page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;

      const subOrders = await prisma.subOrder.findMany({
        where: { shopId },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      });
      ApiResponse.success(res, subOrders, 'Shop suborders retrieved');
    } catch (error) { next(error); }
  }

  // --- Extended Admin Controls ---
  static async adminDeleteShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.shop.delete({ where: { id } });
      ApiResponse.success(res, null, 'Shop deleted successfully');
    } catch (error) { next(error); }
  }

  static async adminBulkUpdateInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId } = req.params;
      const { updates } = req.body;
      if (!Array.isArray(updates) || updates.length === 0) throw new AppError('updates array is required');

      const results = await prisma.$transaction(async (tx: any) => {
        const processed = [];
        for (const update of updates) {
          const { variantId, quantityChange, type = 'RESTOCK', remarks = 'Admin bulk update' } = update;
          const newVariant = await tx.productVariant.update({
            where: { id: variantId },
            data: { stockQuantity: { increment: quantityChange } }
          });
          const invTx = await tx.inventoryTransaction.create({
            data: { variantId, quantity: quantityChange, type, remarks }
          });
          processed.push({ variant: newVariant, transaction: invTx });
        }
        return processed;
      });
      ApiResponse.success(res, results, 'Bulk inventory updated');
    } catch (error) { next(error); }
  }

  // --- Vendor Onboarding ---
  static async getPendingShops(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shops = await prisma.shop.findMany({
        where: { status: 'PENDING_VERIFICATION' },
        orderBy: { createdAt: 'desc' }
      });
      ApiResponse.success(res, shops, 'Pending shops retrieved');
    } catch (error) { next(error); }
  }

  static async approveShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const shop = await prisma.shop.update({ where: { id }, data: { status: 'ACTIVE' } });
      ApiResponse.success(res, shop, 'Shop approved');
    } catch (error) { next(error); }
  }

  static async rejectShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const shop = await prisma.shop.update({ where: { id }, data: { status: 'CLOSED' } });
      ApiResponse.success(res, shop, 'Shop rejected');
    } catch (error) { next(error); }
  }

  // --- Payout Workflow ---
  static async adminApprovePayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const payout = await prisma.shopPayout.update({ where: { id }, data: { status: 'PROCESSING' } });
      ApiResponse.success(res, payout, 'Payout approved');
    } catch (error) { next(error); }
  }

  static async adminRejectPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const payout = await prisma.shopPayout.update({ where: { id }, data: { status: 'REJECTED' } });
      ApiResponse.success(res, payout, 'Payout rejected');
    } catch (error) { next(error); }
  }

  static async adminMarkPayoutPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const payout = await prisma.shopPayout.update({ where: { id }, data: { status: 'PAID' } });
      ApiResponse.success(res, payout, 'Payout marked as paid');
    } catch (error) { next(error); }
  }

  // --- Missing Vendor Methods ---
  static async processSubOrderReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { subOrderId } = req.params;
      const { action, remarks } = req.body;
      const userId = (req as any).user.id;
      const shop = await ShopService.getMyVendorShop(userId);
      await SecurityService.verifyVendorOwnsResource(shop.id, subOrderId, 'SubOrder');
      
      // using OrderService
      const result = await OrderService.processSubOrderReturn(subOrderId, action, remarks);
      ApiResponse.success(res, result, `Return request ${action}D successfully`);
    } catch (error) { next(error); }
  }

  static async getVendorTopProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const shop = await ShopService.getMyVendorShop(userId);
      const { limit = '5' } = req.query;
      const limitNum = parseInt(limit as string, 10) || 5;

      const topProducts = await prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: { shopId: shop.id },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: limitNum,
      });

      res.status(200).json({
        success: true,
        data: topProducts.map((p: any) => ({
          productId: p.productId,
          productName: p.productName,
          totalQuantitySold: p._sum.quantity || 0,
          totalRevenue: p._sum.totalPrice || 0,
        })),
      });
    } catch (error) { next(error); }
  }

  static async getVendorInventoryTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const shop = await ShopService.getMyVendorShop(userId);
      const { page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;

      const transactions = await prisma.inventoryTransaction.findMany({
        where: { variant: { product: { shopId: shop.id } } },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      });
      ApiResponse.success(res, transactions, 'Inventory transactions retrieved');
    } catch (error) { next(error); }
  }

  static async bulkUpdateVendorInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const shop = await ShopService.getMyVendorShop(userId);
      const { updates } = req.body;
      if (!Array.isArray(updates) || updates.length === 0) throw new AppError('updates array is required');

      const results = await prisma.$transaction(async (tx: any) => {
        const processed = [];
        for (const update of updates) {
          const { variantId, quantityChange, type = 'RESTOCK', remarks = 'Vendor bulk update' } = update;
          const variant = await tx.productVariant.findFirst({ where: { id: variantId, product: { shopId: shop.id } } });
          if (!variant) throw new AppError(`Variant ${variantId} not found in your shop`, 404);
          
          const newVariant = await tx.productVariant.update({
            where: { id: variantId },
            data: { stockQuantity: { increment: quantityChange } }
          });
          const invTx = await tx.inventoryTransaction.create({
            data: { variantId, quantity: quantityChange, type, remarks }
          });
          processed.push({ variant: newVariant, transaction: invTx });
        }
        return processed;
      });
      ApiResponse.success(res, results, 'Bulk inventory updated');
    } catch (error) { next(error); }
  }
}
