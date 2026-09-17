import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { SystemSettingService } from '../services/systemSettingService';
import { ApiResponse } from '../utils/response';

export class HomeController {
  /**
   * Unified Dynamic Home Screen Feed
   * Supplies every section, banner, category, featured product, testimonial,
   * and theme token in a single high-performance request for mobile & web apps.
   */
  static async getHomeFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        announcementBar,
        theme,
        trustBadges,
        testimonials,
        firstOrderOffer,
        banners,
        categories,
        featuredProducts,
        activeOffers,
      ] = await Promise.all([
        SystemSettingService.getAnnouncementBarConfig(),
        SystemSettingService.getThemeConfig(),
        SystemSettingService.getTrustBadgesConfig(),
        SystemSettingService.getTestimonialsConfig(),
        SystemSettingService.getFirstOrderOfferConfig(),
        (prisma as any).banner.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        }),
        prisma.category.findMany({
          where: { isActive: true, level: 1 },
          select: { id: true, name: true, slug: true, imageUrl: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
          take: 12,
        }),
        prisma.product.findMany({
          where: { isActive: true, isFeatured: true },
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            variants: { where: { isActive: true } },
          },
        }),
        prisma.offer.findMany({
          where: { isActive: true },
          take: 3,
          orderBy: { value: 'desc' },
        }),
      ]);

      const feed = {
        announcementBar: {
          isEnabled: announcementBar.is_enabled,
          text: announcementBar.text,
          textColor: announcementBar.text_color,
          backgroundColor: announcementBar.background_color,
          targetUrl: announcementBar.target_url,
        },
        theme,
        heroBanners: banners,
        categories,
        featuredProducts: featuredProducts.map((p) => {
          const minPrice = p.variants.length > 0 
            ? Math.min(...p.variants.map((v) => Number(v.price) > 0 ? Number(v.price) : Number(p.sellingPrice)))
            : Number(p.sellingPrice);
          const totalStock = p.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            basePrice: p.basePrice,
            sellingPrice: p.sellingPrice,
            displayPrice: minPrice,
            isFeatured: p.isFeatured,
            totalStock,
            images: p.images,
            availableSizes: Array.from(new Set(p.variants.map((v) => v.size))),
            availableColors: Array.from(new Set(p.variants.map((v) => v.color))),
          };
        }),
        activeOffers,
        firstOrderOffer,
        testimonials,
        trustBadges,
      };

      ApiResponse.success(res, feed, 'Home feed loaded successfully');
    } catch (error) {
      next(error);
    }
  }
}
