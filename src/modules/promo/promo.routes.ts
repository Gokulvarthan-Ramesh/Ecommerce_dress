import { Router } from 'express';
import { PromoController } from './promo.controller';
import { authenticateToken } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/adminGuard';
import { validateRequest } from '../../middleware/validate';
import {
  createCampaignSchema,
  updateCampaignSchema,
  createCodeSchema,
  generateCodesSchema,
  updateCodeSchema,
  validatePromoSchema,
} from './promo.schema';

const router = Router();

// ========================================
// ADMIN: CAMPAIGN ROUTES
// ========================================
router.post(
  '/admin/promo-campaigns',
  authenticateToken, requireAdmin,
  validateRequest(createCampaignSchema),
  PromoController.createCampaign
);

router.get(
  '/admin/promo-campaigns',
  authenticateToken, requireAdmin,
  PromoController.getCampaigns
);

router.get(
  '/admin/promo-campaigns/:id',
  authenticateToken, requireAdmin,
  PromoController.getCampaignById
);

router.get(
  '/admin/promo-campaigns/:id/analytics',
  authenticateToken, requireAdmin,
  PromoController.getCampaignAnalytics
);

router.patch(
  '/admin/promo-campaigns/:id',
  authenticateToken, requireAdmin,
  validateRequest(updateCampaignSchema),
  PromoController.updateCampaign
);

router.delete(
  '/admin/promo-campaigns/:id',
  authenticateToken, requireAdmin,
  PromoController.deleteCampaign
);

// ========================================
// ADMIN: CODE ROUTES
// ========================================
router.post(
  '/admin/promo-codes',
  authenticateToken, requireAdmin,
  validateRequest(createCodeSchema),
  PromoController.createCode
);

router.post(
  '/admin/promo-codes/generate',
  authenticateToken, requireAdmin,
  validateRequest(generateCodesSchema),
  PromoController.generateCodes
);

router.get(
  '/admin/promo-codes',
  authenticateToken, requireAdmin,
  PromoController.getCodes
);

router.get(
  '/admin/promo-codes/:id',
  authenticateToken, requireAdmin,
  PromoController.getCodeById
);

router.get(
  '/admin/promo-codes/:id/usage',
  authenticateToken, requireAdmin,
  PromoController.getCodeUsage
);

router.get(
  '/admin/promo-codes/:id/analytics',
  authenticateToken, requireAdmin,
  PromoController.getCodeAnalytics
);

router.patch(
  '/admin/promo-codes/:id',
  authenticateToken, requireAdmin,
  validateRequest(updateCodeSchema),
  PromoController.updateCode
);

router.delete(
  '/admin/promo-codes/:id',
  authenticateToken, requireAdmin,
  PromoController.deleteCode
);

// ========================================
// CUSTOMER: PROMO ROUTES
// ========================================
router.get(
  '/customer/promo-codes',
  authenticateToken,
  PromoController.getCustomerPromoCodes
);

router.post(
  '/customer/cart/promo',
  authenticateToken,
  validateRequest(validatePromoSchema),
  PromoController.validatePromo
);

router.post(
  '/cart/promo/validate',
  authenticateToken,
  validateRequest(validatePromoSchema),
  PromoController.validatePromo
);

export default router;
