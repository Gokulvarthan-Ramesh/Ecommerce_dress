import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { SystemSettingService } from '../services/systemSettingService';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../utils/response';

export class ConfigController {
  /**
   * Public Client Configuration Endpoint
   * Consolidates all dynamic store rules, shipping parameters, and payment toggles
   * so the customer apps (mobile / web) never have to hardcode business values.
   */
  static async getPublicConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        store,
        shipping,
        payments,
        firstOrderOffer,
        referral,
        wallet,
        announcementBar,
        trustBadges,
        socialLinks,
        cartPrompts,
      ] = await Promise.all([
        SystemSettingService.getStoreConfig(),
        SystemSettingService.getShippingConfig(),
        SystemSettingService.getPaymentsConfig(),
        SystemSettingService.getFirstOrderOfferConfig(),
        SystemSettingService.getReferralConfig(),
        SystemSettingService.getWalletConfig(),
        SystemSettingService.getAnnouncementBarConfig(),
        SystemSettingService.getTrustBadgesConfig(),
        SystemSettingService.getSocialLinksConfig(),
        SystemSettingService.getCartPromptsConfig(),
      ]);

      const config = {
        store: {
          name: store.name,
          tagline: store.tagline,
          logoUrl: store.logo_url,
          supportPhone: store.support_phone,
          supportWhatsapp: store.support_whatsapp,
          supportEmail: store.support_email,
          operatingHours: store.operating_hours,
          returnWindowDays: store.return_window_days,
          currency: store.currency,
          currencySymbol: store.currency_symbol,
          estimatedDeliveryDays: store.estimated_delivery_days,
          termsUrl: store.terms_url,
          privacyUrl: store.privacy_url,
          aboutUs: store.about_us,
        },
        announcementBar: {
          isEnabled: announcementBar.is_enabled,
          text: announcementBar.text,
          textColor: announcementBar.text_color,
          backgroundColor: announcementBar.background_color,
          targetUrl: announcementBar.target_url,
        },
        trustBadges,
        socialLinks,
        cartPrompts,
        shipping: {
          standardDeliveryFee: shipping.standard_delivery_fee,
          freeDeliveryThreshold: shipping.free_delivery_threshold,
          estimatedDeliveryDays: shipping.standard_delivery_fee !== undefined && (shipping as any).estimated_delivery_days
            ? (shipping as any).estimated_delivery_days
            : store.estimated_delivery_days,
        },
        payments: {
          codEnabled: payments.cod_enabled,
          codFee: payments.cod_fee,
          cashfreeEnabled: payments.cashfree_enabled,
        },
        offers: {
          firstOrderOffer: {
            isEnabled: firstOrderOffer.is_enabled,
            discountAmount: firstOrderOffer.discount_amount,
            minOrderValue: firstOrderOffer.min_order_value,
            bannerText: firstOrderOffer.is_enabled
              ? `Flat ₹${firstOrderOffer.discount_amount} OFF on your first order above ₹${firstOrderOffer.min_order_value}!`
              : null,
          },
        },
        referral: {
          isEnabled: referral.is_enabled,
          referrerBonus: referral.referrer_bonus,
          refereeBonus: referral.referee_bonus,
          minQualifyingOrder: referral.min_qualifying_order,
          shareMessage: (referral as any).share_message || `Join ${store.name} with my referral code and get ₹${referral.referee_bonus} instantly in your wallet!`,
        },
        wallet: {
          maxRedemptionPercent: wallet.max_order_redemption_percent,
        },
      };

      ApiResponse.success(res, config, 'Store configuration fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public Active Banners Endpoint
   * Returns home screen hero carousels & promotional banners sorted by sortOrder
   */
  static async getActiveBanners(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const banners = await (prisma as any).banner.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      ApiResponse.success(res, banners);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Legal Policies Endpoint (Terms, Privacy, Returns, Shipping)
   */
  static async getPolicies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const policies = await SystemSettingService.getPoliciesConfig();
      ApiResponse.success(res, policies);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Store FAQs Endpoint
   */
  static async getFaqs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const faqs = await SystemSettingService.getFaqsConfig();
      ApiResponse.success(res, faqs);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Size Guide Charts Endpoint
   */
  static async getSizeGuides(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sizeGuides = await SystemSettingService.getSizeGuidesConfig();
      ApiResponse.success(res, sizeGuides);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Order Cancellation & Return Reasons
   */
  static async getReasons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reasons = await SystemSettingService.getOrderReasonsConfig();
      ApiResponse.success(res, reasons);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dynamic Header Navigation & Footer Menus
   */
  static async getNavigation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const navigation = await SystemSettingService.getNavigationConfig();
      ApiResponse.success(res, navigation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * App Theme Styling Tokens
   */
  static async getTheme(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const theme = await SystemSettingService.getThemeConfig();
      ApiResponse.success(res, theme);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pincode Serviceability & Delivery Estimate Check
   */
  static async checkPincode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pincode = String(req.query.pincode || '').trim();
      if (!pincode || pincode.length !== 6) {
        throw new AppError('Please provide a valid 6-digit postal pincode', 400);
      }

      const pincodeConfig = await SystemSettingService.getPincodeServiceabilityConfig();
      const isExpress = pincodeConfig.express_pincodes.includes(pincode);
      const deliveryTimeline = isExpress ? pincodeConfig.metro_delivery_days : pincodeConfig.default_delivery_days;

      ApiResponse.success(res, {
        pincode,
        serviceable: true,
        isExpressDelivery: isExpress,
        estimatedDeliveryTime: deliveryTimeline,
        codAvailable: pincodeConfig.cod_available_all_india,
        message: `Delivery available in ${deliveryTimeline} | Cash on delivery available`,
      });
    } catch (error) {
      next(error);
    }
  }
}
