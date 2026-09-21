import { Request, Response, NextFunction } from 'express';
import { PromoService } from './promo.service';
import { ApiResponse } from '../../utils/response';
import { PromoError } from './promo.constants';

export class PromoController {
  // ========================================
  // ADMIN: CAMPAIGNS
  // ========================================

  static async createCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await PromoService.createCampaign(req.body, req.user?.id);
      ApiResponse.created(res, campaign, 'Campaign created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PromoService.getCampaigns(req.query);
      ApiResponse.paginated(res, result.items, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getCampaignById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await PromoService.getCampaignById(req.params.id);
      ApiResponse.success(res, campaign);
    } catch (error) {
      next(error);
    }
  }

  static async updateCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await PromoService.updateCampaign(req.params.id, req.body);
      ApiResponse.success(res, campaign, 'Campaign updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await PromoService.deleteCampaign(req.params.id);
      ApiResponse.success(res, null, 'Campaign deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // ========================================
  // ADMIN: CODES
  // ========================================

  static async createCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await PromoService.createCode(req.body);
      ApiResponse.created(res, code, 'Promo code created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async generateCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PromoService.generateCodes(req.body);
      ApiResponse.created(res, result, `${result.generated} unique promo codes generated successfully`);
    } catch (error) {
      next(error);
    }
  }

  static async getCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PromoService.getCodes(req.query);
      ApiResponse.paginated(res, result.items, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getCodeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await PromoService.getCodeById(req.params.id);
      ApiResponse.success(res, code);
    } catch (error) {
      next(error);
    }
  }

  static async updateCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await PromoService.updateCode(req.params.id, req.body);
      ApiResponse.success(res, code, 'Promo code updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await PromoService.deleteCode(req.params.id);
      ApiResponse.success(res, null, 'Promo code deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCodeUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PromoService.getCodeUsage(req.params.id, req.query);
      ApiResponse.paginated(res, result.items, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getCampaignAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await PromoService.getCampaignAnalytics(req.params.id);
      ApiResponse.success(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  static async getCodeAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await PromoService.getCodeAnalytics(req.params.id);
      ApiResponse.success(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  // ========================================
  // CUSTOMER: PROMOS
  // ========================================

  static async getCustomerPromoCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const codes = await PromoService.getCustomerPromoCodes(userId);
      ApiResponse.success(res, codes);
    } catch (error) {
      next(error);
    }
  }

  static async validatePromo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await PromoService.validatePromo(userId, req.body.code);
      ApiResponse.success(res, result, 'Promo code is valid');
    } catch (error) {
      if (error instanceof PromoError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
        return;
      }
      next(error);
    }
  }
}
