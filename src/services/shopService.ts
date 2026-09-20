import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { ShopStatus, SubOrderStatus, PayoutStatus, Role, OrderStatus, PaymentStatus, WalletTxType, WalletTxCategory } from '@prisma/client';
import { CashfreeService } from './cashfreeService';
import crypto from 'crypto';

export class ShopService {
  /**
   * ==========================================
   * 1. PUBLIC STOREFRONT APIs
   * ==========================================
   */

  /**
   * List active public shops with search, location, and rating filtering
   */
  static async listPublicShops(query: any) {
    const {
      search,
      city,
      isOpen,
      page = 1,
      limit = 20,
      sortBy = 'rating', // 'rating', 'newest', 'products'
    } = query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      status: ShopStatus.ACTIVE,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }

    if (isOpen !== undefined) {
      where.isOpen = isOpen === 'true';
    }

    const orderBy: any = {};
    if (sortBy === 'newest') {
      orderBy.createdAt = 'desc';
    } else {
      orderBy.rating = 'desc';
    }

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          bannerUrl: true,
          city: true,
          state: true,
          isOpen: true,
          rating: true,
          reviewCount: true,
          _count: {
            select: { products: { where: { isActive: true } } },
          },
        },
      }),
      prisma.shop.count({ where }),
    ]);

    const formatted = shops.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      logoUrl: s.logoUrl,
      bannerUrl: s.bannerUrl,
      location: s.city ? `${s.city}, ${s.state || ''}`.trim() : null,
      isOpen: s.isOpen,
      rating: Number(s.rating),
      reviewCount: s.reviewCount,
      activeProductsCount: s._count.products,
    }));

    return {
      shops: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get public shop profile and overview by slug
   */
  static async getPublicShopBySlug(slug: string) {
    const shop = await prisma.shop.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            products: { where: { isActive: true } },
          },
        },
      },
    });

    if (!shop || shop.status !== ShopStatus.ACTIVE) {
      throw new AppError('Shop not found or not active', 404);
    }

    return {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      description: shop.description,
      logoUrl: shop.logoUrl,
      bannerUrl: shop.bannerUrl,
      isOpen: shop.isOpen,
      rating: Number(shop.rating),
      reviewCount: shop.reviewCount,
      city: shop.city,
      state: shop.state,
      supportPhone: shop.supportPhone,
      businessEmail: shop.businessEmail,
      activeProductsCount: shop._count.products,
      joinedAt: shop.createdAt,
    };
  }

  /**
   * Get products belonging to a specific shop with filtering
   */
  static async getPublicShopProducts(slug: string, query: any) {
    const shop = await prisma.shop.findUnique({
      where: { slug },
    });

    if (!shop || shop.status !== ShopStatus.ACTIVE) {
      throw new AppError('Shop not found or not active', 404);
    }

    const {
      search,
      categoryId,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
      sort = 'newest',
    } = query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      shopId: shop.id,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice || maxPrice) {
      where.sellingPrice = {};
      if (minPrice) where.sellingPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.sellingPrice.lte = parseFloat(maxPrice);
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { sellingPrice: 'asc' };
    if (sort === 'price_desc') orderBy = { sellingPrice: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { select: { id: true, imageUrl: true, isPrimary: true }, orderBy: { sortOrder: 'asc' } },
          variants: { where: { isActive: true }, select: { id: true, sku: true, size: true, color: true, price: true, stockQuantity: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        rating: Number(shop.rating),
      },
      products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * ==========================================
   * 2. VENDOR PORTAL APIs (Shop Owners)
   * ==========================================
   */

  /**
   * Vendor Registration: Customer registers to become a vendor / opens a shop
   */
  static async registerVendorShop(userId: string, data: any) {
    const {
      name,
      description,
      businessEmail,
      businessPhone,
      supportPhone,
      addressLine,
      city,
      state,
      pincode,
      gstin,
      panNumber,
      bankAccountNumber,
      bankIfsc,
      bankBeneficiaryName,
      logoUrl,
      bannerUrl,
    } = data;

    if (!name) {
      throw new AppError('Shop name is required');
    }

    // Check if user already owns an active or pending shop
    const existing = await prisma.shop.findFirst({
      where: { ownerId: userId },
    });

    if (existing) {
      throw new AppError(`You already have a registered shop: "${existing.name}" (Status: ${existing.status})`);
    }

    // Generate unique slug
    let baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    if (!baseSlug) baseSlug = 'shop';

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.shop.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create shop in PENDING_VERIFICATION state
    const shop = await prisma.$transaction(async (tx) => {
      const created = await tx.shop.create({
        data: {
          ownerId: userId,
          name: name.trim(),
          slug,
          description: description || null,
          businessEmail: businessEmail || null,
          businessPhone: businessPhone || null,
          supportPhone: supportPhone || null,
          addressLine: addressLine || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
          gstin: gstin || null,
          panNumber: panNumber || null,
          bankAccountNumber: bankAccountNumber || null,
          bankIfsc: bankIfsc || null,
          bankBeneficiaryName: bankBeneficiaryName || null,
          logoUrl: logoUrl || null,
          bannerUrl: bannerUrl || null,
          status: ShopStatus.PENDING_VERIFICATION,
        },
      });

      // Update user role to VENDOR if not already admin
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user && user.role !== Role.ADMIN) {
        await tx.user.update({
          where: { id: userId },
          data: { role: Role.VENDOR },
        });
      }

      return created;
    });

    return {
      message: 'Shop registration submitted successfully. It will be reviewed and approved by Admin.',
      shop,
    };
  }

  /**
   * Get shop owned by the logged-in vendor
   */
  static async getMyVendorShop(userId: string) {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: userId },
    });

    if (!shop) {
      throw new AppError('No shop found for this account. Please register your shop first.', 404);
    }

    return shop;
  }

  /**
   * Update shop details by owner
   */
  static async updateMyVendorShop(userId: string, data: any) {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: userId },
    });

    if (!shop) {
      throw new AppError('Shop not found for this account', 404);
    }

    const {
      name,
      description,
      logoUrl,
      bannerUrl,
      isOpen,
      businessEmail,
      businessPhone,
      supportPhone,
      addressLine,
      city,
      state,
      pincode,
      gstin,
      panNumber,
      bankAccountNumber,
      bankIfsc,
      bankBeneficiaryName,
    } = data;

    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(isOpen !== undefined && { isOpen: Boolean(isOpen) }),
        ...(businessEmail !== undefined && { businessEmail }),
        ...(businessPhone !== undefined && { businessPhone }),
        ...(supportPhone !== undefined && { supportPhone }),
        ...(addressLine !== undefined && { addressLine }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(pincode !== undefined && { pincode }),
        ...(gstin !== undefined && { gstin }),
        ...(panNumber !== undefined && { panNumber }),
        ...(bankAccountNumber !== undefined && { bankAccountNumber }),
        ...(bankIfsc !== undefined && { bankIfsc }),
        ...(bankBeneficiaryName !== undefined && { bankBeneficiaryName }),
      },
    });

    return updated;
  }

  /**
   * Vendor Dashboard: Summary metrics (orders, earnings, balance, products)
   */
  static async getVendorDashboard(userId: string) {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: userId },
    });

    if (!shop) {
      throw new AppError('Shop not found for this account', 404);
    }
    
    return this.getDashboardMetricsForShop(shop);
  }

  static async getDashboardMetricsForShop(shop: any) {
    const [
      totalProducts,
      totalSubOrders,
      pendingFulfillment,
      recentSubOrders,
      payoutsSum,
    ] = await Promise.all([
      prisma.product.count({ where: { shopId: shop.id } }),
      prisma.subOrder.count({ where: { shopId: shop.id } }),
      prisma.subOrder.count({
        where: {
          shopId: shop.id,
          status: { in: [SubOrderStatus.CONFIRMED, SubOrderStatus.PROCESSING] },
        },
      }),
      prisma.subOrder.findMany({
        where: { shopId: shop.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          parentOrder: {
            select: {
              orderNumber: true,
              addressSnapshot: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.shopPayout.aggregate({
        where: { shopId: shop.id, status: PayoutStatus.PAID },
        _sum: { amount: true },
      }),
    ]);

    return {
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        status: shop.status,
        isOpen: shop.isOpen,
        commissionRate: Number(shop.commissionRate),
        balance: Number(shop.balance),
        totalEarned: Number(shop.totalEarned),
        totalPaidOut: Number(payoutsSum._sum.amount || 0),
        rating: Number(shop.rating),
      },
      stats: {
        totalProducts,
        totalSubOrders,
        pendingFulfillment,
      },
      recentOrders: recentSubOrders,
    };
  }

  /**
   * Vendor Orders: List sub-orders belonging to this shop
   */
  static async getVendorSubOrders(userId: string, query: any) {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: userId },
    });

    if (!shop) {
      throw new AppError('Shop not found for this account', 404);
    }

    const { status, page = 1, limit = 20 } = query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { shopId: shop.id };
    if (status) {
      where.status = status;
    }

    const [subOrders, total] = await Promise.all([
      prisma.subOrder.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          parentOrder: {
            select: {
              orderNumber: true,
              paymentMethod: true,
              paymentStatus: true,
              addressSnapshot: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.subOrder.count({ where }),
    ]);

    return {
      subOrders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Update sub-order fulfillment status (Processing, Shipped with tracking, Delivered)
   */
  static async updateSubOrderStatus(userId: string, subOrderId: string, data: any) {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: userId },
    });

    if (!shop) {
      throw new AppError('Shop not found for this account', 404);
    }

    const subOrder = await prisma.subOrder.findFirst({
      where: { id: subOrderId, shopId: shop.id },
      include: { parentOrder: true, items: true },
    });

    if (!subOrder) {
      throw new AppError('Sub-order not found for your shop', 404);
    }

    const {
      status,
      courierPartner,
      trackingNumber,
      trackingUrl,
      cancelReason,
    } = data;

    if (!status || !Object.values(SubOrderStatus).includes(status)) {
      throw new AppError(`Valid status required (${Object.values(SubOrderStatus).join(', ')})`);
    }

    const updateData: any = { status };

    if (status === SubOrderStatus.SHIPPED) {
      updateData.shippedAt = new Date();
      if (courierPartner) updateData.courierPartner = courierPartner;
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
      if (trackingUrl) updateData.trackingUrl = trackingUrl;
    }

    if (status === SubOrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    if (status === SubOrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = cancelReason || 'Cancelled by Vendor';
    }

    // Execute update in transaction
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.subOrder.update({
        where: { id: subOrderId },
        data: updateData,
        include: { items: true },
      });

      // When sub-order is marked DELIVERED, credit the vendor balance if not already credited
      if (status === SubOrderStatus.DELIVERED && subOrder.status !== SubOrderStatus.DELIVERED) {
        const payoutCredit = Number(subOrder.shopPayoutAmount);
        await tx.shop.update({
          where: { id: shop.id },
          data: {
            balance: { increment: payoutCredit },
            totalEarned: { increment: payoutCredit },
          },
        });
      }

      // If vendor cancelled, trigger partial refund for this subOrder and restock
      if (status === SubOrderStatus.CANCELLED && subOrder.status !== SubOrderStatus.CANCELLED) {
        // Restock items
        for (const item of subOrder.items) {
          await tx.inventoryTransaction.create({
            data: { variantId: item.variantId, quantity: item.quantity, type: 'RETURN', referenceId: subOrder.id }
          });
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }

        const refundAmt = Number(subOrder.subtotal);

        // Calculate refund
        if (subOrder.parentOrder.paymentStatus === PaymentStatus.SUCCESS && refundAmt > 0) {
          // Here we assume it was a Cashfree payment if not COD.
          // For simplicity, we fallback to wallet if it was a wallet-only order, 
          // or we just process Cashfree partial refund.
          const payments = await tx.payment.findMany({ where: { orderId: subOrder.parentOrderId } });
          const cashfreePayment = payments.find(p => p.status === PaymentStatus.SUCCESS && p.method !== 'COD');
          
          if (cashfreePayment) {
            const refundId = `SREF-${subOrder.subOrderNumber}-${Date.now()}`;
            try {
              const cfResult = await CashfreeService.initiateRefund({
                orderId: subOrder.parentOrderId,
                refundAmount: refundAmt,
                refundId,
                refundNote: cancelReason || 'Vendor cancelled part of order',
              });
              
              await tx.refund.create({
                data: {
                  orderId: subOrder.parentOrderId,
                  paymentId: cashfreePayment.id,
                  cfRefundId: cfResult?.cfRefundId || refundId,
                  amount: refundAmt,
                  reason: cancelReason || 'Vendor cancelled subOrder',
                  status: PaymentStatus.SUCCESS,
                  processedAt: new Date(),
                },
              });
            } catch (err: any) {
              console.error('[SUB-ORDER CANCEL] Cashfree refund initiation error:', err?.message || err);
            }
          } else {
             // If paid via wallet or COD, we might just credit wallet
             if (subOrder.parentOrder.paymentMethod !== 'COD' || Number(subOrder.parentOrder.walletAmount) > 0) {
                let wallet = await tx.wallet.findUnique({ where: { userId: subOrder.parentOrder.userId } });
                if (!wallet) {
                  wallet = await tx.wallet.create({ data: { userId: subOrder.parentOrder.userId, balance: 0 } });
                }
                const balanceBefore = Number(wallet.balance);
                const balanceAfter = balanceBefore + refundAmt;

                await tx.wallet.update({
                  where: { id: wallet.id },
                  data: { balance: balanceAfter },
                });

                await tx.walletTransaction.create({
                  data: {
                    walletId: wallet.id,
                    amount: refundAmt,
                    balanceBefore,
                    balanceAfter,
                    type: WalletTxType.CREDIT,
                    category: WalletTxCategory.REFUND,
                    referenceType: 'ORDER',
                    referenceId: subOrder.parentOrderId,
                    description: `Refund for vendor-cancelled subOrder #${subOrder.subOrderNumber}`,
                  },
                });
             }
          }
        }
      }

      // Check if all sub-orders of the parent order are now DELIVERED, SHIPPED, or CANCELLED
      const allSubOrders = await tx.subOrder.findMany({
        where: { parentOrderId: subOrder.parentOrderId },
      });

      const nonCancelled = allSubOrders.filter(s => s.status !== SubOrderStatus.CANCELLED);
      
      if (allSubOrders.every(s => s.status === SubOrderStatus.CANCELLED)) {
        // All subOrders cancelled, cancel parent order too
        await tx.order.update({
          where: { id: subOrder.parentOrderId },
          data: { 
            status: OrderStatus.CANCELLED,
            ...(subOrder.parentOrder.paymentStatus === PaymentStatus.SUCCESS && {
              paymentStatus: PaymentStatus.REFUNDED
            })
          },
        });
      } else if (nonCancelled.length > 0) {
        const allDelivered = nonCancelled.every((s) => s.status === SubOrderStatus.DELIVERED);
        const allShippedOrDelivered = nonCancelled.every((s) =>
          ([SubOrderStatus.SHIPPED, SubOrderStatus.DELIVERED] as SubOrderStatus[]).includes(s.status)
        );

        if (allDelivered) {
          await tx.order.update({
            where: { id: subOrder.parentOrderId },
            data: { status: OrderStatus.DELIVERED },
          });
        } else if (allShippedOrDelivered) {
          await tx.order.update({
            where: { id: subOrder.parentOrderId },
            data: { status: OrderStatus.SHIPPED },
          });
        }
      }

      return result;
    });

    return updated;
  }

  /**
   * Request Payout by Vendor
   */
  static async requestVendorPayout(userId: string, amount: number, notes?: string) {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: userId },
    });

    if (!shop) {
      throw new AppError('Shop not found for this account', 404);
    }

    if (amount <= 0) {
      throw new AppError('Payout amount must be greater than 0');
    }

    const currentBalance = Number(shop.balance);
    if (amount > currentBalance) {
      throw new AppError(`Insufficient shop balance. Available: ₹${currentBalance}, Requested: ₹${amount}`);
    }

    if (!shop.bankAccountNumber || !shop.bankIfsc) {
      throw new AppError('Please complete your bank account details before requesting a payout');
    }

    const payout = await prisma.$transaction(async (tx) => {
      // Deduct balance
      await tx.shop.update({
        where: { id: shop.id },
        data: { balance: { decrement: amount } },
      });

      // Create payout record
      const newPayout = await tx.shopPayout.create({
        data: {
          shopId: shop.id,
          amount,
          status: PayoutStatus.PENDING,
          notes: notes || 'Vendor requested payout',
        },
      });

      // Find eligible subOrders to link
      const eligibleSubOrders = await tx.subOrder.findMany({
        where: {
          shopId: shop.id,
          status: SubOrderStatus.DELIVERED,
          payoutItem: null, // Ensure it is not already paid out
        },
        include: {
          refunds: true, // Fetch refunds to calculate adjustments
        },
        orderBy: { deliveredAt: 'asc' }
      });

      let accumulatedAmount = 0;
      for (const so of eligibleSubOrders) {
        if (accumulatedAmount >= amount) break;
        
        const subPayoutAmt = Number(so.shopPayoutAmount);
        
        // Calculate total refund adjustment for this sub-order
        const refundAdjustment = so.refunds.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
        const netAmount = subPayoutAmt - refundAdjustment;
        
        await tx.shopPayoutItem.create({
          data: {
            payoutId: newPayout.id,
            subOrderId: so.id,
            grossAmount: subPayoutAmt,
            commission: Number(so.commissionAmount),
            refundAdjustment: refundAdjustment,
            netAmount: netAmount
          }
        });
        
        // Also link it in the SubOrder
        await tx.subOrder.update({
          where: { id: so.id },
          data: { payoutId: newPayout.id }
        });

        accumulatedAmount += subPayoutAmt;
      }

      return newPayout;
    });

    return {
      message: 'Payout request submitted successfully. Super Admin will review and process.',
      payout,
    };
  }

  /**
   * List vendor's payout requests
   */
  static async getVendorPayouts(userId: string) {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: userId },
    });

    if (!shop) {
      throw new AppError('Shop not found for this account', 404);
    }

    return prisma.shopPayout.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * ==========================================
   * 3. SUPER ADMIN GOVERNANCE APIs
   * ==========================================
   */

  /**
   * Admin: List all marketplace shops with search and status filtering
   */
  static async adminListShops(query: any) {
    const { status, search, page = 1, limit = 20 } = query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } },
        { businessPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, name: true, email: true, phone: true },
          },
          _count: {
            select: { products: true, subOrders: true },
          },
        },
      }),
      prisma.shop.count({ where }),
    ]);

    return {
      shops,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Admin: Get shop details by ID
   */
  static async adminGetShopById(shopId: string) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        _count: { select: { products: true, subOrders: true, payouts: true } },
      },
    });

    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    return shop;
  }

  /**
   * Admin: Update shop status (Approve, Suspend, Close) or commission rate
   */
  static async adminUpdateShop(shopId: string, data: any) {
    const { 
      status, commissionRate, isOpen,
      name, description, contactEmail, contactPhone,
      deliveryEnabled, deliveryRadiusKm,
      usePincodeRules, useRegionRules, useCountryRules
    } = data;

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new AppError('Shop not found', 404);

    const updateData: any = {};

    if (status) {
      if (!Object.values(ShopStatus).includes(status)) {
        throw new AppError(`Invalid shop status. Valid values: ${Object.values(ShopStatus).join(', ')}`);
      }
      updateData.status = status;
    }

    if (commissionRate !== undefined) {
      const rate = parseFloat(commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        throw new AppError('Commission rate must be between 0 and 100%');
      }
      updateData.commissionRate = rate;
    }

    if (isOpen !== undefined) updateData.isOpen = Boolean(isOpen);
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (deliveryEnabled !== undefined) updateData.deliveryEnabled = Boolean(deliveryEnabled);
    if (deliveryRadiusKm !== undefined) updateData.deliveryRadiusKm = Number(deliveryRadiusKm);
    if (usePincodeRules !== undefined) updateData.usePincodeRules = Boolean(usePincodeRules);
    if (useRegionRules !== undefined) updateData.useRegionRules = Boolean(useRegionRules);
    if (useCountryRules !== undefined) updateData.useCountryRules = Boolean(useCountryRules);

    const updated = await prisma.shop.update({
      where: { id: shopId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Admin: List all vendor payout requests
   */
  static async adminListPayouts(query: any) {
    const { status, page = 1, limit = 20 } = query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;

    const [payouts, total] = await Promise.all([
      prisma.shopPayout.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              bankAccountNumber: true,
              bankIfsc: true,
              bankBeneficiaryName: true,
            },
          },
        },
      }),
      prisma.shopPayout.count({ where }),
    ]);

    return {
      payouts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  static async getDashboardMetrics(shopId: string): Promise<any> {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      activeProducts: 0
    };
  }

  /**
   * Admin: Process or reject a payout request
   */
  static async adminProcessPayout(payoutId: string, data: any) {
    const { status, bankReference, notes } = data;

    const payout = await prisma.shopPayout.findUnique({
      where: { id: payoutId },
      include: { shop: true },
    });

    if (!payout) throw new AppError('Payout record not found', 404);

    if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.PROCESSING) {
      throw new AppError(`Payout already in ${payout.status} state. Cannot modify.`);
    }

    if (!status || ![PayoutStatus.PAID, PayoutStatus.REJECTED, PayoutStatus.PROCESSING].includes(status)) {
      throw new AppError('Valid payout status required (PAID, REJECTED, PROCESSING)');
    }

    const processed = await prisma.$transaction(async (tx) => {
      // If rejected, refund the amount back to the vendor shop balance
      if (status === PayoutStatus.REJECTED) {
        await tx.shop.update({
          where: { id: payout.shopId },
          data: { balance: { increment: payout.amount } },
        });
      }

      return tx.shopPayout.update({
        where: { id: payoutId },
        data: {
          status,
          bankReference: bankReference || payout.bankReference,
          notes: notes || payout.notes,
          processedAt: status === PayoutStatus.PAID ? new Date() : null,
        },
      });
    });

    return processed;
  }
}
