import { PrismaClient, DiscountType } from '@prisma/client';

export async function seedCoupons(prisma: PrismaClient) {
  console.log('🎟️  Seeding coupons (Promo codes)...');

  const coupons = [
    {
      code: 'SAVE20',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      minOrderAmount: 999,
      maxDiscount: 500,
      usageLimit: 200,
      perUserLimit: 1,
      expiresAt: new Date('2027-03-31T23:59:59.000Z'),
      isActive: true,
    },
    {
      code: 'FLAT200',
      discountType: DiscountType.FIXED,
      discountValue: 200,
      minOrderAmount: 1200,
      usageLimit: 100,
      perUserLimit: 1,
      expiresAt: new Date('2027-06-30T23:59:59.000Z'),
      isActive: true,
    },
    {
      code: 'VIP50',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 50,
      minOrderAmount: 1999,
      maxDiscount: 1000,
      usageLimit: 50,
      perUserLimit: 1,
      expiresAt: new Date('2027-12-31T23:59:59.000Z'),
      isActive: true,
    },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: { ...coupon },
      create: { ...coupon },
    });
  }

  console.log(`   ✅ ${coupons.length} coupons seeded (${coupons.map((c) => c.code).join(', ')}).\n`);
}

// Allow direct execution: npx tsx prisma/seeders/coupons.seeder.ts
if (require.main === module) {
  const prisma = new PrismaClient();
  seedCoupons(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error seeding coupons:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
