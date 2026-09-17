import { PrismaClient, DiscountType } from '@prisma/client';

export async function seedOffers(prisma: PrismaClient) {
  console.log('🏷️  Seeding offers (Auto-applied discounts)...');

  const offers = [
    {
      id: 'seed-offer-welcome300',
      name: 'WELCOME300',
      type: DiscountType.FIXED,
      value: 300,
      minimumOrderAmount: 1000,
      firstOrderOnly: true,
      perUserLimit: 1,
      isActive: true,
    },
    {
      id: 'seed-offer-flat10',
      name: 'FLAT10',
      type: DiscountType.PERCENTAGE,
      value: 10,
      minimumOrderAmount: 1500,
      firstOrderOnly: false,
      perUserLimit: 3,
      usageLimit: 500,
      isActive: true,
    },
    {
      id: 'seed-offer-megasale500',
      name: 'FESTIVE500',
      type: DiscountType.FIXED,
      value: 500,
      minimumOrderAmount: 2499,
      firstOrderOnly: false,
      perUserLimit: 2,
      usageLimit: 250,
      isActive: true,
    },
  ];

  for (const offer of offers) {
    await prisma.offer.upsert({
      where: { id: offer.id },
      update: { ...offer },
      create: { ...offer },
    });
  }

  console.log(`   ✅ ${offers.length} offers seeded (${offers.map((o) => o.name).join(', ')}).\n`);
}

// Allow direct execution: npx tsx prisma/seeders/offers.seeder.ts
if (require.main === module) {
  const prisma = new PrismaClient();
  seedOffers(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error seeding offers:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
