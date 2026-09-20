import { describe, it, expect, vi } from 'vitest';
import { ServiceabilityService } from '../services/serviceabilityService';
import { Shop, Address, ShopServiceArea } from '@prisma/client';

describe('ServiceabilityService Deep Audit', () => {
  const baseShop = {
    id: 'shop-1',
    latitude: 11.0168,
    longitude: 76.9558, // Coimbatore
    deliveryEnabled: true,
    deliveryRadiusKm: 20,
    useCountryRules: false,
    useRegionRules: false,
    usePincodeRules: false,
    serviceAreas: [] as ShopServiceArea[]
  } as unknown as Shop & { serviceAreas: ShopServiceArea[] };

  const baseAddress = {
    id: 'address-1',
    latitude: 11.0168,
    longitude: 76.9558,
    country: 'India',
    state: 'Tamil Nadu',
    pincode: '641001',
  } as unknown as Address;

  describe('1. 20 KM Boundary Exact Tests', () => {
    it('0 km should be serviceable', () => {
      const result = ServiceabilityService.evaluateServiceability(baseShop, baseAddress);
      expect(result.serviceable).toBe(true);
      expect(result.distanceKm).toBe(0);
    });

    it('5 km should be serviceable', () => {
      const addr = { ...baseAddress, latitude: 11.0500, longitude: 76.9558 }; 
      const result = ServiceabilityService.evaluateServiceability(baseShop, addr as any);
      expect(result.serviceable).toBe(true);
      expect(result.distanceKm).toBeLessThan(20);
    });

    it('19.99 km should be serviceable', () => {
      vi.spyOn(ServiceabilityService, 'calculateDistance').mockReturnValueOnce(19.99);
      const result = ServiceabilityService.evaluateServiceability(baseShop, baseAddress);
      expect(result.serviceable).toBe(true);
    });

    it('20.00 km should be serviceable', () => {
      vi.spyOn(ServiceabilityService, 'calculateDistance').mockReturnValueOnce(20.00);
      const result = ServiceabilityService.evaluateServiceability(baseShop, baseAddress);
      expect(result.serviceable).toBe(true);
    });

    it('20.01 km should NOT be serviceable', () => {
      vi.spyOn(ServiceabilityService, 'calculateDistance').mockReturnValueOnce(20.01);
      const result = ServiceabilityService.evaluateServiceability(baseShop, baseAddress);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toBe('OUTSIDE_DELIVERY_RADIUS');
    });

    it('100 km should NOT be serviceable', () => {
      const addr = { ...baseAddress, latitude: 12.9716, longitude: 77.5946 }; // Bangalore
      const result = ServiceabilityService.evaluateServiceability(baseShop, addr as any);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toBe('OUTSIDE_DELIVERY_RADIUS');
    });
  });

  describe('2. Hard-shell Radius Test (Country/Region bypass protection)', () => {
    it('should NOT become serviceable for 50km just because Country and Region are allowed', () => {
      const shop = {
        ...baseShop,
        useCountryRules: true,
        useRegionRules: true,
        serviceAreas: [
          { type: 'COUNTRY', value: 'India', isExcluded: false, isActive: true },
          { type: 'STATE', value: 'Tamil Nadu', isExcluded: false, isActive: true }
        ]
      } as any;
      
      vi.spyOn(ServiceabilityService, 'calculateDistance').mockReturnValueOnce(50);
      const result = ServiceabilityService.evaluateServiceability(shop, baseAddress);
      
      expect(result.matchedRules).toContain('COUNTRY');
      expect(result.matchedRules).toContain('STATE');
      expect(result.serviceable).toBe(false);
      expect(result.reason).toBe('OUTSIDE_DELIVERY_RADIUS'); // Radius is hard limit
    });
  });

  describe('3. Country Tests', () => {
    it('should block if country is unsupported', () => {
      const shop = {
        ...baseShop,
        useCountryRules: true,
        serviceAreas: [
          { type: 'COUNTRY', value: 'India', isExcluded: false, isActive: true }
        ]
      } as any;
      const addr = { ...baseAddress, country: 'USA' };
      const result = ServiceabilityService.evaluateServiceability(shop, addr);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toBe('COUNTRY_NOT_SUPPORTED');
    });

    it('should block if explicitly excluded', () => {
      const shop = {
        ...baseShop,
        useCountryRules: true,
        serviceAreas: [
          { type: 'COUNTRY', value: 'USA', isExcluded: true, isActive: true }
        ]
      } as any;
      const addr = { ...baseAddress, country: 'USA' };
      const result = ServiceabilityService.evaluateServiceability(shop, addr);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toBe('COUNTRY_BLOCKED');
    });
  });

  describe('4. Region Tests', () => {
    it('should block unsupported region', () => {
      const shop = {
        ...baseShop,
        useRegionRules: true,
        serviceAreas: [
          { type: 'STATE', value: 'Tamil Nadu', isExcluded: false, isActive: true }
        ]
      } as any;
      const addr = { ...baseAddress, state: 'Kerala' };
      const result = ServiceabilityService.evaluateServiceability(shop, addr);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toBe('REGION_NOT_SUPPORTED');
    });
  });

  describe('5. Pincode Tests', () => {
    it('should block excluded pincode immediately', () => {
      const shop = {
        ...baseShop,
        usePincodeRules: true,
        serviceAreas: [
          { type: 'PINCODE', value: '641001', isExcluded: true, isActive: true }
        ]
      } as any;
      const result = ServiceabilityService.evaluateServiceability(shop, baseAddress);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toBe('PINCODE_BLOCKED');
    });
  });

  describe('6. Empty Rule Vulnerability', () => {
    it('should fail CLOSED if useCountryRules=true but list is empty', () => {
      const shop = { ...baseShop, useCountryRules: true, serviceAreas: [] } as any;
      const result = ServiceabilityService.evaluateServiceability(shop, baseAddress);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toBe('COUNTRY_NOT_SUPPORTED');
    });

    it('should fail CLOSED if useRegionRules=true but list is empty', () => {
      const shop = { ...baseShop, useRegionRules: true, serviceAreas: [] } as any;
      const result = ServiceabilityService.evaluateServiceability(shop, baseAddress);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toBe('REGION_NOT_SUPPORTED');
    });

    it('should fail CLOSED if usePincodeRules=true but list is empty', () => {
      const shop = { ...baseShop, usePincodeRules: true, serviceAreas: [] } as any;
      const result = ServiceabilityService.evaluateServiceability(shop, baseAddress);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toBe('PINCODE_NOT_SUPPORTED');
    });
  });

  describe('7. Coordinate Validation', () => {
    it('should reject invalid coordinates (NaN)', () => {
      const addr = { ...baseAddress, latitude: 'invalid' as any } as any;
      const result = ServiceabilityService.evaluateServiceability(baseShop, addr);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toBe('MISSING_CUSTOMER_LOCATION');
    });

    it('should reject out of bound coordinates', () => {
      const addr = { ...baseAddress, latitude: 100 } as any;
      const result = ServiceabilityService.evaluateServiceability(baseShop, addr);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toBe('MISSING_CUSTOMER_LOCATION');
    });
  });

  describe('8. Shop Delivery Disabled', () => {
    it('should block regardless of distance if disabled', () => {
      const shop = { ...baseShop, deliveryEnabled: false } as any;
      const result = ServiceabilityService.evaluateServiceability(shop, baseAddress);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toBe('SHOP_DELIVERY_DISABLED');
    });
  });
});
