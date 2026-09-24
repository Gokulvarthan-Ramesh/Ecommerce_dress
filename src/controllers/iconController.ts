import { Request, Response, NextFunction } from 'express';
import { IconService } from '../services/iconService';

export class IconController {
  static async getIcons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const icons = await IconService.getIcons(req.query);
      res.status(200).json({
        success: true,
        data: icons
      });
    } catch (error) {
      next(error);
    }
  }

  static async getIconById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const icon = await IconService.getIconById(req.params.id);
      res.status(200).json({
        success: true,
        data: icon
      });
    } catch (error) {
      next(error);
    }
  }

  static async createIcon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const icon = await IconService.createIcon(req.body);
      res.status(201).json({
        success: true,
        message: 'Icon created successfully',
        data: icon
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateIcon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const icon = await IconService.updateIcon(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Icon updated successfully',
        data: icon
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteIcon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await IconService.deleteIcon(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Icon deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
