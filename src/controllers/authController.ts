import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { ApiResponse } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

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
      const { phone, whatsappNumber, otp, name, email, referralCode } = req.body;
      const targetPhone = (whatsappNumber || phone || '').toString();
      const result = await AuthService.register(targetPhone, otp, name, email, referralCode);
      ApiResponse.created(res, result.data, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, whatsappNumber, otp } = req.body;
      const targetPhone = (whatsappNumber || phone || '').toString();
      
      if (!targetPhone || !otp) {
        throw new AppError('Phone number and OTP are required for login', 400);
      }

      const result = await AuthService.login(targetPhone, otp);
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

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { name, email } = req.body;
      const result = await AuthService.updateProfile(userId, { name, email });
      ApiResponse.success(res, result, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await AuthService.deleteAccount(userId);
      ApiResponse.success(res, result, 'Account deactivated successfully');
    } catch (error) {
      next(error);
    }
  }
}

