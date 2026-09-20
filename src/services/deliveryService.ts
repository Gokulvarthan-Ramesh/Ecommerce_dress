import { prisma } from '../config/db';
import { SystemSettingService } from './systemSettingService';

export class DeliveryService {
  static async calculateDeliveryCharges(orderItemsData: any[], shippingAddress?: any) {
    if (!shippingAddress?.latitude || !shippingAddress?.longitude) {
      // Fallback global pricing if no coordinates
      const shippingConfig = await SystemSettingService.getShippingConfig();
      const subtotal = orderItemsData.reduce((acc, curr) => acc + curr.totalPrice, 0);
      const fee = subtotal < shippingConfig.free_delivery_threshold ? shippingConfig.standard_delivery_fee : 0;
      return { totalDeliveryFee: fee, breakdown: {} };
    }

    let totalDeliveryFee = 0;
    const breakdown: Record<string, number> = {};
    const shopIds = [...new Set(orderItemsData.map((item) => item.shopId).filter(Boolean))];

    for (const shopId of shopIds) {
      const shop = await prisma.shop.findUnique({
        where: { id: shopId as string },
        include: { deliveryRules: true },
      });

      if (!shop || !shop.latitude || !shop.longitude) {
        totalDeliveryFee += 50; // Fallback
        continue;
      }

      // Basic Haversine distance
      const distance = this.calculateDistance(
        Number(shippingAddress.latitude),
        Number(shippingAddress.longitude),
        Number(shop.latitude),
        Number(shop.longitude)
      );

      let shopFee = 0;
      let ruleApplied = false;

      // Find matching DeliveryRule
      if (shop.deliveryRules && shop.deliveryRules.length > 0) {
        const activeRules = shop.deliveryRules.filter((r) => r.isActive);
        for (const rule of activeRules) {
          if (distance >= Number(rule.minDistance) && distance <= Number(rule.maxDistance)) {
            shopFee = Number(rule.baseFee) + distance * Number(rule.perKmFee);
            ruleApplied = true;
            break;
          }
        }
      }

      if (!ruleApplied) {
        shopFee = distance <= 20 ? 40 + (distance * 2) : 100; // Default distance-based fallback
      }

      totalDeliveryFee += shopFee;
      breakdown[shopId as string] = Math.round(shopFee * 100) / 100;
    }

    return {
      totalDeliveryFee: Math.round(totalDeliveryFee * 100) / 100,
      breakdown: breakdown,
    };
  }

  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
