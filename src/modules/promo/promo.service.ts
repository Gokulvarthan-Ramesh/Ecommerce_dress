
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { ApiFeatures } from '../../utils/ApiFeatures';
import { PromoError, PROMO_ERROR_CODES } from './promo.constants';
import { generateSecureCodes, normalizeCode } from './promo.utils';
import { Prisma } from '@prisma/client';

export class PromoService {
  // ========================================
  // ADMIN: CAMPAIGN MANAGEMENT
  // ========================================

  static async createCampaign(data: any, createdBy?: string) {
    return prisma.promoCampaign.create({
      data: {
        name: data.name,
        description: data.description,
        discountTypeId: data.discountTypeId,
        campaignTypeId: data.campaignTypeId,
        discountValue: data.discountValue,
        minOrderAmount: data.minimumOrderValue || 0,
        maxDiscount: data.maximumDiscount || null,
        totalUsageLimit: data.totalUsageLimit || null,
        perCustomerLimit: data.perCustomerLimit || 1,
        firstOrderOnly: data.firstOrderOnly || false,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        status: 'ACTIVE',
        createdBy: createdBy || null,
      },
    });
  }

  static async getCampaigns(queryString: any) {
    const features = new ApiFeatures(queryString).filter(['name']).sort().paginate();

    if (queryString.status) features.query.where.status = queryString.status;

    const [total, campaigns] = await Promise.all([
      prisma.promoCampaign.count({ where: features.query.where }),
      prisma.promoCampaign.findMany({
        ...features.query,
        include: {
          _count: { select: { codes: true } },
          campaignType: { select: { code: true, name: true } },
          discountType: { select: { code: true, name: true } },
        },
      }),
    ]);

    const limitParam = queryString.limit === 'all' || queryString.pagination === 'false' ? 'all' : parseInt(queryString.limit || '10', 10);
    return {
      items: campaigns,
      meta: ApiFeatures.getMeta(total, parseInt(queryString.page || '1', 10), limitParam as any),
    };
  }

