import { PrismaClient, Role } from '@prisma/client';

export async function seedAddresses(prisma: PrismaClient) {
  console.log('📍 Seeding addresses...');

  const customer = await prisma.user.findFirst({
    where: { role: Role.CUSTOMER }
  });

  if (!customer) {
    console.log('⚠️  No customer found, skipping address seed.');
    return null;
  }

  const address = await prisma.address.create({
    data: {
      userId: customer.id,
      name: customer.name,
      phone: customer.phone,
      addressLine1: '123 Main Street',
      addressLine2: 'Apt 4B',
      city: 'Bangalore',
      district: 'Bangalore Urban',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
      isDefault: true,
    }
  });

  console.log(`   ✅ Address created for user: ${customer.email}`);
  return address;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedAddresses(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error seeding addresses:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
