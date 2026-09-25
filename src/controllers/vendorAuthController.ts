import { Request, Response, NextFunction } from 'express';
import { VendorAuthService } from '../services/vendorAuthService';

export class VendorAuthController {
  /**
   * POST /vendor/auth/register/send-otp
   */
  static async sendRegisterOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await VendorAuthService.sendRegisterOtp(req.body.phone);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /vendor/auth/login/send-otp
   */
  static async sendLoginOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await VendorAuthService.sendLoginOtp(req.body.phone);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /vendor/auth/resend-otp
   */
  static async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await VendorAuthService.resendOtp(req.body.phone);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /vendor/auth/register
   * Body: { phone, otp, name, email? }
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await VendorAuthService.register(req.body);
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /vendor/register
   * One-shot: OTP + all shop details → creates VendorUser + Shop
   * No bearer token needed.
   */
  static async registerWithShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await VendorAuthService.registerWithShop(req.body);
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /vendor/auth/login
   * Body: { phone, otp }
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, otp } = req.body;
      const result = await VendorAuthService.login(phone, otp);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /vendor/auth/profile
   * Requires vendor token
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendorUserId = (req as any).vendorUser.id;
      const profile = await VendorAuthService.getProfile(vendorUserId);
      res.status(200).json({
        success: true,
        message: 'Vendor profile retrieved',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /vendor/auth/profile
   * Requires vendor token
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendorUserId = (req as any).vendorUser.id;
      const profile = await VendorAuthService.updateProfile(vendorUserId, req.body);
      res.status(200).json({
        success: true,
        message: 'Vendor profile updated',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}