  static async getCampaignById(id: string) {
    const campaign = await prisma.promoCampaign.findUnique({
      where: { id },
      include: {
        _count: { select: { codes: true } },
          campaignType: { select: { code: true, name: true } },
          discountType: { select: { code: true, name: true } },
        codes: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!campaign) throw new AppError('Campaign not found', 404);
    return campaign;
  }

  static async updateCampaign(id: string, data: any) {
    const existing = await prisma.promoCampaign.findUnique({ where: { id } });
    if (!existing) throw new AppError('Campaign not found', 404);

    return prisma.promoCampaign.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.discountTypeId !== undefined && { discountTypeId: data.discountTypeId }),
        ...(data.campaignTypeId !== undefined && { campaignTypeId: data.campaignTypeId }),
        ...(data.discountValue !== undefined && { discountValue: data.discountValue }),
        ...(data.minimumOrderValue !== undefined && { minOrderAmount: data.minimumOrderValue }),
        ...(data.maximumDiscount !== undefined && { maxDiscount: data.maximumDiscount }),
        ...(data.totalUsageLimit !== undefined && { totalUsageLimit: data.totalUsageLimit }),
        ...(data.perCustomerLimit !== undefined && { perCustomerLimit: data.perCustomerLimit }),
        ...(data.firstOrderOnly !== undefined && { firstOrderOnly: data.firstOrderOnly }),
        ...(data.startsAt !== undefined && { startsAt: data.startsAt ? new Date(data.startsAt) : null }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }

  static async deleteCampaign(id: string) {
    const existing = await prisma.promoCampaign.findUnique({ where: { id } });
    if (!existing) throw new AppError('Campaign not found', 404);
    await prisma.promoCampaign.delete({ where: { id } });
  }

  // ========================================
  // ADMIN: CODE MANAGEMENT
  // ========================================

  static async createCode(data: any) {
    const campaign = await prisma.promoCampaign.findUnique({ where: { id: data.campaignId } });
    if (!campaign) throw new AppError('Campaign not found', 404);

    const code = normalizeCode(data.code);

    // Check uniqueness
    const existing = await prisma.promoCode.findUnique({ where: { code } });
    if (existing) throw new AppError(`Promo code "${code}" already exists`, 409);

    const distType = await prisma.promoCodeDistributionType.findUnique({ where: { id: data.distributionTypeId } });
    if (!distType) throw new AppError('Distribution type not found', 404);

    // If CUSTOMER_SPECIFIC, verify the customer exists
    if (distType.code === 'CUSTOMER_SPECIFIC' && data.customerId) {
      const customer = await prisma.user.findUnique({ where: { id: data.customerId } });
      if (!customer) throw new AppError('Customer not found', 404);
    }

    return prisma.promoCode.create({
      data: {
        campaignId: data.campaignId,
        code,
        distributionTypeId: data.distributionTypeId,
        customerId: distType.code === 'CUSTOMER_SPECIFIC' ? data.customerId : null,
        usageLimit: data.usageLimit || null,
        status: 'ACTIVE',
      },
      include: { campaign: { include: { discountType: true, campaignType: true } }, distributionType: true },
    });
  }

  static async generateCodes(data: any) {
    const campaign = await prisma.promoCampaign.findUnique({ where: { id: data.campaignId } });
    if (!campaign) throw new AppError('Campaign not found', 404);

    const codes = generateSecureCodes(data.prefix.toUpperCase(), data.quantity);

    // Batch insert using createMany for performance
    const uniqueType = await prisma.promoCodeDistributionType.findUnique({ where: { code: 'UNIQUE' } });
    if (!uniqueType) throw new AppError('UNIQUE distribution type not configured in masters', 500);

    const codeRecords = codes.map((code) => ({
      campaignId: data.campaignId,
      code,
      distributionTypeId: uniqueType.id,
      status: 'ACTIVE' as const,
      usageLimit: data.usageLimit || 1,
      usageCount: 0,
    }));

    const result = await prisma.promoCode.createMany({
      data: codeRecords,
      skipDuplicates: true, // If by rare chance there's a collision, skip it
    });

    return {
      generated: result.count,
      requested: data.quantity,
      prefix: data.prefix.toUpperCase(),
      sampleCodes: codes.slice(0, 5),
    };
  }

  static async getCodes(queryString: any) {
    const features = new ApiFeatures(queryString).filter(['code']).sort().paginate();

    if (queryString.status) features.query.where.status = queryString.status;
    if (queryString.distributionTypeId) features.query.where.distributionTypeId = queryString.distributionTypeId;
    if (queryString.campaignId) features.query.where.campaignId = queryString.campaignId;
    if (queryString.customerId) features.query.where.customerId = queryString.customerId;

    const [total, codes] = await Promise.all([
      prisma.promoCode.count({ where: features.query.where }),
      prisma.promoCode.findMany({
        ...features.query,
        include: {
          campaign: { select: { id: true, name: true, discountType: { select: { code: true } }, discountValue: true, status: true } },
          distributionType: { select: { code: true, name: true } },
        },
      }),
    ]);

    const limitParam = queryString.limit === 'all' || queryString.pagination === 'false' ? 'all' : parseInt(queryString.limit || '10', 10);
    return {
      items: codes,
      meta: ApiFeatures.getMeta(total, parseInt(queryString.page || '1', 10), limitParam as any),
    };
  }

  static async getCodeById(id: string) {
    const code = await prisma.promoCode.findUnique({
      where: { id },
      include: {
        campaign: { include: { discountType: { select: { code: true } }, campaignType: true } },
        distributionType: true,
        usages: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
            order: { select: { id: true, orderNumber: true, totalAmount: true } },
          },
        },
      },
    });
    if (!code) throw new AppError('Promo code not found', 404);
    return code;
  }

