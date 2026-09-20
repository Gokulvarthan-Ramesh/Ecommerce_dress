import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { Address, Shop, ShopServiceArea } from '@prisma/client';

export interface ServiceabilityResult {
  shopId: string;
  serviceable: boolean;
  distanceKm?: number;
  maxRadiusKm?: number;
  matchedRules: string[];
  reason: string | null;
}

export class ServiceabilityService {
  /**
   * Validates if the given coordinate is a mathematically valid GPS point.
   */
  static isValidCoordinate(lat: any, lon: any): boolean {
    const latitude = Number(lat);
    const longitude = Number(lon);
    
    if (isNaN(latitude) || isNaN(longitude)) return false;
    if (latitude < -90 || latitude > 90) return false;
    if (longitude < -180 || longitude > 180) return false;
    
    return true;
  }

  /**
   * Calculates the distance between two coordinates in kilometers using the Haversine formula.
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRadians = (deg: number) => deg * (Math.PI / 180);

    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Evaluates if a given shop can deliver to a given customer address based on rule precedence.
   */
  static evaluateServiceability(
    shop: Shop & { serviceAreas: ShopServiceArea[] },
    address: Address
  ): ServiceabilityResult {
    const result: ServiceabilityResult = {
      shopId: shop.id,
      serviceable: false,
      matchedRules: [],
      reason: null,
    };

    if (!shop.deliveryEnabled) {
      result.reason = 'SHOP_DELIVERY_DISABLED';
      return result;
    }

    // 1. Country Check
    if (shop.useCountryRules) {
      const countryAreas = shop.serviceAreas.filter(a => a.type === 'COUNTRY' && a.isActive);
      if (countryAreas.length === 0) {
        result.reason = 'COUNTRY_NOT_SUPPORTED';
        return result;
      }

      const isExcluded = countryAreas.some(a => a.isExcluded && a.value.toLowerCase() === address.country.toLowerCase());
      if (isExcluded) {
        result.reason = 'COUNTRY_BLOCKED';
        return result;
      }
      
      const isIncluded = countryAreas.some(a => !a.isExcluded && a.value.toLowerCase() === address.country.toLowerCase());
      if (!isIncluded && countryAreas.some(a => !a.isExcluded)) {
        result.reason = 'COUNTRY_NOT_SUPPORTED';
        return result;
      }
      result.matchedRules.push('COUNTRY');
    }

    // 2. Region / State Check
    if (shop.useRegionRules) {
      const stateAreas = shop.serviceAreas.filter(a => a.type === 'STATE' && a.isActive);
      if (stateAreas.length === 0) {
        result.reason = 'REGION_NOT_SUPPORTED';
        return result;
      }

      const isExcluded = stateAreas.some(a => a.isExcluded && a.value.toLowerCase() === address.state.toLowerCase());
      if (isExcluded) {
        result.reason = 'REGION_BLOCKED';
        return result;
      }
      
      const isIncluded = stateAreas.some(a => !a.isExcluded && a.value.toLowerCase() === address.state.toLowerCase());
      if (!isIncluded && stateAreas.some(a => !a.isExcluded)) {
        result.reason = 'REGION_NOT_SUPPORTED';
        return result;
      }
      result.matchedRules.push('STATE');
    }

    // 3. Pincode Check
    if (shop.usePincodeRules) {
      const pincodeAreas = shop.serviceAreas.filter(a => a.type === 'PINCODE' && a.isActive);
      if (pincodeAreas.length === 0) {
        result.reason = 'PINCODE_NOT_SUPPORTED';
        return result;
      }
      
      const isExcluded = pincodeAreas.some(a => a.isExcluded && a.value === address.pincode);
      if (isExcluded) {
        result.reason = 'PINCODE_BLOCKED';
        return result;
      }
      
      // If there are explicit allowed pincodes and this one isn't among them
      const hasAllowedPincodes = pincodeAreas.some(a => !a.isExcluded);
      if (hasAllowedPincodes) {
        const isIncluded = pincodeAreas.some(a => !a.isExcluded && a.value === address.pincode);
        if (!isIncluded) {
          result.reason = 'PINCODE_NOT_SUPPORTED';
          return result;
        }
        result.matchedRules.push('PINCODE');
      }
    }

    // 4. Distance / Radius Check
    if (!shop.latitude || !shop.longitude || !this.isValidCoordinate(shop.latitude, shop.longitude)) {
      result.reason = 'MISSING_SHOP_LOCATION';
      return result;
    }

    if (!address.latitude || !address.longitude || !this.isValidCoordinate(address.latitude, address.longitude)) {
      result.reason = 'MISSING_CUSTOMER_LOCATION';
      return result;
    }

    const distanceKm = this.calculateDistance(
      Number(shop.latitude),
      Number(shop.longitude),
      Number(address.latitude),
      Number(address.longitude)
    );

    result.distanceKm = Number(distanceKm.toFixed(2));
    result.maxRadiusKm = Number(shop.deliveryRadiusKm);

    if (result.distanceKm > result.maxRadiusKm) {
      result.reason = 'OUTSIDE_DELIVERY_RADIUS';
      return result;
    }

    result.matchedRules.push('RADIUS');
    result.serviceable = true;
    return result;
  }

  /**
   * Bulk checks serviceability for multiple shops (e.g. from a cart) against a single address.
   */
  static async checkCartServiceability(address: any, shopIds: string[]) {
    const uniqueShopIds = [...new Set(shopIds)];
    if (uniqueShopIds.length === 0) return { serviceable: true, shops: [] };

    const shops = await prisma.shop.findMany({
      where: { id: { in: uniqueShopIds } },
      include: { serviceAreas: true }
    });

    const results = shops.map((shop: any) => this.evaluateServiceability(shop, address));
    const allServiceable = results.every((r: any) => r.serviceable);

    return {
      serviceable: allServiceable,
      shops: results
    };
  }
}
