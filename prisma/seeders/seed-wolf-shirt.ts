import { PrismaClient, ProductType } from '@prisma/client';
import { getDriveImageUrl } from '../../src/utils/googleDrive';

const prisma = new PrismaClient();

async function seedWolfShirt() {
    console.log('📦 Starting to seed Wolf Graphic T-Shirt...');

    // Find category
    const categorySlug = 'men-t-shirts-oversized-t-shirts-graphic-oversized';
    const category = await prisma.category.findUnique({
        where: { slug: categorySlug }
    });

    if (!category) {
        console.error(`❌ Category not found for slug: ${categorySlug}`);
        return;
    }

    const productSlug = 'wolf-graphic-t-shirt';
    const mrp = 1499;
    const sellingPrice = 999;

    const product = await prisma.product.upsert({
        where: { slug: productSlug },
        create: {
            categoryId: category.id,
            name: "Wolf Graphic T-Shirt",
            slug: productSlug,
            description: "Stylish wolf graphic T-shirt featuring a realistic wolf design combined with geometric artwork and claw-print sleeve details.",
            brand: "UrbanCore",
            productType: ProductType.VARIABLE,
            fabric: "Cotton",
            fit: "Oversized",
            pattern: "Graphic Print",
            basePrice: mrp,
            sellingPrice: sellingPrice,
            minStock: 5,
            isActive: true
        },
        update: {
            categoryId: category.id,
            name: "Wolf Graphic T-Shirt",
            description: "Stylish wolf graphic T-shirt featuring a realistic wolf design combined with geometric artwork and claw-print sleeve details.",
            productType: ProductType.VARIABLE,
            fabric: "Cotton",
            fit: "Oversized",
            pattern: "Graphic Print",
            basePrice: mrp,
            sellingPrice: sellingPrice,
            isActive: true
        }
    });

    const variants = [
        { color: "Green", size: "M" },
        { color: "Green", size: "L" },
        { color: "Green", size: "XL" },
        { color: "Green", size: "2XL" },
        { color: "Brown", size: "M" },
        { color: "Brown", size: "L" },
        { color: "Brown", size: "XL" },
        { color: "Brown", size: "2XL" }
    ];

    const colorsData = {
        "Green": "1--1RK4qLh4aXD21yBjEdfIbUusc1P3-n",
        "Brown": "1F-BC7QbNrD6ZsGjj6gmVgPUjqJjL5WWv"
    };

    let sortOrder = 0;
    
    // Add images
    for (const [color, driveId] of Object.entries(colorsData)) {
        await prisma.productImage.create({
            data: {
                productId: product.id,
                imageUrl: getDriveImageUrl(driveId),
                altText: `Wolf Graphic T-Shirt ${color}`,
                sortOrder: sortOrder++,
                isPrimary: color === "Green"
            }
        });
    }

    // Add variants
    for (const v of variants) {
        const sku = `WGT-${v.color.substring(0,3).toUpperCase()}-${v.size}`;
        const driveId = colorsData[v.color as keyof typeof colorsData];
        const imageUrl = getDriveImageUrl(driveId);
        
        await prisma.productVariant.upsert({
            where: { sku: sku },
            create: {
                productId: product.id,
                sku: sku,
                size: v.size,
                color: v.color,
                price: sellingPrice,
                stockQuantity: 20,
                imageUrl: imageUrl,
                isActive: true
            },
            update: {
                productId: product.id,
                size: v.size,
                color: v.color,
                price: sellingPrice,
                stockQuantity: 20,
                imageUrl: imageUrl,
                isActive: true
            }
        });
    }

    console.log(`✅ Seeded Wolf Graphic T-Shirt with ${variants.length} variants and 2 images.`);
}

seedWolfShirt()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
