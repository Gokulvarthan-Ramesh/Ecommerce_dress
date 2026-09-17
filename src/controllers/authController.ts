import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { ApiResponse } from '../utils/response';

export class AuthController {
  static async sendWhatsAppOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { whatsappNumber, phone } = req.body;
      const targetPhone = (whatsappNumber || phone || '').toString();
      const result = await AuthService.sendWhatsAppOtp(targetPhone);
      ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, whatsappNumber, otp, password, name, email, referralCode } = req.body;
      const targetPhone = (whatsappNumber || phone || '').toString();
      const result = await AuthService.register(targetPhone, otp, password, name, email, referralCode);
      ApiResponse.created(res, result.data, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, password } = req.body;
      const result = await AuthService.login(identifier, password);
      ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await AuthService.getProfile(userId);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}
