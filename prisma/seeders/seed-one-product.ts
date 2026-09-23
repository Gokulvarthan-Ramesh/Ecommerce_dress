import { PrismaClient, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedOneProduct() {
  console.log('Seeding single product...');

  try {
    const categorySlug = 'men-t-shirts-casual-t-shirts-round-neck-t-shirts';
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug }
    });

    if (!category) {
      throw new Error(`Category with slug ${categorySlug} not found`);
    }

    const productName = 'UrbanCore Premium Cotton Round Neck T-Shirt';
    const productSlug = 'urbancore-premium-cotton-round-neck-t-shirt-black';

    // Create a real t-shirt image using Freepik and Pinterest
    const productImageUrl = 'https://img.freepik.com/free-photo/black-t-shirt-front-isolated_125540-1070.jpg';
    const variantImgUrl = 'https://i.pinimg.com/736x/8f/c9/2d/8fc92dcbaee9c84eeb1d46b8568c0b24.jpg';

    await prisma.product.upsert({
      where: { slug: productSlug },
      update: {},
      create: {
        name: productName,
        slug: productSlug,
        description: 'Experience the finest quality with our UrbanCore Premium Cotton Round Neck T-Shirt. Perfect for any occasion.',
        brand: 'UrbanCore',
        productType: ProductType.VARIABLE,
        sku: 'UC-CRT-BLK',
        basePrice: 799,
        sellingPrice: 599,
        categoryId: category.id,
        fabric: '100% Cotton',
        fit: 'Regular',
        pattern: 'Solid',
        sleeve: 'Half Sleeve',
        isFeatured: true,
        images: {
          create: [
            {
              imageUrl: productImageUrl,
              isPrimary: true,
            }
          ]
        },
        variants: {
          create: [
            {
              sku: 'UC-CRT-BLK-S',
              size: 'S',
              color: 'Black',
              colorHex: '#000000',
              price: 599,
              stockQuantity: 50,
              imageUrl: variantImgUrl
            },
            {
              sku: 'UC-CRT-BLK-M',
              size: 'M',
              color: 'Black',
              colorHex: '#000000',
              price: 599,
              stockQuantity: 50,
              imageUrl: variantImgUrl
            },
            {
              sku: 'UC-CRT-BLK-L',
              size: 'L',
              color: 'Black',
              colorHex: '#000000',
              price: 599,
              stockQuantity: 50,
              imageUrl: variantImgUrl
            },
            {
              sku: 'UC-CRT-BLK-XL',
              size: 'XL',
              color: 'Black',
              colorHex: '#000000',
              price: 599,
              stockQuantity: 50,
              imageUrl: variantImgUrl
            }
          ]
        }
      }
    });

    console.log('✅ Successfully seeded UrbanCore product!');
  } catch (e) {
    console.error('❌ Error seeding product:', e);
  } finally {
    await prisma.$disconnect();
  }
}

seedOneProduct();
