import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ENV } from '../../src/config/env';

export async function seedUsers(prisma: PrismaClient) {
  console.log('👤 Seeding users (Admin & Test Customer)...');

  // 1. Admin User
  const adminEmail = ENV.SEED.ADMIN_EMAIL;
  const adminPassword = ENV.SEED.ADMIN_PASSWORD;
  const adminPhone = ENV.SEED.ADMIN_PHONE;
  const adminName = ENV.SEED.ADMIN_NAME;

  const adminPasswordHash = await bcrypt.hash(adminPassword, ENV.BCRYPT_SALT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { email: adminEmail, name: adminName, phone: adminPhone, passwordHash: adminPasswordHash },
    create: {
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      referralCode: 'ADMIN001',
      wallet: { create: { balance: 0.0 } },
    },
  });
  console.log(`   ✅ Admin: ${admin.email} | Phone: ${admin.phone} | Password: [CONFIGURED IN ENV]`);

  // 2. Test Customer
  const customerEmail = ENV.SEED.CUSTOMER_EMAIL;
  const customerPassword = ENV.SEED.CUSTOMER_PASSWORD;
  const customerPhone = ENV.SEED.CUSTOMER_PHONE;

  const customerPasswordHash = await bcrypt.hash(customerPassword, ENV.BCRYPT_SALT_ROUNDS);
  const customer = await prisma.user.upsert({
    where: { email: customerEmail },
    update: { phone: customerPhone, passwordHash: customerPasswordHash },
    create: {
      name: 'Test Customer',
      email: customerEmail,
      phone: customerPhone,
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      referralCode: 'TESTREF01',
      wallet: { create: { balance: 150.0 } },
    },
  });
  console.log(`   ✅ Customer: ${customer.email} | Phone: ${customer.phone} | Password: [CONFIGURED IN ENV]\n`);

  return { admin, customer };
}


// Allow direct execution: npx tsx prisma/seeders/users.seeder.ts
if (require.main === module) {
  const prisma = new PrismaClient();
  seedUsers(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error seeding users:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
