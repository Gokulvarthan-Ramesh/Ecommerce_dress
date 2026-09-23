import { PrismaClient, ProductType } from '@prisma/client';
import { getDriveImageUrl } from '../../src/utils/googleDrive';

const prisma = new PrismaClient();

async function seedBaggyJeans() {
    console.log("📦 Starting to seed Men's Baggy Fit Jeans...");

    // Find category
    const categorySlug = 'men-jeans-relaxed-baggy-baggy-fit';
    const category = await prisma.category.findUnique({
        where: { slug: categorySlug }
    });

    if (!category) {
        console.error(`❌ Category not found for slug: ${categorySlug}`);
        return;
    }

    const productSlug = 'mens-baggy-fit-jeans';
    const mrp = 1999;
    const sellingPrice = 1299;

    const product = await prisma.product.upsert({
        where: { slug: productSlug },
        create: {
            categoryId: category.id,
            name: "Men's Baggy Fit Jeans",
            slug: productSlug,
            description: "Stylish men's baggy fit jeans featuring a relaxed wide-leg silhouette, classic five-pocket construction, belt loops, button closure, and a washed denim finish. Available in black, blue, and grey.",
            brand: "UrbanCore",
            productType: ProductType.VARIABLE,
            fabric: "Denim",
            fit: "Baggy",
            pattern: "Solid",
            basePrice: mrp,
            sellingPrice: sellingPrice,
            minStock: 5,
            isActive: true
        },
        update: {
            categoryId: category.id,
            name: "Men's Baggy Fit Jeans",
            description: "Stylish men's baggy fit jeans featuring a relaxed wide-leg silhouette, classic five-pocket construction, belt loops, button closure, and a washed denim finish. Available in black, blue, and grey.",
            productType: ProductType.VARIABLE,
            fabric: "Denim",
            fit: "Baggy",
            pattern: "Solid",
            basePrice: mrp,
            sellingPrice: sellingPrice,
            isActive: true
        }
    });

    const colors = [
        { name: "Black", hex: "#111111", driveId: "1_nOs2verM1sE7yOSRn-sqJxmAKuJuJil" },
        { name: "Blue", hex: "#A8C7DF", driveId: "1qKo9EGfraoC45GSp1PAq89U7hZe4VnBW" },
        { name: "Grey", hex: "#777777", driveId: "1n629Y7TpvKRVD9noWiJb6sUlU1_-bpfg" }
    ];

    const sizes = [
        { size: "30", priceModifier: 0, stock: 20 },
        { size: "32", priceModifier: 50, stock: 15 },
        { size: "34", priceModifier: 100, stock: 10 },
        { size: "36", priceModifier: 150, stock: 5 },
        { size: "38", priceModifier: 200, stock: 2 }
    ];

    let sortOrder = 0;
    
    // Add 3 images per color to the product
    let totalImages = 0;
    for (const color of colors) {
        for (let i = 1; i <= 3; i++) {
            let imgUrl = getDriveImageUrl(color.driveId);
            if (i > 1) {
                // Mock additional images using placehold.co
                imgUrl = `https://placehold.co/800x1200/e2e8f0/1e293b?text=Men's+Baggy+Fit+Jeans+${color.name}+Angle+${i}`;
            }

            await prisma.productImage.create({
                data: {
                    productId: product.id,
                    imageUrl: imgUrl,
                    altText: `Men's Baggy Fit Jeans ${color.name} - View ${i}`,
                    sortOrder: sortOrder++,
                    isPrimary: i === 1 && color.name === "Black" // Only first image of first color is true primary
                }
            });
            totalImages++;
        }
    }

    let totalVariants = 0;
    // Add variants with different prices and stock
    for (const color of colors) {
        // Collect images for this color
        const variantImages = [];
        for (let i = 1; i <= 3; i++) {
            let imgUrl = getDriveImageUrl(color.driveId);
            if (i > 1) {
                imgUrl = `https://placehold.co/800x1200/e2e8f0/1e293b?text=Men's+Baggy+Fit+Jeans+${color.name}+Angle+${i}`;
            }
            variantImages.push(imgUrl);
        }

        for (const s of sizes) {
            const sku = `MBJ-${color.name.substring(0,3).toUpperCase()}-${s.size}`;
            const variantPrice = sellingPrice + s.priceModifier;
            const primaryImageUrl = variantImages[0];
            
            await prisma.productVariant.upsert({
                where: { sku: sku },
                create: {
                    productId: product.id,
                    sku: sku,
                    size: s.size,
                    color: color.name,
                    colorHex: color.hex,
                    price: variantPrice,
                    stockQuantity: s.stock,
                    imageUrl: primaryImageUrl,
                    images: variantImages,
                    isActive: true
                },
                update: {
                    productId: product.id,
                    size: s.size,
                    color: color.name,
                    colorHex: color.hex,
                    price: variantPrice,
                    stockQuantity: s.stock,
                    imageUrl: primaryImageUrl,
                    images: variantImages,
                    isActive: true
                }
            });
            totalVariants++;
        }
    }

    console.log(`✅ Seeded Men's Baggy Fit Jeans with ${totalVariants} variants and ${totalImages} images.`);
}

seedBaggyJeans()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
