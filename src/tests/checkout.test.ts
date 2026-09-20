import { describe, it, expect, vi } from 'vitest';
import { TaxService } from '../services/taxService';
import { DeliveryService } from '../services/deliveryService';

vi.mock('../config/db', () => ({
  prisma: {
    product: { findUnique: vi.fn().mockResolvedValue({ taxRate: 18 }) },
    shop: { findUnique: vi.fn().mockResolvedValue({
      latitude: 12.9716,
      longitude: 77.5946,
      deliveryRules: [
        { minDistance: 0, maxDistance: 10, baseFee: 40, perKmFee: 0, isActive: true }
      ]
    })}
  }
}));

vi.mock('../services/systemSettingService', () => ({
  SystemSettingService: {
    getShippingConfig: vi.fn().mockResolvedValue({
      free_delivery_threshold: 500,
      standard_delivery_fee: 50
    })
  }
}));

describe('Phase 39: Checkout Tax & Delivery Engine', () => {
  it('should calculate tax accurately', async () => {
    const items = [{ totalPrice: 100, productId: 'prod-1' }];
    const tax = await TaxService.calculateTaxForItems(items, { state: 'Karnataka' });
    expect(tax.totalTax).toBe(18); // 18% of 100
    expect(tax.cgst).toBe(9);
    expect(tax.sgst).toBe(9);
    expect(tax.igst).toBe(0);
  });

  it('should calculate dynamic delivery accurately', async () => {
    const items = [{ totalPrice: 200, shopId: 'shop-1' }];
    const address = { latitude: 12.97, longitude: 77.59 }; // very close
    const fee = await DeliveryService.calculateDeliveryCharges(items, address);
    // Since distance is small, it matches the 0-10km rule: fee = 40
    expect(fee).toBe(40);
  });
});
