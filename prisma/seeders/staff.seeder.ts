import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedStaff(prisma: PrismaClient) {
  console.log('👔 Seeding admin staff...');

  const staffEmail = 'staffmember@example.com';
  const passwordHash = await bcrypt.hash('SecurePassword123', 10);

  const staff = await prisma.adminUser.upsert({
    where: { email: staffEmail },
    update: {
      name: 'John Doe (Staff)',
      role: 'STAFF',
      permissions: ['MANAGE_PRODUCTS', 'VIEW_ORDERS'],
      passwordHash,
    },
    create: {
      email: staffEmail,
      name: 'John Doe (Staff)',
      passwordHash,
      role: 'STAFF',
      permissions: ['MANAGE_PRODUCTS', 'VIEW_ORDERS'],
      isActive: true,
    }
  });

  console.log(`   ✅ Staff created: ${staff.name} (${staff.email})`);
  return staff;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedStaff(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error seeding staff:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
