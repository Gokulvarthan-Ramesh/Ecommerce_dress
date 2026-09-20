import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

export class SecurityService {
  /**
   * Verifies that the given shop owns the requested resource.
   */
  static async verifyVendorOwnsResource(
    shopId: string, 
    resourceId: string, 
    resourceType: 'Product' | 'ProductVariant' | 'SubOrder' | 'Coupon' | 'ShopPayout'
  ) {
    let owned = false;
    
    switch (resourceType) {
      case 'Product':
        const prod = await prisma.product.findUnique({ where: { id: resourceId }, select: { shopId: true } });
        owned = prod?.shopId === shopId;
        break;
      case 'ProductVariant':
        const variant = await prisma.productVariant.findUnique({ 
          where: { id: resourceId }, 
          select: { product: { select: { shopId: true } } } 
        });
        owned = variant?.product.shopId === shopId;
        break;
      case 'SubOrder':
        const subOrder = await prisma.subOrder.findUnique({ where: { id: resourceId }, select: { shopId: true } });
        owned = subOrder?.shopId === shopId;
        break;
      case 'Coupon':
        const coupon = await prisma.coupon.findUnique({ where: { id: resourceId }, select: { shopId: true } });
        owned = coupon?.shopId === shopId;
        break;
      case 'ShopPayout':
        const payout = await prisma.shopPayout.findUnique({ where: { id: resourceId }, select: { shopId: true } });
        owned = payout?.shopId === shopId;
        break;
      default:
        throw new AppError('Invalid resource type for ownership verification');
    }

    if (!owned) {
      throw new AppError(`Unauthorized access to ${resourceType} ${resourceId}`, 403);
    }
    
    return true;
  }
}
