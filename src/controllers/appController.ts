import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { SystemSettingService } from '../services/systemSettingService';
import { ApiResponse } from '../utils/response';

export class AppController {
  /**
   * Comprehensive Splash Screen & App Initialization API
   * Used by frontend (mobile/web) on startup to get all necessary bootstrapping config
   */
  static async getSplashData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientPlatform = (req.query.platform as string) || 'android'; // android, ios, web
      const clientVersion = req.query.version as string | undefined;

      // 2. Fetch all necessary data concurrently
      const now = new Date();
      const [
        banners,
        categories,
        icons
      ] = await Promise.all([
        
        // Active Splash or Hero Banners
        prisma.banner.findMany({
          where: {
            isActive: true,
            bannerType: { in: ['SPLASH', 'HERO'] },
            OR: [{ startDate: null }, { startDate: { lte: now } }],
            AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
          },
          orderBy: { sortOrder: 'asc' },
        }),

        // Top-level Categories (for navigation drawer / home grid)
        prisma.category.findMany({
          where: { parentId: null, isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, slug: true, imageUrl: true }
        }),

        // Active Icons (for bottom bar / shortcuts)
        prisma.icon.findMany({
          where: { status: 'active' },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, slug: true, category: true, iconUrl: true }
        })
      ]);

      // 3. Assemble the Splash Response
      const responseData = {
        banners: banners.map(b => ({
          id: b.id,
          title: b.title,
          imageUrl: b.imageUrl,
          type: b.bannerType,
          targetType: b.targetType,
          targetValue: b.targetValue,
        })),
        categories,
        icons: {
          bottombar: icons.filter(i => (i.category as string) === 'bottombar'),
          ecommerce: icons.filter(i => (i.category as string) === 'ecommerce'),
          filter: icons.filter(i => (i.category as string) === 'filter'),
          logo: icons.filter(i => (i.category as string) === 'DcodexLogo'),
        }
      };

      ApiResponse.success(res, responseData, 'Splash screen configuration fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}
