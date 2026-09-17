import { PrismaClient } from '@prisma/client';
import { ENV } from '../src/config/env';
import {
  seedSettings,
  seedUsers,
  seedCategories,
  seedOffers,
  seedCoupons,
  seedShops,
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

  // 6. Multi-Shop Stores (Flagship + Vendor Shops)
  await seedShops(prisma);

  // Summary counts
  const [settingsCount, usersCount, categoriesCount, offersCount, couponsCount, shopsCount] =
    await Promise.all([
      prisma.systemSetting.count(),
      prisma.user.count(),
      prisma.category.count(),
      prisma.offer.count(),
      prisma.coupon.count(),
      prisma.shop.count(),
    ]);

  console.log('═══════════════════════════════════════════');
  console.log('  🌱 SEED COMPLETE — Summary');
  console.log('═══════════════════════════════════════════');
  console.log(`  ⚙️  System Settings : ${settingsCount}`);
  console.log(`  👤 Users           : ${usersCount} (Admin + Customer + Vendor)`);
  console.log(`  📂 Categories      : ${categoriesCount} (Parent & Subcategories)`);
  console.log(`  🏷️  Offers          : ${offersCount}`);
  console.log(`  🎟️  Coupons         : ${couponsCount}`);
  console.log(`  🏪 Shops           : ${shopsCount} (Flagship & Vendor Stores)`);

  console.log('═══════════════════════════════════════════');
  console.log('\n  🔑 Test Credentials (Configured via .env):');
  console.log(`  Admin    → ${ENV.SEED.ADMIN_EMAIL} / ${ENV.SEED.ADMIN_PASSWORD} (Phone: ${ENV.SEED.ADMIN_PHONE})`);
  console.log(`  Customer → ${ENV.SEED.CUSTOMER_EMAIL} / ${ENV.SEED.CUSTOMER_PASSWORD} (Phone: ${ENV.SEED.CUSTOMER_PHONE})\n`);
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
