import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

export class SplashService {
  static async getAppSplash() {
    const splash = await (prisma as any).splashScreen.findFirst({
      where: { enabled: true, status: 'active' },
      orderBy: { sortOrder: 'asc' },
    });

    if (!splash) {
      return {
        enabled: false,
        logo_url: null,
        background_color: "#000000",
        animation_url: null,
        animation_type: "none",
        duration_ms: 2000,
        maintenance_mode: false,
        maintenance_message: null,
        force_update: false,
      };
    }

    return {
      enabled: splash.enabled,
      logo_url: splash.logoUrl,
      background_color: splash.backgroundColor,
      animation_url: splash.animationUrl,
      animation_type: splash.animationType,
      duration_ms: splash.durationMs,
      maintenance_mode: splash.maintenanceMode,
      maintenance_message: splash.maintenanceMessage,
      force_update: splash.forceUpdate,
      app_version: {
        minimum: splash.appVersionMin,
        latest: splash.appVersionLatest,
      }
    };
  }

  // Admin Methods
  static async getAllSplashes() {
    return (prisma as any).splashScreen.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getSplashById(id: string) {
    const splash = await (prisma as any).splashScreen.findUnique({ where: { id } });
    if (!splash) throw new AppError('Splash screen not found', 404);
    return splash;
  }

  static async createSplash(data: any) {
    if (data.enabled) {
      // Disable all other active splash screens
      await (prisma as any).splashScreen.updateMany({
        where: { enabled: true },
        data: { enabled: false }
      });
    }
    return (prisma as any).splashScreen.create({ data });
  }

  static async updateSplash(id: string, data: any) {
    const splash = await (prisma as any).splashScreen.findUnique({ where: { id } });
    if (!splash) throw new AppError('Splash screen not found', 404);
    
    if (data.enabled === true) {
      // Disable all other active splash screens
      await (prisma as any).splashScreen.updateMany({
        where: { id: { not: id }, enabled: true },
        data: { enabled: false }
      });
    }

    return (prisma as any).splashScreen.update({
      where: { id },
      data,
    });
  }

  static async deleteSplash(id: string) {
    const splash = await (prisma as any).splashScreen.findUnique({ where: { id } });
    if (!splash) throw new AppError('Splash screen not found', 404);
    return (prisma as any).splashScreen.delete({ where: { id } });
  }
}
