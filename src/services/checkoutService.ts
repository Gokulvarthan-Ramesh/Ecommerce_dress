import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { WalletService } from './walletService';
import { OfferService } from './offerService';
import { CashfreeService } from './cashfreeService';
import { SystemSettingService } from './systemSettingService';
import { ServiceabilityService } from './serviceabilityService';
import { TaxService } from './taxService';
import { DeliveryService } from './deliveryService';
import { PromoService } from '../modules/promo/promo.service';
import { OrderStatus, PaymentMethod, PaymentStatus, WalletTxCategory, SubOrderStatus } from '@prisma/client';


export class CheckoutService {
  /**
   * Preview checkout summary (Steps 1-15) without creating order
   */
  static async previewCheckout(userId: string, body: any) {
    const { couponCode, promoCode, useWallet, shippingAddress } = body;
    const rawCode = (promoCode || couponCode)?.toString().trim();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    // 1. Load cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
      },
    });

    // 2. Validate cart
    if (!cart || cart.items.length === 0) {
      throw new AppError('Your cart is empty');
    }

    const orderItemsData: any[] = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const variant = item.variant;
      const product = variant.product;

      // 4. Check active status
      if (!product.isActive || !variant.isActive) {
        throw new AppError(`Product ${product.name} is no longer available`);
      }

      // 6. Check stock
      if (variant.stockQuantity < item.quantity) {
        throw new AppError(`Not enough stock for ${product.name} (${variant.size}, ${variant.color}). Only ${variant.stockQuantity} left.`);
      }

      // 7. Get current prices
      const unitPrice = Number(variant.price) > 0 ? Number(variant.price) : Number(product.sellingPrice);
      const totalPrice = unitPrice * item.quantity;

      // 8. Calculate subtotal
      subtotal += totalPrice;

      orderItemsData.push({
        cartItemId: item.id,
        productId: product.id,
        variantId: variant.id,
        shopId: product.shopId || null,
        productName: product.name,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        unitPrice,
        quantity: item.quantity,
        totalPrice,
      });
    }

    // 9. Find applicable auto-applied offer
    const offerResult = await OfferService.calculateDiscount(userId, subtotal);
    const firstOrderDiscount = offerResult.discountAmount;
    const appliedOfferId = offerResult.appliedOfferId;

    // 10. Validate Promo Code or Coupon
    let promoDiscount = 0;
    let appliedPromoCodeId: string | null = null;
    let appliedPromoCodeStr: string | null = null;
    let couponDiscount = 0;
    let appliedCouponId: string | null = null;
    let isFreeDelivery = false;

    if (rawCode) {
      // Check if it matches a PromoCode first
      const foundPromo = await prisma.promoCode.findUnique({
        where: { code: rawCode.toUpperCase() },
        include: { campaign: true },
      });

      if (foundPromo) {
        const promoResult = await PromoService.validatePromo(userId, rawCode);
        promoDiscount = promoResult.discount;
        appliedPromoCodeId = promoResult.promoCodeId;
        appliedPromoCodeStr = promoResult.code;
        isFreeDelivery = promoResult.isFreeDelivery;
      } else {
        // Fallback to legacy Coupon
        const coupon = await prisma.coupon.findUnique({ where: { code: rawCode } });
        if (!coupon || !coupon.isActive) throw new AppError('Invalid or expired coupon/promo code');
        if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError('Coupon has expired');
        let eligibleSubtotal = subtotal;
        if (coupon.shopId) {
          eligibleSubtotal = orderItemsData
            .filter(item => item.shopId === coupon.shopId)
            .reduce((sum, item) => sum + item.totalPrice, 0);
            
          if (eligibleSubtotal === 0) {
            throw new AppError('This coupon is not valid for the items in your cart');
          }
        }

        if (eligibleSubtotal < Number(coupon.minOrderAmount)) throw new AppError(`Minimum order of ₹${coupon.minOrderAmount} required for this coupon`);
        
        const userUsages = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
        if (userUsages >= coupon.perUserLimit) throw new AppError('You have reached the usage limit for this coupon');
        if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) throw new AppError('Coupon usage limit reached');

        if (coupon.discountType === 'PERCENTAGE') {
          couponDiscount = (eligibleSubtotal * Number(coupon.discountValue)) / 100;
          if (coupon.maxDiscount && Number(coupon.maxDiscount) > 0) {
            couponDiscount = Math.min(couponDiscount, Number(coupon.maxDiscount));
          }
        } else {
          couponDiscount = Math.min(Number(coupon.discountValue), eligibleSubtotal);
        }
        
        appliedCouponId = coupon.id;
      }
    }

    // 11. Calculate discount
    const totalPromotionalDiscount = firstOrderDiscount + promoDiscount + couponDiscount;
    const discountedSubtotal = Math.max(0, subtotal - totalPromotionalDiscount);

    // 12. Calculate Taxes
    const taxBreakdown = await TaxService.calculateTaxForItems(orderItemsData, shippingAddress);

    // 13. Calculate delivery dynamically
    const deliveryResult = await DeliveryService.calculateDeliveryCharges(orderItemsData, shippingAddress);
    let deliveryCharge = deliveryResult.totalDeliveryFee;
    
    if (isFreeDelivery) {
      deliveryCharge = 0;
      deliveryResult.totalDeliveryFee = 0; // Or indicate it was waived
    }

    let totalAmount = discountedSubtotal + taxBreakdown.totalTax + deliveryCharge; // Final payable before wallet

    // 14. Check wallet usage
    let walletAmount = 0;
    if (useWallet) {
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      const walletBalance = wallet ? Number(wallet.balance) : 0;

      if (walletBalance > 0) {
        const walletConfig = await SystemSettingService.getWalletConfig();
        const maxRedeemable = (totalAmount * walletConfig.max_order_redemption_percent) / 100;
        walletAmount = Math.min(walletBalance, maxRedeemable, totalAmount);
        walletAmount = Math.round(walletAmount * 100) / 100;
      }
    }

    // 15. Calculate payment amount
    const paymentAmount = Math.max(0, totalAmount - walletAmount);
    
    return {
      subtotal,
      firstOrderDiscount,
      promoDiscount,
      couponDiscount,
      taxBreakdown,
      deliveryResult,
      deliveryCharge,
      totalAmount,
      walletAmount,
      paymentAmount,
      appliedOfferId,
      appliedPromoCodeId,
      appliedPromoCodeStr,
      appliedCouponId,
      orderItemsData,
      cartId: cart.id,
      user
    };
  }

  static async processCheckout(userId: string, body: any) {
    const { addressId, shippingAddress, paymentMethod = 'CASHFREE' } = body;
    
    // Steps 1-15
    const preview = await this.previewCheckout(userId, body);
    const {
      subtotal,
      firstOrderDiscount,
      promoDiscount,
      couponDiscount,
      taxBreakdown,
      deliveryResult,
      deliveryCharge,
      totalAmount,
      walletAmount,
      paymentAmount,
      appliedOfferId,
      appliedPromoCodeId,
      appliedPromoCodeStr,
      appliedCouponId,
      orderItemsData,
      cartId,
      user
    } = preview;

    let targetAddress = shippingAddress;
    if (addressId) {
      const saved = await prisma.address.findFirst({
        where: { id: addressId, userId },
      });
      if (!saved) {
        throw new AppError('Selected delivery address not found', 404);
      }
      targetAddress = saved;
    }

    const addressName = targetAddress?.name || targetAddress?.fullName;
    const addressPincode = targetAddress?.pincode || targetAddress?.postalCode;

    if (!targetAddress || !addressName || !addressPincode) {
      throw new AppError('Complete shipping address is required (name, phone, addressLine1, city, state, pincode)');
    }

    const normalizedAddress = {
      name: addressName,
      phone: targetAddress.phone || user.phone,
      addressLine1: targetAddress.addressLine1,
      addressLine2: targetAddress.addressLine2 || null,
      city: targetAddress.city,
      district: targetAddress.district || targetAddress.city,
      state: targetAddress.state,
      pincode: addressPincode,
      country: targetAddress.country || 'India',
      latitude: targetAddress.latitude || null,
      longitude: targetAddress.longitude || null,
    };

    // 15b. Enforce Serviceability (Multi-Vendor Delivery Rules)
    const shopIds = orderItemsData.map((item: any) => item.shopId).filter(Boolean);
    if (shopIds.length > 0) {
      const serviceability = await ServiceabilityService.checkCartServiceability(normalizedAddress, shopIds);
      if (!serviceability.serviceable) {
        const failedShops = serviceability.shops.filter((s: any) => !s.serviceable);
        throw new AppError(`Delivery not serviceable for some shops. Reasons: ${failedShops.map((s: any) => s.reason).join(', ')}`, 400);
      }
      
      // Attach the serviceability metadata into the snapshot
      (normalizedAddress as any).serviceabilityResults = serviceability.shops;
      (normalizedAddress as any).taxBreakdown = taxBreakdown;
      (normalizedAddress as any).deliveryResult = deliveryResult;
    } else {
      (normalizedAddress as any).taxBreakdown = taxBreakdown;
      (normalizedAddress as any).deliveryResult = deliveryResult;
    }

    const paymentsConfig = await SystemSettingService.getPaymentsConfig();
    if (paymentMethod === 'COD' && !paymentsConfig.cod_enabled) {
      throw new AppError('Cash on Delivery is currently disabled');
    }

    const isCOD = paymentMethod === 'COD';
    const isFreeOrder = paymentAmount === 0;

    const orderNumber = `ORD-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 16. Create order (Transactional)
    const order = await prisma.$transaction(async (tx) => {
      if (walletAmount > 0) {
        await WalletService.debitWallet({
          userId,
          amount: walletAmount,
          category: WalletTxCategory.ORDER_PAYMENT,
          description: `Payment for Order #${orderNumber}`,
        });
      }

      // 16. Lock rows in deterministic order to prevent deadlocks
      const sortedItems = [...orderItemsData].sort((a, b) => a.variantId.localeCompare(b.variantId));
      for (const item of sortedItems) {
        // SELECT FOR UPDATE locks the row until transaction COMMIT/ROLLBACK
        const lockedVariant = await tx.$queryRaw<{ stockQuantity: number }[]>`
          SELECT "stockQuantity" FROM "product_variants"
          WHERE id = ${item.variantId} FOR UPDATE
        `;

        if (!lockedVariant || lockedVariant.length === 0) {
          throw new AppError(`Variant ${item.variantId} not found`);
        }

        if (lockedVariant[0].stockQuantity < item.quantity) {
          throw new AppError(`Not enough stock for ${item.productName} (${item.size}, ${item.color}). Only ${lockedVariant[0].stockQuantity} left.`);
        }
      }

      // Determine fallback flagship store if product has no shopId
      const fallbackShop = await tx.shop.findFirst({ where: { slug: 'decodex-flagship' } })
        || await tx.shop.findFirst({ where: { status: 'ACTIVE' } });
      const defaultShopId = fallbackShop ? fallbackShop.id : null;

      // Group items by shopId
      const shopMap = new Map<string, typeof orderItemsData>();
      for (const it of orderItemsData) {
        const sId = it.shopId || defaultShopId;
        const key = sId || 'unknown';
        if (!shopMap.has(key)) shopMap.set(key, []);
        shopMap.get(key)!.push(it);
      }

      // 1. Create Parent Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: isCOD || isFreeOrder ? OrderStatus.CONFIRMED : OrderStatus.PENDING_PAYMENT,
          subtotal,
          discount: firstOrderDiscount,
          couponDiscount,
          promoDiscount,
          walletAmount,
          deliveryCharge,
          totalAmount,
          payableAmount: paymentAmount,
          paymentAmount,
          paymentMethod: isCOD ? PaymentMethod.COD : PaymentMethod.CASHFREE,
          paymentStatus: isFreeOrder ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
          addressSnapshot: normalizedAddress,
          appliedOfferId,
          appliedPromoCodeId,
          appliedCouponId,
        },
      });

      // 2. Create Sub-Orders per Shop (Multi-Vendor Unified Cart)
      let subCounter = 1;
      const createdSubOrders = [];

      for (const [sId, items] of shopMap.entries()) {
        let shop = null;
        if (sId !== 'unknown') {
          shop = await tx.shop.findUnique({ where: { id: sId } });
        }

        const shopCommissionRate = shop ? Number(shop.commissionRate) : 10;
        const shopSubtotal = items.reduce((acc, curr) => acc + curr.totalPrice, 0);
        
        // Retrieve shop-specific delivery fee
        const shopShippingFee = (sId !== 'unknown' && deliveryResult?.breakdown?.[sId]) ? deliveryResult.breakdown[sId] : 0;
        
        const commissionAmount = Math.round(((shopSubtotal * shopCommissionRate) / 100) * 100) / 100;
        
        // Payout = Subtotal - Commission + ShippingFee
        // Note: If taxes are exclusive, they should be added here too. For simplicity in Phase 40, we ensure shipping is accurately passed on.
        const shopPayoutAmount = Math.max(0, shopSubtotal - commissionAmount + shopShippingFee);
        const subOrderNumber = `${orderNumber}-S${subCounter++}`;

        // Proportional Promo & Coupon Allocation across Multi-Vendor SubOrders
        const totalPromoOrCoupon = promoDiscount + couponDiscount;
        const shopPromoAllocation = subtotal > 0
          ? Math.round((shopSubtotal / subtotal) * totalPromoOrCoupon * 100) / 100
          : 0;

        let subOrder = null;
        if (shop) {
          subOrder = await tx.subOrder.create({
            data: {
              subOrderNumber,
              parentOrderId: newOrder.id,
              shopId: shop.id,
              status: isCOD || isFreeOrder ? SubOrderStatus.CONFIRMED : SubOrderStatus.CONFIRMED,
              subtotal: shopSubtotal,
              promoDiscountAllocation: shopPromoAllocation,
              shippingFee: shopShippingFee,
              commissionRate: shopCommissionRate,
              commissionAmount,
              shopPayoutAmount,
            },
          });
          createdSubOrders.push(subOrder);
        }

        // Create OrderItems linked to both Parent Order and Sub-Order
        for (const item of items) {
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              subOrderId: subOrder ? subOrder.id : null,
              shopId: shop ? shop.id : null,
              productId: item.productId,
              variantId: item.variantId,
              productName: item.productName,
              sku: item.sku,
              size: item.size,
              color: item.color,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
            },
          });
        }
      }


      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          newStatus: newOrder.status,
          changedBy: 'SYSTEM',
          reason: 'Order created',
        },
      });

      // Handle Inventory: Reserve or Deduct
      for (const item of orderItemsData) {
        if (isCOD || isFreeOrder) {
          // Permanently deduct since order is confirmed immediately
          await tx.inventoryTransaction.create({
            data: { variantId: item.variantId, quantity: -item.quantity, type: 'SALE', referenceId: newOrder.id },
          });
        } else {
          // Just reserve the stock for pending payments (preventing overselling)
          await tx.inventoryReservation.create({
            data: {
              orderId: newOrder.id,
              variantId: item.variantId,
              quantity: item.quantity,
              status: 'ACTIVE',
              expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins expiry
            }
          });
        }

        // Decrement fast-cache stock in both cases so concurrent checkouts cannot double-book
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      await tx.cartItem.deleteMany({
        where: { cartId },
      });

      if (isCOD || isFreeOrder) {
        if (appliedOfferId) {
          await tx.offerUsage.create({ data: { offerId: appliedOfferId, userId, orderId: newOrder.id } });
          await tx.offer.update({ where: { id: appliedOfferId }, data: { timesUsed: { increment: 1 } } });
        }

        if (appliedPromoCodeStr) {
          await PromoService.consumePromo(tx, userId, appliedPromoCodeStr, subtotal, newOrder.id);
        } else if (appliedCouponId) {
          await tx.couponUsage.create({ data: { couponId: appliedCouponId, userId, orderId: newOrder.id } });
          await tx.coupon.update({ where: { id: appliedCouponId }, data: { timesUsed: { increment: 1 } } });
        }
      }

      const fullOrder = await tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          subOrders: {
            include: {
              shop: { select: { id: true, name: true, slug: true } },
              items: true,
            },
          },
        },
      });

      return fullOrder || newOrder;
    });

    // 18. Create payment attempt
    if (paymentMethod === 'CASHFREE' && paymentAmount > 0) {
      const cashfreeSession = await CashfreeService.createOrderSession({
        orderId: order.id,
        orderAmount: paymentAmount,
        customerId: user.id,
        customerName: targetAddress.name || user.name,
        customerEmail: targetAddress.email || user.email || `${user.phone}@store.com`,
        customerPhone: targetAddress.phone || user.phone,
      });

      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: paymentAmount,
          provider: 'CASHFREE',
          providerOrderId: cashfreeSession.cfOrderId.toString(),
          method: 'CASHFREE',
          status: PaymentStatus.PENDING,
        },
      });

      await prisma.paymentAttempt.create({
        data: {
          orderId: order.id,
          provider: 'CASHFREE',
          providerOrderId: cashfreeSession.cfOrderId.toString(),
          amount: paymentAmount,
          status: PaymentStatus.PENDING,
        },
      });

      // 19. Return checkout information
      return {
        isCashfree: true,
        order_id: order.id,
        order_number: order.orderNumber,
        subtotal,
        offer_discount: firstOrderDiscount,
        coupon_discount: couponDiscount,
        delivery_charge: deliveryCharge,
        wallet_amount: walletAmount,
        total_amount: totalAmount,
        payment_amount: paymentAmount,
        payment_session: cashfreeSession.paymentSessionId,
        payment_method: 'CASHFREE',
        sub_orders: (order as any).subOrders || [],
      };
    }

    // 19. Return checkout information
    return {
      isCashfree: false,
      order_id: order.id,
      order_number: order.orderNumber,
      subtotal,
      offer_discount: firstOrderDiscount,
      coupon_discount: couponDiscount,
      delivery_charge: deliveryCharge,
      wallet_amount: walletAmount,
      total_amount: totalAmount,
      payment_amount: paymentAmount,
      payment_method: order.paymentMethod,
      status: order.status,
      sub_orders: (order as any).subOrders || [],
    };
  }
}

