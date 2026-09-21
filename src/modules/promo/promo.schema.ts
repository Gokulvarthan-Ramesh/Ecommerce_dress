import { z } from 'zod';

// ========================
// CAMPAIGN SCHEMAS
// ========================
export const createCampaignSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Campaign name must be at least 3 characters'),
    description: z.string().optional(),
    discountTypeId: z.string().uuid('Invalid discount type ID'),
    campaignTypeId: z.string().uuid('Invalid campaign type ID'),
    discountValue: z.number().positive('Discount value must be positive'),
    minimumOrderValue: z.number().min(0).default(0),
    maximumDiscount: z.number().positive().optional(),
    totalUsageLimit: z.number().int().positive().optional(),
    perCustomerLimit: z.number().int().positive().default(1),
    firstOrderOnly: z.boolean().default(false),
    startsAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});

export const updateCampaignSchema = z.object({
  body: z.object({
    name: z.string().min(3).optional(),
    description: z.string().optional(),
    discountTypeId: z.string().uuid().optional(),
    campaignTypeId: z.string().uuid().optional(),
    discountValue: z.number().positive().optional(),
    minimumOrderValue: z.number().min(0).optional(),
    maximumDiscount: z.number().positive().nullable().optional(),
    totalUsageLimit: z.number().int().positive().nullable().optional(),
    perCustomerLimit: z.number().int().positive().optional(),
    firstOrderOnly: z.boolean().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
  }),
});

// ========================
// CODE SCHEMAS
// ========================
export const createCodeSchema = z.object({
  body: z.object({
    campaignId: z.string().uuid('Invalid campaign ID'),
    distributionTypeId: z.string().uuid('Invalid distribution type ID'),
    code: z.string().min(3, 'Code must be at least 3 characters').max(30),
    customerId: z.string().uuid().optional(),
    usageLimit: z.number().int().positive().optional(),
    // We will validate customerId presence in the service layer where we check the actual distributionType code.
  }),
});

export const generateCodesSchema = z.object({
  body: z.object({
    campaignId: z.string().uuid('Invalid campaign ID'),
    prefix: z.string().min(2).max(10),
    quantity: z.number().int().min(1).max(10000, 'Maximum 10000 codes per batch'),
    usageLimit: z.number().int().positive().default(1),
  }),
});

export const updateCodeSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'EXHAUSTED', 'EXPIRED']).optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
  }),
});

// ========================
// CUSTOMER SCHEMAS
// ========================
export const validatePromoSchema = z.object({
  body: z.object({
    code: z.string().min(1, 'Promo code is required'),
  }),
});