  static async updateCode(id: string, data: any) {
    const existing = await prisma.promoCode.findUnique({ where: { id } });
    if (!existing) throw new AppError('Promo code not found', 404);

    return prisma.promoCode.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.usageLimit !== undefined && { usageLimit: data.usageLimit }),
      },
    });
  }

  static async deleteCode(id: string) {
    const existing = await prisma.promoCode.findUnique({ where: { id } });
    if (!existing) throw new AppError('Promo code not found', 404);
    await prisma.promoCode.delete({ where: { id } });
  }

  static async getCodeUsage(id: string, queryString: any) {
    const features = new ApiFeatures(queryString).sort().paginate();
    features.query.where.promoCodeId = id;

    const [total, usages] = await Promise.all([
      prisma.promoCodeUsage.count({ where: features.query.where }),
      prisma.promoCodeUsage.findMany({
        ...features.query,
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
          order: { select: { id: true, orderNumber: true, totalAmount: true, status: true } },
        },
      }),
    ]);

    const limitParam = queryString.limit === 'all' || queryString.pagination === 'false' ? 'all' : parseInt(queryString.limit || '10', 10);
    return {
      items: usages,
      meta: ApiFeatures.getMeta(total, parseInt(queryString.page || '1', 10), limitParam as any),
    };
  }

  static async getCampaignAnalytics(campaignId: string) {
    const campaign = await prisma.promoCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new AppError('Campaign not found', 404);

    const [totalCodes, activeCodes, totalUsages, totalDiscount, uniqueCustomers] = await Promise.all([
      prisma.promoCode.count({ where: { campaignId } }),
      prisma.promoCode.count({ where: { campaignId, status: 'ACTIVE' } }),
      prisma.promoCodeUsage.count({ where: { campaignId } }),
      prisma.promoCodeUsage.aggregate({ where: { campaignId }, _sum: { discountAmount: true } }),
      prisma.promoCodeUsage.groupBy({ by: ['userId'], where: { campaignId } }),
    ]);

    return {
      campaign,
      analytics: {
        totalCodes,
        activeCodes,
        exhaustedCodes: totalCodes - activeCodes,
        totalUsages,
        totalDiscountGiven: Number(totalDiscount._sum.discountAmount || 0),
        uniqueCustomers: uniqueCustomers.length,
      },
    };
  }

  static async getCodeAnalytics(id: string) {
    const code = await prisma.promoCode.findUnique({
      where: { id },
      include: { campaign: { include: { discountType: true, campaignType: true } }, distributionType: true },
    });
    if (!code) throw new AppError('Promo code not found', 404);

    const [totalUsages, totalDiscount, uniqueCustomers] = await Promise.all([
      prisma.promoCodeUsage.count({ where: { promoCodeId: id } }),
      prisma.promoCodeUsage.aggregate({ where: { promoCodeId: id }, _sum: { discountAmount: true } }),
      prisma.promoCodeUsage.groupBy({ by: ['userId'], where: { promoCodeId: id } }),
    ]);

    return {
      code,
      analytics: {
        totalUsages,
        usageLimit: code.usageLimit,
        remainingUsages: code.usageLimit ? Math.max(0, code.usageLimit - code.usageCount) : null,
        totalDiscountGiven: Number(totalDiscount._sum.discountAmount || 0),
        uniqueCustomers: uniqueCustomers.length,
      },
    };
  }

  static async getCustomerPromoCodes(userId: string) {
    const now = new Date();
    const codes = await prisma.promoCode.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { distributionType: { code: 'SHARED' } },
          { distributionType: { code: 'CUSTOMER_SPECIFIC' }, customerId: userId },
        ],
        campaign: {
          status: 'ACTIVE',
          OR: [
            { startsAt: null },
            { startsAt: { lte: now } },
          ],
          AND: [
            {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } },
              ],
            },
          ],
        },
      },
      include: {
        campaign: {
          select: {
            name: true,
            description: true,
            discountType: { select: { code: true } },
            discountValue: true,
            minOrderAmount: true,
            maxDiscount: true,
            firstOrderOnly: true,
            expiresAt: true,
          },
        },
        distributionType: { select: { code: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return codes.map((c) => ({
      id: c.id,
      code: c.code,
      distributionType: c.distributionType?.code,
      name: c.campaign.name,
      description: c.campaign.description,
      discountType: (c.campaign.discountType as any)?.code,
      discountValue: c.campaign.discountValue,
      minOrderAmount: c.campaign.minOrderAmount,
      maxDiscount: c.campaign.maxDiscount,
      firstOrderOnly: c.campaign.firstOrderOnly,
      expiresAt: c.campaign.expiresAt,
    }));
  }

  // ========================================
  // CUSTOMER: VALIDATE (PREVIEW ONLY)
  // ========================================

  /**
   * Validate a promo code against the user's current cart.
   * This is for UX preview only — checkout will re-validate authoritatively.
   */
  static async validatePromo(userId: string, code: string) {
    const normalizedCode = normalizeCode(code);

    // 1. Find the promo code
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: normalizedCode },
      include: { campaign: { include: { discountType: true, campaignType: true } }, distributionType: true },
    });

    if (!promoCode) {
      throw new PromoError('Promo code not found', PROMO_ERROR_CODES.PROMO_NOT_FOUND, 404);
    }

    const campaign = promoCode.campaign;

    // 2. Campaign active?
    if (campaign.status !== 'ACTIVE') {
      throw new PromoError('This promotion is no longer active', PROMO_ERROR_CODES.CAMPAIGN_NOT_ACTIVE);
    }

    // 3. Code active?
    if (promoCode.status !== 'ACTIVE') {
      throw new PromoError('This promo code is no longer active', PROMO_ERROR_CODES.PROMO_INACTIVE);
    }

    // 4. Start date
    if (campaign.startsAt && campaign.startsAt > new Date()) {
      throw new PromoError('This promotion has not started yet', PROMO_ERROR_CODES.PROMO_NOT_STARTED);
    }

    // 5. Expiry date
    if (campaign.expiresAt && campaign.expiresAt < new Date()) {
      throw new PromoError('This promo code has expired', PROMO_ERROR_CODES.PROMO_EXPIRED);
    }

    // 6. Code-level usage limit
    if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
      throw new PromoError('This promo code has been fully redeemed', PROMO_ERROR_CODES.PROMO_USAGE_EXHAUSTED);
    }

    // 7. Customer usage limit (per-customer from campaign)
    const customerUsages = await prisma.promoCodeUsage.count({
      where: { promoCodeId: promoCode.id, userId },
    });
    if (customerUsages >= campaign.perCustomerLimit) {
      throw new PromoError('You have already used this promo code the maximum number of times', PROMO_ERROR_CODES.PROMO_CUSTOMER_LIMIT);
    }

    // 8. Customer-specific restriction
    if (promoCode.distributionType.code === 'CUSTOMER_SPECIFIC' && promoCode.customerId !== userId) {
      throw new PromoError('This promo code is not valid for your account', PROMO_ERROR_CODES.PROMO_CUSTOMER_RESTRICTED);
    }

    // 9. First-order requirement
    if (campaign.firstOrderOnly) {
      const existingOrders = await prisma.order.count({
        where: { userId, status: { not: 'CANCELLED' } },
      });
      if (existingOrders > 0) {
        throw new PromoError('This promo code is valid only for first-time orders', PROMO_ERROR_CODES.PROMO_FIRST_ORDER_ONLY);
      }
    }

    // 10. Get cart subtotal
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: { include: { product: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new PromoError('Your cart is empty', PROMO_ERROR_CODES.PROMO_NOT_APPLICABLE);
    }

    const subtotal = cart.items.reduce((sum, item) => {
      const price = Number(item.variant.price);
      return sum + price * item.quantity;
    }, 0);

    // 11. Minimum order check
    if (subtotal < Number(campaign.minOrderAmount)) {
      throw new PromoError(
        `Minimum order of ₹${campaign.minOrderAmount} required. Your cart total is ₹${subtotal.toFixed(2)}.`,
        PROMO_ERROR_CODES.PROMO_MINIMUM_ORDER
      );
    }

    // 12. Calculate discount
    let discount = 0;
    let isFreeDelivery = false;
    
    if (campaign.discountType.code === 'PERCENTAGE') {
      discount = (subtotal * Number(campaign.discountValue)) / 100;
      if (campaign.maxDiscount && Number(campaign.maxDiscount) > 0) {
        discount = Math.min(discount, Number(campaign.maxDiscount));
      }
    } else if (campaign.discountType.code === 'FREE_DELIVERY') {
      isFreeDelivery = true;
    } else {
      discount = Math.min(Number(campaign.discountValue), subtotal);
    }

    discount = Math.round(discount * 100) / 100;

    return {
      valid: true,
      promoCodeId: promoCode.id,
      code: promoCode.code,
      campaignName: campaign.name,
      discountType: campaign.discountType.code,
      discountValue: Number(campaign.discountValue),
      isFreeDelivery,
      discount,
      subtotal,
      minimumOrderValue: Number(campaign.minOrderAmount),
      finalSubtotal: Math.max(0, subtotal - discount),
    };
  }

  // ========================================
  // CHECKOUT: ATOMIC CONSUMPTION
  // ========================================

  /**
   * Called INSIDE the checkout Prisma transaction.
   * Validates and atomically locks the promo code usage.
   * Returns the discount amount or throws.
   */
  static async consumePromo(
    tx: Prisma.TransactionClient,
    userId: string,
    code: string,
    subtotal: number,
    orderId: string
  ) {
    const normalizedCode = normalizeCode(code);

    // 1. Find code with campaign
    const promoCode = await tx.promoCode.findUnique({
      where: { code: normalizedCode },
      include: { campaign: { include: { discountType: true, campaignType: true } }, distributionType: true },
    });

    if (!promoCode) throw new AppError('Invalid promo code');

    const campaign = promoCode.campaign;

    // 2. All validation checks (same as validatePromo but inside tx)
    if (campaign.status !== 'ACTIVE') throw new AppError('This promotion is no longer active');
    if (promoCode.status !== 'ACTIVE') throw new AppError('This promo code is inactive');
    if (campaign.startsAt && campaign.startsAt > new Date()) throw new AppError('Promotion has not started yet');
    if (campaign.expiresAt && campaign.expiresAt < new Date()) throw new AppError('Promo code has expired');

    // Customer-specific
    if (promoCode.distributionType.code === 'CUSTOMER_SPECIFIC' && promoCode.customerId !== userId) {
      throw new AppError('This promo code is not valid for your account');
    }

    // First-order
    if (campaign.firstOrderOnly) {
      const existingOrders = await tx.order.count({
        where: { userId, status: { not: 'CANCELLED' } },
      });
      if (existingOrders > 0) throw new AppError('Promo valid for first-time orders only');
    }

    // Min order
    if (subtotal < Number(campaign.minOrderAmount)) {
      throw new AppError(`Minimum order of ₹${campaign.minOrderAmount} required`);
    }

    // Customer usage limit
    const customerUsages = await tx.promoCodeUsage.count({
      where: { promoCodeId: promoCode.id, userId },
    });
    if (customerUsages >= campaign.perCustomerLimit) {
      throw new AppError('You have already used this promo code the maximum number of times');
    }

    // 3. ATOMIC: Increment usage count with conditional check (race-condition safe)
    const updateResult = await tx.$executeRaw`
      UPDATE promo_codes
      SET "usageCount" = "usageCount" + 1, "updatedAt" = NOW()
      WHERE id = ${promoCode.id}
      AND (
        "usageLimit" IS NULL
        OR "usageCount" < "usageLimit"
      )
    `;

    if (updateResult === 0) {
      throw new AppError('This promo code has been fully redeemed');
    }

    // 4. Calculate discount
    let discount = 0;
    if (campaign.discountType.code === 'PERCENTAGE') {
      discount = (subtotal * Number(campaign.discountValue)) / 100;
      if (campaign.maxDiscount && Number(campaign.maxDiscount) > 0) {
        discount = Math.min(discount, Number(campaign.maxDiscount));
      }
    } else {
      discount = Math.min(Number(campaign.discountValue), subtotal);
    }
    discount = Math.round(discount * 100) / 100;

    // 5. Create immutable usage record
    await tx.promoCodeUsage.create({
      data: {
        promoCodeId: promoCode.id,
        campaignId: campaign.id,
        userId,
        orderId,
        discountAmount: discount,
        orderSubtotal: subtotal,
        metadata: {
          code: promoCode.code,
          campaignName: campaign.name,
          discountType: campaign.discountType.code,
          discountValue: Number(campaign.discountValue),
        },
      },
    });

    return {
      promoCodeId: promoCode.id,
      discount,
      campaignName: campaign.name,
    };
  }
}
