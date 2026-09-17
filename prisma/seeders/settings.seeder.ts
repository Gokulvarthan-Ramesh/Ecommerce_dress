import { PrismaClient } from '@prisma/client';

export async function seedSettings(prisma: PrismaClient) {
  console.log('⚙️  Seeding system settings...');

  const defaultSettings = [
    {
      key: 'first_order_offer',
      value: {
        is_enabled: true,
        discount_amount: 300,
        min_order_value: 1000,
      },
      description: 'First-order promotional discount for new customers',
    },
    {
      key: 'referral_program',
      value: {
        is_enabled: true,
        referrer_bonus: 100,
        referee_bonus: 50,
        min_qualifying_order: 799,
        reward_on_status: 'DELIVERED',
      },
      description: 'Referral program reward settings',
    },
    {
      key: 'shipping',
      value: {
        standard_delivery_fee: 50,
        free_delivery_threshold: 999,
      },
      description: 'Shipping charges and free delivery threshold',
    },
    {
      key: 'payments',
      value: {
        cod_enabled: true,
        cod_fee: 0,
        cashfree_enabled: true,
      },
      description: 'Payment methods availability',
    },
    {
      key: 'wallet',
      value: {
        max_order_redemption_percent: 50,
      },
      description: 'In-app wallet rules and redemption caps',
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: { key: setting.key, value: setting.value, description: setting.description },
    });
  }

  console.log(`   ✅ ${defaultSettings.length} system settings seeded.\n`);
}

// Allow direct execution: npx tsx prisma/seeders/settings.seeder.ts
if (require.main === module) {
  const prisma = new PrismaClient();
  seedSettings(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error seeding settings:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
