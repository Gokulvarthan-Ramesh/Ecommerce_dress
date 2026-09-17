import { PrismaClient } from '@prisma/client';
import {
  seedSettings,
  seedUsers,
  seedCategories,
  seedOffers,
  seedCoupons,
} from './seeders';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 ========================================');
  console.log('🌱 Starting database seed (Modular Seeders)');
  console.log('🌱 ========================================\n');

  // 1. System Settings
  await seedSettings(prisma);

  // 2. Users (Admin + Test Customer)
  await seedUsers(prisma);

  // 3. Categories (Men, Women, Kids with complete subcategories)
  await seedCategories(prisma);

  // 4. Offers (Auto-applied discounts)
  await seedOffers(prisma);

  // 5. Coupons (Promo codes)
  await seedCoupons(prisma);

  // Summary counts
  const [settingsCount, usersCount, categoriesCount, offersCount, couponsCount] =
    await Promise.all([
      prisma.systemSetting.count(),
      prisma.user.count(),
      prisma.category.count(),
      prisma.offer.count(),
      prisma.coupon.count(),
    ]);

  console.log('═══════════════════════════════════════════');
  console.log('  🌱 SEED COMPLETE — Summary');
  console.log('═══════════════════════════════════════════');
  console.log(`  ⚙️  System Settings : ${settingsCount}`);
  console.log(`  👤 Users           : ${usersCount} (Admin + Customer)`);
  console.log(`  📂 Categories      : ${categoriesCount} (Parent & Subcategories)`);
  console.log(`  🏷️  Offers          : ${offersCount}`);
  console.log(`  🎟️  Coupons         : ${couponsCount}`);
  console.log('═══════════════════════════════════════════');
  console.log('\n  🔑 Test Credentials:');
  console.log('  Admin    → admin@ecommerce.com / Admin@12345 (Phone: 9999999999)');
  console.log('  Customer → customer@test.com / Test@12345 (Phone: 9876543210)\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
