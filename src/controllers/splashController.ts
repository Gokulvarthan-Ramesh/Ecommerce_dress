import { Request, Response, NextFunction } from 'express';
import { SplashService } from '../services/splashService';
import { ApiResponse } from '../utils/response';

export class SplashController {
  // App API
  static async getAppSplash(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SplashService.getAppSplash();
      ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  // Admin APIs
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SplashService.getAllSplashes();
      ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SplashService.getSplashById(req.params.id);
      ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SplashService.createSplash(req.body);
      ApiResponse.success(res, data, 'Splash screen created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SplashService.updateSplash(req.params.id, req.body);
      ApiResponse.success(res, data, 'Splash screen updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await SplashService.deleteSplash(req.params.id);
      ApiResponse.success(res, null, 'Splash screen deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
