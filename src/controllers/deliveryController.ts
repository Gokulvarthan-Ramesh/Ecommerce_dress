import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../utils/response';
import { ServiceabilityService } from '../services/serviceabilityService';
import { ShopService } from '../services/shopService';
import { ServiceAreaType } from '@prisma/client';

export class DeliveryController {
  /**
   * CUSTOMER: Check serviceability for a cart
   * POST /customer/serviceability/check
   */
  static async checkServiceability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { addressId, shopIds } = req.body;
      if (!addressId) throw new AppError('addressId is required');
      if (!Array.isArray(shopIds)) throw new AppError('shopIds must be an array');

      const address = await prisma.address.findUnique({ where: { id: addressId } });
      if (!address) throw new AppError('Address not found', 404);
      const result = await ServiceabilityService.checkCartServiceability(address, shopIds);
      ApiResponse.success(res, result, 'Serviceability evaluated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * VENDOR: Get delivery settings
   * GET /vendor/delivery/settings
   */
  static async getDeliverySettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const shop = await ShopService.getMyVendorShop(userId);
      
      const settings = {
        deliveryEnabled: shop.deliveryEnabled,
        deliveryRadiusKm: shop.deliveryRadiusKm,
        usePincodeRules: shop.usePincodeRules,
        useRegionRules: shop.useRegionRules,
        useCountryRules: shop.useCountryRules,
      };

      ApiResponse.success(res, settings, 'Delivery settings retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * VENDOR: Update delivery settings
   * PUT /vendor/delivery/settings
   */
  static async updateDeliverySettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const shop = await ShopService.getMyVendorShop(userId);
      
      const { deliveryEnabled, deliveryRadiusKm, usePincodeRules, useRegionRules, useCountryRules } = req.body;

      const updated = await prisma.shop.update({
        where: { id: shop.id },
        data: {
          deliveryEnabled,
          deliveryRadiusKm,
          usePincodeRules,
          useRegionRules,
          useCountryRules
        },
        select: {
          deliveryEnabled: true,
          deliveryRadiusKm: true,
          usePincodeRules: true,
          useRegionRules: true,
          useCountryRules: true
        }
      });

      ApiResponse.success(res, updated, 'Delivery settings updated');
    } catch (error) {
      next(error);
    }
  }

  /**
   * VENDOR: Get service areas
   * GET /vendor/delivery/service-areas
   */
  static async getServiceAreas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const shop = await ShopService.getMyVendorShop(userId);
      
      const areas = await prisma.shopServiceArea.findMany({
        where: { shopId: shop.id },
        orderBy: { createdAt: 'desc' }
      });

      ApiResponse.success(res, areas, 'Service areas retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * VENDOR: Bulk add service areas
   * POST /vendor/delivery/service-areas/bulk
   */
  static async addBulkServiceAreas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const shop = await ShopService.getMyVendorShop(userId);
      
      const { type, values, isExcluded = false } = req.body;
      if (!type || !Array.isArray(values)) throw new AppError('type and values (array) are required');
      if (!Object.values(ServiceAreaType).includes(type)) throw new AppError('Invalid ServiceAreaType');

      const data = values.map((val: string) => ({
        shopId: shop.id,
        type: type as ServiceAreaType,
        value: val,
        isExcluded,
        isActive: true
      }));

      await prisma.shopServiceArea.createMany({
        data,
        skipDuplicates: true
      });

      ApiResponse.success(res, null, `Successfully added ${values.length} ${type} service rules`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * VENDOR: Delete service area
   * DELETE /vendor/delivery/service-areas/:id
   */
  static async deleteServiceArea(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const shop = await ShopService.getMyVendorShop(userId);
      const { id } = req.params;

      const area = await prisma.shopServiceArea.findUnique({ where: { id } });
      if (!area || area.shopId !== shop.id) {
        throw new AppError('Service area not found or unauthorized', 404);
      }

      await prisma.shopServiceArea.delete({ where: { id } });
      ApiResponse.success(res, null, 'Service area deleted');
    } catch (error) {
      next(error);
    }
  }

  /**
   * ADMIN: Diagnostic check
   * POST /admin/serviceability/check
   */
  static async adminDiagnosticCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId, pincode, latitude, longitude, country = 'India', state = '' } = req.body;
      if (!shopId || latitude === undefined || longitude === undefined) {
        throw new AppError('shopId, latitude, and longitude are required');
      }

      if (!ServiceabilityService.isValidCoordinate(latitude, longitude)) {
        throw new AppError('Invalid coordinates provided', 400);
      }

      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        include: { serviceAreas: true }
      });

      if (!shop) throw new AppError('Shop not found', 404);

      // Create a mock address for evaluation
      const mockAddress = {
        id: 'mock',
        userId: 'mock',
        name: 'Mock',
        phone: '1234567890',
        addressLine1: 'Mock',
        addressLine2: null,
        city: 'Mock',
        district: 'Mock',
        state,
        pincode: pincode || '000000',
        country,
        latitude,
        longitude,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;

      const result = ServiceabilityService.evaluateServiceability(shop, mockAddress);
      ApiResponse.success(res, result, 'Diagnostic serviceability evaluated');
    } catch (error) {
      next(error);
    }
  }
}
