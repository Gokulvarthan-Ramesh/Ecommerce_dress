import { PrismaClient, SubOrderStatus, PayoutStatus } from '@prisma/client';

export async function seedFinance(prisma: PrismaClient) {
  console.log('💰 Seeding finance reconciliation data...');

  const order = await prisma.order.findUnique({
    where: { orderNumber: 'ORD-100001' },
    include: { orderItems: true }
  });

  if (!order || order.orderItems.length === 0) {
    console.log('⚠️  Order ORD-100001 not found, skipping finance seed.');
    return null;
  }

  const orderItem = order.orderItems[0];
  const shopId = orderItem.shopId;
  
  if (!shopId) {
    console.log('⚠️  OrderItem has no shopId, skipping finance seed.');
    return null;
  }

  // Create SubOrder
  const subOrder = await prisma.subOrder.upsert({
    where: { subOrderNumber: 'SUB-100001-1' },
    update: {},
    create: {
      subOrderNumber: 'SUB-100001-1',
      parentOrderId: order.id,
      shopId: shopId,
      status: SubOrderStatus.DELIVERED,
      subtotal: orderItem.totalPrice,
      commissionRate: 10.0,
      commissionAmount: Number(orderItem.totalPrice) * 0.10,
      shopPayoutAmount: Number(orderItem.totalPrice) * 0.90,
      items: {
        connect: { id: orderItem.id }
      }
    }
  });

  // Create ShopPayout
  const payout = await prisma.shopPayout.create({
    data: {
      shopId: shopId,
      amount: subOrder.shopPayoutAmount,
      status: PayoutStatus.PAID,
      bankReference: 'TXN-PAYOUT-001',
      processedAt: new Date(),
      items: {
        create: [
          {
            subOrderId: subOrder.id,
            grossAmount: subOrder.subtotal,
            commission: subOrder.commissionAmount,
            refundAdjustment: 0.0,
            netAmount: subOrder.shopPayoutAmount,
          }
        ]
      }
    }
  });

  // Link suborder to payout
  await prisma.subOrder.update({
    where: { id: subOrder.id },
    data: { payoutId: payout.id }
  });

  console.log(`   ✅ Finance data created for SubOrder ${subOrder.subOrderNumber}`);
  return subOrder;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedFinance(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error seeding finance data:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
