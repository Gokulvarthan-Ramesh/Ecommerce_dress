import { PrismaClient, Role } from '@prisma/client';

export async function seedCarts(prisma: PrismaClient) {
  console.log('🛒 Seeding carts...');

  const customer = await prisma.user.findFirst({
    where: { role: Role.CUSTOMER }
  });

  const variant = await prisma.productVariant.findFirst();

  if (!customer || !variant) {
    console.log('⚠️  Customer or Product Variant missing, skipping cart seed.');
    return null;
  }

  const cart = await prisma.cart.upsert({
    where: { userId: customer.id },
    update: {},
    create: {
      userId: customer.id,
      items: {
        create: [
          {
            variantId: variant.id,
            quantity: 1,
          }
        ]
      }
    }
  });

  console.log(`   ✅ Cart created for user: ${customer.email}`);
  return cart;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedCarts(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error seeding carts:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
