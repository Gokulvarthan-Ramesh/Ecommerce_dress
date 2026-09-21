import { PrismaClient, ProductType } from '@prisma/client';

export async function seedProducts(prisma: PrismaClient) {
  console.log('🛍️  Seeding products...');

  let category = await prisma.category.findFirst({
    where: { level: 3 }, // Leaf category
  });

  if (!category) {
    category = await prisma.category.findFirst();
  }

  const shop = await prisma.shop.findFirst();

  if (!category) {
    console.log('⚠️  No category found, skipping product seed.');
    return null;
  }

  const product = await prisma.product.upsert({
    where: { slug: 'sample-tshirt' },
    update: {},
    create: {
      name: 'Sample T-Shirt',
      slug: 'sample-tshirt',
      description: 'A comfortable cotton t-shirt for daily wear.',
      brand: 'Essential',
      productType: ProductType.SIMPLE,
      sku: 'TSHIRT-001',
      basePrice: 999.00,
      sellingPrice: 499.00,
      categoryId: category.id,
      shopId: shop?.id,
      isFeatured: true,
      variants: {
        create: [
          {
            sku: 'TSHIRT-001-M',
            size: 'M',
            color: 'Black',
            price: 499.00,
            stockQuantity: 100,
          }
        ]
      },
      images: {
        create: [
          {
            imageUrl: 'https://via.placeholder.com/300?text=Sample+TShirt',
            isPrimary: true,
          }
        ]
      }
    }
  });

  console.log(`   ✅ Product: ${product.name}`);
  return product;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedProducts(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error seeding products:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
