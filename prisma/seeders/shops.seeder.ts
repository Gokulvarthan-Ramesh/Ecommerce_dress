import { PrismaClient, ShopStatus, Role } from '@prisma/client';
import { ENV } from '../../src/config/env';

export async function seedShops(prisma: PrismaClient) {
  console.log('🏪 Seeding multi-shop marketplace stores...');

  // Find admin user to own the flagship store
  const admin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });

  if (!admin) {
    console.log('   ⚠️ No admin found to assign flagship store. Skipping.');
    return;
  }

  // 1. DecodeX Official Flagship Store
  const flagship = await prisma.shop.upsert({
    where: { slug: 'decodex-flagship' },
    update: {
      status: ShopStatus.ACTIVE,
      isOpen: true,
      name: 'DecodeX Official Flagship Store',
    },
    create: {
      name: 'DecodeX Official Flagship Store',
      slug: 'decodex-flagship',
      description: 'The official brand direct flagship store for DecodeX fashionwear and premium apparel collections.',
      logoUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&fit=crop&q=80',
      status: ShopStatus.ACTIVE,
      ownerId: admin.id,
      businessEmail: ENV.BRAND.EMAIL,
      businessPhone: ENV.BRAND.PHONE,
      supportPhone: ENV.BRAND.PHONE,
      addressLine: 'DecodeX Plaza, 100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      gstin: '29ABCDE1234F1Z5',
      panNumber: 'ABCDE1234F',
      bankAccountNumber: '987654321012',
      bankIfsc: 'HDFC0001234',
      bankBeneficiaryName: 'DecodeX Retail LLP',
      commissionRate: 0.00, // 0% commission for official in-house brand store
      isOpen: true,
      rating: 4.9,
      reviewCount: 1420,
    },
  });
  console.log(`   ✅ Flagship Store: "${flagship.name}" (Slug: ${flagship.slug})`);

  // 2. Demo Vendor Shop (Urban Threads Boutique)
  // Check or create a vendor user
  let vendorUser = await prisma.user.findUnique({ where: { phone: '9840012345' } });
  if (!vendorUser) {
    vendorUser = await prisma.user.create({
      data: {
        name: 'Priya Sharma (Urban Threads)',
        phone: '9840012345',
        email: 'priya@urbanthreads.com',
        role: Role.VENDOR,
        referralCode: 'URBAN001',
        wallet: { create: { balance: 0.0 } },
      },
    });
  } else if (vendorUser.role !== Role.VENDOR) {
    await prisma.user.update({
      where: { id: vendorUser.id },
      data: { role: Role.VENDOR },
    });
  }

  const vendorShop = await prisma.shop.upsert({
    where: { slug: 'urban-threads' },
    update: {
      status: ShopStatus.ACTIVE,
      isOpen: true,
    },
    create: {
      name: 'Urban Threads Studio',
      slug: 'urban-threads',
      description: 'Contemporary streetwear, graphic tees, and modern tailored daily essentials.',
      logoUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=200&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&fit=crop&q=80',
      status: ShopStatus.ACTIVE,
      ownerId: vendorUser.id,
      businessEmail: 'support@urbanthreads.com',
      businessPhone: '9840012345',
      supportPhone: '9840012345',
      addressLine: 'Shop 24, Phoenix Marketcity, Velachery',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600042',
      gstin: '33AABCT9876P1Z9',
      panNumber: 'AABCT9876P',
      bankAccountNumber: '123456789012',
      bankIfsc: 'ICIC0000001',
      bankBeneficiaryName: 'Urban Threads Studio',
      commissionRate: 8.50, // 8.5% platform commission
      isOpen: true,
      rating: 4.8,
      reviewCount: 380,
    },
  });
  console.log(`   ✅ Vendor Store: "${vendorShop.name}" (Slug: ${vendorShop.slug})`);

  // Assign any orphan products to the flagship store
  const updatedCount = await prisma.product.updateMany({
    where: { shopId: null },
    data: { shopId: flagship.id },
  });
  if (updatedCount.count > 0) {
    console.log(`   🔗 Linked ${updatedCount.count} existing products to Flagship Store.`);
  }

  console.log('   ✅ Multi-shop seeder complete.\n');
  return { flagship, vendorShop };
}

// Allow direct execution: npx tsx prisma/seeders/shops.seeder.ts
if (require.main === module) {
  const prisma = new PrismaClient();
  seedShops(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error seeding shops:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
