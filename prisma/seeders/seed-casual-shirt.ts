import { PrismaClient, ProductType } from '@prisma/client';
import { getDriveImageUrl } from '../../src/utils/googleDrive';

const prisma = new PrismaClient();

async function seedCasualShirt() {
    console.log("📦 Starting to seed Men's Checked Casual Shirt...");

    // Find category
    const categorySlug = 'men-shirts-casual-shirts';
    const category = await prisma.category.findUnique({
        where: { slug: categorySlug }
    });

    if (!category) {
        console.error(`❌ Category not found for slug: ${categorySlug}`);
        return;
    }

    const productSlug = 'mens-checked-casual-shirt';
    const mrp = 1499;
    const sellingPrice = 999;

    const product = await prisma.product.upsert({
        where: { slug: productSlug },
        create: {
            categoryId: category.id,
            name: "Men's Checked Casual Shirt",
            slug: productSlug,
            description: "Stylish men's checked casual shirt featuring a classic button-down collar, long sleeves with roll-up cuffs, and a comfortable everyday fit. Available in black, green, and red checked patterns.",
            brand: "UrbanCore",
            productType: ProductType.VARIABLE,
            fabric: "Cotton",
            fit: "Regular",
            sleeve: "Full Sleeve",
            pattern: "Checked",
            basePrice: mrp,
            sellingPrice: sellingPrice,
            minStock: 5,
            isActive: true
        },
        update: {
            categoryId: category.id,
            name: "Men's Checked Casual Shirt",
            description: "Stylish men's checked casual shirt featuring a classic button-down collar, long sleeves with roll-up cuffs, and a comfortable everyday fit. Available in black, green, and red checked patterns.",
            productType: ProductType.VARIABLE,
            fabric: "Cotton",
            fit: "Regular",
            sleeve: "Full Sleeve",
            pattern: "Checked",
            basePrice: mrp,
            sellingPrice: sellingPrice,
            isActive: true
        }
    });

    const images = [
        {
            driveId: "1n1FLEonCYUqNw5L1HJbadRMj4ELPwLbv",
            altText: "Men's Checked Casual Shirt Black",
            isPrimary: true
        },
        {
            driveId: "12uVn3sApiBL-5XvMIvJQQYHC2QzLBsLf",
            altText: "Men's Checked Casual Shirt Green",
            isPrimary: false
        },
        {
            driveId: "1lAITk3upDN1O2k-Std5Kakqsu7_LVJ50",
            altText: "Men's Checked Casual Shirt Red",
            isPrimary: false
        }
    ];

    let sortOrder = 0;
    
    // Add images
    for (const img of images) {
        await prisma.productImage.create({
            data: {
                productId: product.id,
                imageUrl: getDriveImageUrl(img.driveId),
                altText: img.altText,
                sortOrder: sortOrder++,
                isPrimary: img.isPrimary
            }
        });
    }

    const variants = [
        { sku: "MCS-BLK-M", size: "M", color: "Black", driveId: "1n1FLEonCYUqNw5L1HJbadRMj4ELPwLbv" },
        { sku: "MCS-BLK-L", size: "L", color: "Black", driveId: "1n1FLEonCYUqNw5L1HJbadRMj4ELPwLbv" },
        { sku: "MCS-BLK-XL", size: "XL", color: "Black", driveId: "1n1FLEonCYUqNw5L1HJbadRMj4ELPwLbv" },
        { sku: "MCS-BLK-2XL", size: "2XL", color: "Black", driveId: "1n1FLEonCYUqNw5L1HJbadRMj4ELPwLbv" },
        
        { sku: "MCS-GRN-M", size: "M", color: "Green", driveId: "12uVn3sApiBL-5XvMIvJQQYHC2QzLBsLf" },
        { sku: "MCS-GRN-L", size: "L", color: "Green", driveId: "12uVn3sApiBL-5XvMIvJQQYHC2QzLBsLf" },
        { sku: "MCS-GRN-XL", size: "XL", color: "Green", driveId: "12uVn3sApiBL-5XvMIvJQQYHC2QzLBsLf" },
        { sku: "MCS-GRN-2XL", size: "2XL", color: "Green", driveId: "12uVn3sApiBL-5XvMIvJQQYHC2QzLBsLf" },
        
        { sku: "MCS-RED-M", size: "M", color: "Red", driveId: "1lAITk3upDN1O2k-Std5Kakqsu7_LVJ50" },
        { sku: "MCS-RED-L", size: "L", color: "Red", driveId: "1lAITk3upDN1O2k-Std5Kakqsu7_LVJ50" },
        { sku: "MCS-RED-XL", size: "XL", color: "Red", driveId: "1lAITk3upDN1O2k-Std5Kakqsu7_LVJ50" },
        { sku: "MCS-RED-2XL", size: "2XL", color: "Red", driveId: "1lAITk3upDN1O2k-Std5Kakqsu7_LVJ50" }
    ];

    // Add variants
    for (const v of variants) {
        const imageUrl = getDriveImageUrl(v.driveId);
        
        await prisma.productVariant.upsert({
            where: { sku: v.sku },
            create: {
                productId: product.id,
                sku: v.sku,
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

    console.log(`✅ Seeded Men's Checked Casual Shirt with ${variants.length} variants and ${images.length} images.`);
}

seedCasualShirt()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
