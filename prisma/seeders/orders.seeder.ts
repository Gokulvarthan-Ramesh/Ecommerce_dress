import { PrismaClient, Role, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export async function seedOrders(prisma: PrismaClient) {
  console.log('📦 Seeding orders...');

  const customer = await prisma.user.findFirst({
    where: { role: Role.CUSTOMER }
  });

  const product = await prisma.product.findFirst({
    include: { variants: true }
  });

  const address = await prisma.address.findFirst({
    where: { userId: customer?.id }
  });

  if (!customer || !product || !product.variants[0] || !address) {
    console.log('⚠️  Customer, Product, or Address missing, skipping order seed.');
    return null;
  }

  const variant = product.variants[0];

  const order = await prisma.order.upsert({
    where: { orderNumber: 'ORD-100001' },
    update: {},
    create: {
      orderNumber: 'ORD-100001',
      userId: customer.id,
      status: OrderStatus.CONFIRMED,
      subtotal: variant.price,
      totalAmount: variant.price,
      paymentAmount: variant.price,
      payableAmount: variant.price,
      paymentMethod: PaymentMethod.CASHFREE,
      paymentStatus: PaymentStatus.SUCCESS,
      addressSnapshot: {
        name: address.name,
        phone: address.phone,
        addressLine1: address.addressLine1,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country,
      },
      orderItems: {
        create: [
          {
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            unitPrice: variant.price,
            quantity: 1,
            totalPrice: variant.price,
            shopId: product.shopId,
          }
        ]
      },
      payments: {
        create: [
          {
            provider: 'CASHFREE',
            amount: variant.price,
            status: PaymentStatus.SUCCESS,
            method: 'UPI',
          }
        ]
      }
    }
  });

  console.log(`   ✅ Order created: ${order.orderNumber}`);
  return order;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedOrders(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error seeding orders:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
