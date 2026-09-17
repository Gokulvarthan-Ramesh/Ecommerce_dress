import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { SystemSettingService } from '../services/systemSettingService';
import { WalletService } from '../services/walletService';
import { CashfreeService } from '../services/cashfreeService';
import { ReferralService } from '../services/referralService';
import { NotificationService } from '../services/notificationService';
import { GoogleDriveService } from '../services/googleDriveService';
import { OrderStatus, PaymentStatus, WalletTxCategory } from '@prisma/client';
import { ApiResponse } from '../utils/response';

export class AdminController {
  /**
   * Admin Dashboard KPI Statistics
   */
  static async getDashboardMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalOrders,
        todayOrders,
        totalCustomers,
        totalProducts,
        lowStockVariants,
        ordersByStatus,
        recentOrders,
        todayRevenueSum,
      ] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { createdAt: { gte: today } } }),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.product.count({ where: { isActive: true } }),
        prisma.productVariant.count({ where: { stockQuantity: { lte: 5 } } }),
        prisma.order.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true, email: true } } },
        }),
        prisma.order.aggregate({
          where: { 
            paymentStatus: PaymentStatus.SUCCESS,
            createdAt: { gte: today }
          },
          _sum: { paymentAmount: true },
        }),
      ]);

      const data = {
        todaysSales: Number(todayRevenueSum._sum.paymentAmount || 0),
        totalOrders,
        todayOrders,
        totalCustomers,
        totalProducts,
        lowStock: lowStockVariants,
        pendingOrders: ordersByStatus.find(o => o.status === OrderStatus.PENDING_PAYMENT)?._count.id || 0,
        ordersByStatus: ordersByStatus.reduce((acc: any, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        }, {}),
        recentOrders,
      };

      ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create or Update Category
   */
  static async saveCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, name, slug, description, image, imageUrl, level = 1, sortOrder = 0, parentId, isActive = true } = req.body;

      if (!name || !slug) {
        throw new AppError('Category name and unique slug are required');
      }

      const rawImg = imageUrl || image;
      let formattedImage = rawImg;
      if (rawImg) {
        formattedImage = GoogleDriveService.formatToDirectImageUrl(rawImg);
      }

      const category = await prisma.category.upsert({
        where: { id: id || 'new-category' },
        update: { name, slug, description, imageUrl: formattedImage, level: Number(level), sortOrder: Number(sortOrder), parentId, isActive },
        create: { name, slug, description, imageUrl: formattedImage, level: Number(level), sortOrder: Number(sortOrder), parentId, isActive },
      });

      ApiResponse.success(res, category, 'Category saved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle Category Status (Active/Inactive) with optional recursive cascade to subcategories
   */
  static async toggleCategoryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive, cascade = false } = req.body;

      const category = await prisma.category.findUnique({ where: { id } });
      if (!category) {
        throw new AppError('Category not found', 404);
      }

      const newStatus = typeof isActive === 'boolean' ? isActive : !category.isActive;

      // Update category
      const updated = await prisma.category.update({
        where: { id },
        data: { isActive: newStatus },
      });

      // If cascade is true, update all child subcategories as well
      if (cascade) {
        const level2Children = await prisma.category.findMany({
          where: { parentId: id },
          select: { id: true },
        });
        const level2Ids = level2Children.map(c => c.id);

        await prisma.category.updateMany({
          where: {
            OR: [
              { parentId: id },
              ...(level2Ids.length > 0 ? [{ parentId: { in: level2Ids } }] : []),
            ],
          },
          data: { isActive: newStatus },
        });
      }

      ApiResponse.success(
        res,
        updated,
        `Category "${updated.name}" is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}${cascade ? ' (cascaded to subcategories)' : ''}.`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete Category (Prevents deletion if used by products)
   */
  static async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id },
        include: { _count: { select: { products: true, children: true } } },
      });

      if (!category) {
        throw new AppError('Category not found', 404);
      }

      if (category._count.products > 0) {
        throw new AppError(`Cannot delete category. It is currently used by ${category._count.products} product(s). Deactivate it instead.`);
      }

      if (category._count.children > 0) {
        throw new AppError(`Cannot delete category with ${category._count.children} active subcategory(ies). Delete or reassign subcategories first.`);
      }

      await prisma.category.delete({
        where: { id },
      });

      ApiResponse.success(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create or Update Product with Size and Color Variants
   */
  static async saveProductWithVariants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        id,
        name,
        slug,
        description,
        brand,
        fabric,
        fit,
        sleeve,
        pattern,
        categoryId,
        basePrice,
        sellingPrice,
        buyingPrice,
        isFeatured = false,
        isActive = true,
        images = [],
        variants = [],
      } = req.body;

      if (!name || !slug || !categoryId || basePrice === undefined || sellingPrice === undefined) {
        throw new AppError('Name, slug, categoryId, basePrice, and sellingPrice are required');
      }

      const formattedImages = GoogleDriveService.formatImageUrls(images || []);

      const product = await prisma.$transaction(async (tx) => {
        const prod = await tx.product.upsert({
          where: { id: id || 'new-product' },
          update: {
            name,
            slug,
            description,
            brand,
            fabric,
            fit,
            sleeve,
            pattern,
            categoryId,
            basePrice,
            sellingPrice,
            buyingPrice,
            isFeatured,
            isActive,
            images: {
              deleteMany: {},
              create: formattedImages.map((imageUrl, i) => ({ imageUrl, sortOrder: i, isPrimary: i === 0 }))
            }
          },
          create: {
            name,
            slug,
            description,
            brand,
            fabric,
            fit,
            sleeve,
            pattern,
            categoryId,
            basePrice,
            sellingPrice,
            buyingPrice,
            isFeatured,
            isActive,
            images: {
              create: formattedImages.map((imageUrl, i) => ({ imageUrl, sortOrder: i, isPrimary: i === 0 }))
            }
          },
        });

        // Upsert variants
        for (const variant of variants) {
          if (!variant.sku || !variant.size || !variant.color) {
            throw new AppError('Each variant must have sku, size, and color');
          }

          await tx.productVariant.upsert({
            where: { sku: variant.sku },
            update: {
              size: variant.size,
              color: variant.color,
              colorHex: variant.colorHex,
              price: variant.price || 0,
              stockQuantity: variant.stockQuantity ?? 0,
              isActive: variant.isActive ?? true,
            },
            create: {
              productId: prod.id,
              sku: variant.sku,
              size: variant.size,
              color: variant.color,
              colorHex: variant.colorHex,
              price: variant.price || 0,
              stockQuantity: variant.stockQuantity ?? 0,
              isActive: variant.isActive ?? true,
            },
          });
        }

        return tx.product.findUnique({
          where: { id: prod.id },
          include: { variants: true },
        });
      });

      ApiResponse.success(res, product, 'Product and variants saved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Variant Stock directly
   */
  static async updateVariantStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { variantId } = req.params;
      const { stockQuantity } = req.body;

      if (typeof stockQuantity !== 'number' || stockQuantity < 0) {
        throw new AppError('Stock quantity must be a non-negative number');
      }

      const variant = await prisma.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity },
      });

      ApiResponse.success(res, variant, 'Stock updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all orders with filtering and pagination
   */
  static async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, paymentStatus, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (status) where.status = status as OrderStatus;
      if (paymentStatus) where.paymentStatus = paymentStatus as PaymentStatus;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            orderItems: true,
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.order.count({ where }),
      ]);

      ApiResponse.success(res, {
        orders,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single order details for admin
   */
  static async getOrderDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          orderItems: true,
          payments: true,
          refunds: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      ApiResponse.success(res, order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Order Status (Pending -> Confirmed -> Shipped -> Delivered -> Cancelled)
   * When status is updated to DELIVERED, automatically triggers referral rewards!
   */
  static async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !Object.values(OrderStatus).includes(status)) {
        throw new AppError('Valid order status is required');
      }

      const order = await prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      const updatedOrder = await prisma.$transaction(async (tx) => {
        const o = await tx.order.update({
          where: { id },
          data: {
            status,
            ...(status === OrderStatus.DELIVERED && order.paymentMethod === 'COD' && {
              paymentStatus: PaymentStatus.SUCCESS,
            }),
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: o.id,
            oldStatus: order.status,
            newStatus: status,
            changedBy: 'ADMIN', // Or req.user.id if available
            reason: 'Status updated by admin',
          },
        });

        return o;
      });

      // TRIGGER REFERRAL REWARDS IF ORDER REACHED DELIVERED!
      if (status === OrderStatus.DELIVERED) {
        await ReferralService.processOrderDeliveryReferralReward(updatedOrder.id);
        NotificationService.orderDelivered(order.userId, order.orderNumber).catch(() => {});
      } else if (status === OrderStatus.SHIPPED) {
        NotificationService.orderShipped(order.userId, order.orderNumber).catch(() => {});
      } else if (status === OrderStatus.CONFIRMED) {
        NotificationService.orderConfirmed(order.userId, order.orderNumber).catch(() => {});
      }

      ApiResponse.success(res, updatedOrder, `Order status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initiate Cashfree Refund from Admin Panel
   */
  static async triggerCashfreeRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId, amount, reason } = req.body;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });

      if (!order) throw new AppError('Order not found', 404);
      if (order.paymentStatus !== PaymentStatus.SUCCESS) {
        throw new AppError('Only paid orders can be refunded via Cashfree');
      }

      const refundId = `ADMIN-REF-${order.orderNumber}-${Date.now()}`;
      const refundAmount = amount ? Number(amount) : Number(order.paymentAmount);

      const refundResult = await CashfreeService.initiateRefund({
        orderId: order.id,
        refundAmount,
        refundId,
        refundNote: reason || 'Admin initiated refund',
      });

      await prisma.$transaction([
        prisma.refund.create({
          data: {
            orderId: order.id,
            cfRefundId: refundResult.cfRefundId || refundId,
            amount: refundAmount,
            reason: reason || 'Admin initiated refund',
            status: PaymentStatus.SUCCESS,
            processedAt: new Date(),
          },
        }),
        prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: PaymentStatus.REFUNDED },
        }),
      ]);

      ApiResponse.success(res, refundResult, 'Refund processed successfully with Cashfree');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manual Wallet Adjustment (Credit or Debit)
   */
  static async adjustCustomerWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, amount, type, description } = req.body;

      if (!userId || !amount || !type || !description) {
        throw new AppError('userId, amount, type (CREDIT/DEBIT), and description are required');
      }

      let result;
      if (type === 'CREDIT') {
        result = await WalletService.creditWallet({
          userId,
          amount: Number(amount),
          category: WalletTxCategory.ADMIN_ADJUSTMENT,
          description: `Admin adjustment: ${description}`,
        });
      } else {
        result = await WalletService.debitWallet({
          userId,
          amount: Number(amount),
          category: WalletTxCategory.ADMIN_ADJUSTMENT,
          description: `Admin adjustment: ${description}`,
        });
      }

      ApiResponse.success(res, result, 'Customer wallet adjusted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all dynamic system settings
   */
  static async getSystemSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await SystemSettingService.getAllSettings();
      ApiResponse.success(res, settings);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update dynamic system setting (e.g. first_order_offer, referral_program, shipping, payments)
   */
  static async updateSystemSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;
      const { value, description } = req.body;

      if (!value) {
        throw new AppError('Setting value is required');
      }

      const updated = await SystemSettingService.updateSetting(key, value, description);

      ApiResponse.success(res, updated, `Setting "${key}" updated successfully. Changes are now live.`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all offers
   */
  static async getOffers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const offers = await prisma.offer.findMany({
        orderBy: { createdAt: 'desc' },
      });
      ApiResponse.success(res, offers);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create or Update Offer
   */
  static async saveOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        id,
        name,
        type,
        value,
        minimumOrderAmount = 0,
        firstOrderOnly = false,
        perUserLimit = 1,
        usageLimit,
        startAt,
        endAt,
        isActive = true,
      } = req.body;

      if (!name || !type || value === undefined) {
        throw new AppError('Name, type (FIXED/PERCENTAGE), and value are required');
      }

      const offer = await prisma.offer.upsert({
        where: { id: id || 'new-offer' },
        update: {
          name,
          type,
          value,
          minimumOrderAmount,
          firstOrderOnly,
          perUserLimit,
          usageLimit,
          startAt: startAt ? new Date(startAt) : null,
          endAt: endAt ? new Date(endAt) : null,
          isActive,
        },
        create: {
          name,
          type,
          value,
          minimumOrderAmount,
          firstOrderOnly,
          perUserLimit,
          usageLimit,
          startAt: startAt ? new Date(startAt) : null,
          endAt: endAt ? new Date(endAt) : null,
          isActive,
        },
      });

      ApiResponse.success(res, offer, 'Offer saved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed profile of a customer for the Admin Customer Page
   */
  static async getCustomerDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          wallet: true,
          orders: {
            where: { status: { not: OrderStatus.PENDING_PAYMENT } }, // Only count actual orders
            orderBy: { createdAt: 'desc' },
          },
          referralsMade: {
            where: { status: 'CREDITED' },
          },
        },
      });

      if (!user) {
        throw new AppError('Customer not found', 404);
      }

      // Calculate total spent (only successful payments)
      const totalSpent = user.orders
        .filter((o: any) => o.paymentStatus === PaymentStatus.SUCCESS)
        .reduce((sum: number, o: any) => sum + Number(o.paymentAmount), 0);

      const customerProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        joinedDate: user.createdAt,
        walletBalance: user.wallet ? Number(user.wallet.balance) : 0,
        ordersCount: user.orders.length,
        totalSpent,
        successfulReferrals: user.referralsMade.length,
        lastOrder: user.orders.length > 0 ? {
          orderNumber: user.orders[0].orderNumber,
          status: user.orders[0].status,
          date: user.orders[0].createdAt,
        } : null,
      };

      ApiResponse.success(res, customerProfile);
    } catch (error) {
      next(error);
    }
  }
}
