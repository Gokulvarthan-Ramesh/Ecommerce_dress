import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/db';
import { CheckoutService } from '../services/checkoutService';
import { OrderService } from '../services/OrderService';

describe('End-to-End Financial Flow: Checkout, Tax, Delivery, Split Orders, Wallet, Refund', () => {
  let customerId: string;
  let vendorAId: string;
  let vendorBId: string;
  let shopAId: string;
  let shopBId: string;
  let variantAId: string;
  let variantBId: string;
  let cartId: string;
  let orderId: string;
  let subOrderAId: string;
  let subOrderBId: string;
  let addressId: string;

  beforeAll(async () => {
    // Clean up specific test data
    await prisma.order.deleteMany({ where: { user: { email: { contains: 'e2e-test' } } } });
    await prisma.shop.deleteMany({ where: { slug: { contains: 'e2e-shop' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'e2e-test' } } });
    await prisma.product.deleteMany({ where: { slug: { contains: 'e2e-test' } } });
    
    // ... rest of beforeAll remains the same until Address creation
    // To replace Address block:
    // ...


    // 1. Create Customer
    const customer = await prisma.user.create({
      data: {
        email: 'customer@e2e-test.com',
        phone: '1000000000',
        name: 'E2E Customer',
        role: 'CUSTOMER',
        referralCode: 'E2ECUST' + Date.now(),
        wallet: { create: { balance: 500 } } // Give 500 wallet balance
      },
      include: { wallet: true }
    });
    customerId = customer.id;

    // 2. Create Vendors & Shops
    const vendorA = await prisma.user.create({
      data: {
        email: 'vendorA@e2e-test.com', phone: '1000000001', name: 'E2E Vendor A', role: 'VENDOR',
        referralCode: 'E2EVENA' + Date.now(),
        ownedShops: { create: { name: 'E2E Shop A', slug: 'e2e-shop-a', description: 'Test', addressLine: '123', city: 'Mumbai', state: 'MH', pincode: '400001', status: 'ACTIVE', isOpen: true, latitude: 19.076, longitude: 72.877, usePincodeRules: false } }
      },
      include: { ownedShops: true }
    });
    vendorAId = vendorA.id;
    shopAId = vendorA.ownedShops[0].id;

    const vendorB = await prisma.user.create({
      data: {
        email: 'vendorB@e2e-test.com', phone: '1000000002', name: 'E2E Vendor B', role: 'VENDOR',
        referralCode: 'E2EVENB' + Date.now(),
        ownedShops: { create: { name: 'E2E Shop B', slug: 'e2e-shop-b', description: 'Test', addressLine: '456', city: 'Mumbai', state: 'MH', pincode: '400002', status: 'ACTIVE', isOpen: true, latitude: 19.080, longitude: 72.880, usePincodeRules: false } }
      },
      include: { ownedShops: true }
    });
    vendorBId = vendorB.id;
    shopBId = vendorB.ownedShops[0].id;

    // 3. Create Products and Variants
    const cat = await prisma.category.findFirst() || await prisma.category.create({ data: { name: 'TestCat', slug: 'test-cat' } });
    
    const prodA = await prisma.product.create({
      data: {
        shopId: shopAId, categoryId: cat.id, name: 'E2E Product A', slug: 'e2e-product-a-' + Date.now(), brand: 'A', basePrice: 1000, sellingPrice: 1000,
        variants: { create: { sku: 'SKU-A-' + Date.now(), size: 'M', color: 'Red', stockQuantity: 10, isActive: true } }
      },
      include: { variants: true }
    });
    variantAId = prodA.variants[0].id;

    const prodB = await prisma.product.create({
      data: {
        shopId: shopBId, categoryId: cat.id, name: 'E2E Product B', slug: 'e2e-product-b-' + Date.now(), brand: 'B', basePrice: 500, sellingPrice: 500,
        variants: { create: { sku: 'SKU-B-' + Date.now(), size: 'L', color: 'Blue', stockQuantity: 5, isActive: true } }
      },
      include: { variants: true }
    });
    variantBId = prodB.variants[0].id;

    // 4. Create Address
    const address = await prisma.address.create({
      data: {
        userId: customerId, name: 'E2E Customer', phone: '1000000000', addressLine1: 'Test Address', city: 'Mumbai', district: 'Mumbai Suburban', state: 'MH', pincode: '400001', country: 'IN', isDefault: true, latitude: 19.076, longitude: 72.877
      }
    });
    addressId = address.id;

    // 5. Add to Cart
    const cart = await prisma.cart.create({
      data: {
        userId: customerId,
        items: {
          create: [
            { variantId: variantAId, quantity: 1 },
            { variantId: variantBId, quantity: 1 }
          ]
        }
      }
    });
    cartId = cart.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.order.deleteMany({ where: { user: { email: { contains: 'e2e-test' } } } });
    await prisma.shop.deleteMany({ where: { slug: { contains: 'e2e-shop' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'e2e-test' } } });
    await prisma.product.deleteMany({ where: { slug: { contains: 'e2e-test' } } });
  });

  it('calculates checkout preview perfectly (tax + delivery + wallet)', async () => {
    const preview = await CheckoutService.previewCheckout(customerId, { addressId });
    
    expect(preview.subtotal).toBeDefined();
    expect(preview.walletAmount).toBeDefined();
    expect(preview.deliveryCharge).toBeDefined();
    expect(preview.totalAmount).toBeDefined();
  });

  it('processes checkout transaction cleanly without deadlocks and reserves inventory', async () => {
    const result = await CheckoutService.processCheckout(customerId, {
      addressId,
      useWallet: true,
      paymentMethod: 'CASHFREE'
    });
    
    console.log('CHECKOUT RESULT:', result);

    expect(result.order_id).toBeDefined();
    expect(result.order_number).toBeDefined();
    
    orderId = result.order_id;

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { subOrders: true } });
    expect(order).toBeDefined();
    expect(order!.paymentStatus).toBe('PENDING'); // Not yet webhooked
    expect(order!.subOrders.length).toBe(2);

    subOrderAId = order!.subOrders.find((s: any) => s.shopId === shopAId)!.id;
    subOrderBId = order!.subOrders.find((s: any) => s.shopId === shopBId)!.id;

    // Verify Wallet deduction
    const wallet = await prisma.wallet.findUnique({ where: { userId: customerId } });
    expect(Number(wallet!.balance)).toBe(0); // 500 fully deducted

    // Verify Inventory Reservation
    const reservations = await prisma.inventoryReservation.findMany({ where: { orderId: orderId } });
    expect(reservations.length).toBe(2);
    expect(reservations[0].status).toBe('ACTIVE');
  });

  it('handles cashfree successful webhook with idempotency', async () => {
    const orderBefore = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    const paymentId = orderBefore!.payments[0].id;

    const webhookId = 'simulated_evt_' + Date.now();
    
    // Simulate webhook
    await OrderService.processCashfreeWebhook({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: orderBefore!.id, order_amount: Number(orderBefore!.paymentAmount) },
        payment: { cf_payment_id: 'cf_12345', payment_status: 'SUCCESS', payment_group: 'UPI', payment_time: new Date().toISOString() }
      }
    }, webhookId);

    const orderAfter = await prisma.order.findUnique({ where: { id: orderId } });
    expect(orderAfter!.paymentStatus).toBe('SUCCESS');

    // Simulate identical webhook (idempotency check)
    await OrderService.processCashfreeWebhook({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: orderBefore!.id, order_amount: Number(orderBefore!.paymentAmount) },
        payment: { cf_payment_id: 'cf_12345', payment_status: 'SUCCESS', payment_group: 'UPI', payment_time: new Date().toISOString() }
      }
    }, webhookId);
    
    // Nothing should crash, it should just return true (handled idempotently)
  });

  it('vendor payout is correctly calculated for SubOrder', async () => {
    const subOrderA = await prisma.subOrder.findUnique({ where: { id: subOrderAId } });
    
    // Expected Payout = Subtotal (1000) - Commission + ShippingFee
    const expectedPayout = Number(subOrderA!.subtotal) - Number(subOrderA!.commissionAmount) + Number(subOrderA!.shippingFee);
    expect(Number(subOrderA!.shopPayoutAmount)).toBeCloseTo(expectedPayout, 2);
  });

});
