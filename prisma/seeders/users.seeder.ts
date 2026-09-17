import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedUsers(prisma: PrismaClient) {
  console.log('👤 Seeding users (Admin & Test Customer)...');

  // 1. Admin User
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'decodexfashionwear@gmail.com' },
    update: { email: 'decodexfashionwear@gmail.com' },
    create: {
      name: 'DecodeX Administrator',
      email: 'decodexfashionwear@gmail.com',
      phone: '9999999999',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      referralCode: 'ADMIN001',
      wallet: { create: { balance: 0.0 } },
    },
  });
  console.log(`   ✅ Admin: ${admin.email} | Phone: 9999999999 | Password: Admin@12345`);

  // 2. Test Customer
  const customerPasswordHash = await bcrypt.hash('Test@12345', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '9876543210',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      referralCode: 'TESTREF01',
      wallet: { create: { balance: 150.0 } },
    },
  });
  console.log(`   ✅ Customer: ${customer.email} | Phone: 9876543210 | Password: Test@12345\n`);

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
