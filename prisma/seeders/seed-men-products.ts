import { PrismaClient, ProductType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generateCategorySlug(path: string[]) {
    let slug = '';
    for (const part of path) {
        if (!slug) {
            slug = slugify(part);
        } else {
            slug = `${slug}-${slugify(part)}`;
        }
    }
    return slug;
}

function generateProductSlug(productName: string, sku: string) {
    return `${slugify(productName)}-${sku.toLowerCase()}`;
}

async function seedMenProducts() {
    console.log('📦 Starting to seed Men products...');
    const dataPath = 'C:\\Users\\THIS PC\\.gemini\\antigravity-ide\\brain\\0d7c53e7-88ee-4730-a270-b3fccdc06082\\scratch\\products_v2.json';
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(rawData);

    let productCount = 0;
    let variantCount = 0;
    let imageCount = 0;

    for (const p of data.products) {
        const categorySlug = generateCategorySlug(p.categoryPath);
        
        // Find category
        const category = await prisma.category.findUnique({
            where: { slug: categorySlug }
        });

        if (!category) {
            console.error(`❌ Category not found for slug: ${categorySlug}`);
            continue;
        }

        // We use the SKU from the first variant to make the product slug unique
        const productSlug = generateProductSlug(p.name, p.variants[0].sku);

        const product = await prisma.product.upsert({
            where: { slug: productSlug },
            create: {
                categoryId: category.id,
                name: p.name,
                slug: productSlug,
                description: `${p.name} from ${p.brand}`,
                brand: p.brand,
                productType: ProductType.VARIABLE,
                fabric: p.material,
                fit: p.fit,
                pattern: p.pattern,
                basePrice: p.mrp,
                sellingPrice: p.sellingPrice,
                minStock: 5,
                isActive: true
            },
            update: {
                categoryId: category.id,
                name: p.name,
                description: `${p.name} from ${p.brand}`,
                brand: p.brand,
                productType: ProductType.VARIABLE,
                fabric: p.material,
                fit: p.fit,
                pattern: p.pattern,
                basePrice: p.mrp,
                sellingPrice: p.sellingPrice,
                isActive: true
            }
        });
        productCount++;

        let sortOrder = 0;

        for (const v of p.variants) {
            const variant = await prisma.productVariant.upsert({
                where: { sku: v.sku },
                create: {
                    productId: product.id,
                    sku: v.sku,
                    size: v.size,
                    color: v.color,
                    price: p.sellingPrice, // Set variant price same as product selling price
                    stockQuantity: v.stock,
                    isActive: true
                },
                update: {
                    productId: product.id,
                    size: v.size,
                    color: v.color,
                    price: p.sellingPrice,
                    stockQuantity: v.stock,
                    isActive: true
                }
            });
            variantCount++;

            // Create images if they don't exist
            // Using placeholder with search query as text so UI looks okay
            const imageKeys = ['front', 'back', 'detail'];
            let isPrimary = true;
            for (const key of imageKeys) {
                if (v.images[key]) {
                    const query = v.images[key];
                    const encodedQuery = encodeURIComponent(query);
                    // Use Placehold.co to dynamically render the search string on the placeholder
                    const imageUrl = `https://placehold.co/800x1200/e2e8f0/1e293b?text=${encodedQuery}`;
                    
                    // Note: In real setup, you can replace these URLs with real images.
                    // For now, these are guaranteed to not be broken URLs and describe exactly what is needed.
                    await prisma.productImage.create({
                        data: {
                            productId: product.id,
                            imageUrl: imageUrl,
                            altText: query,
                            sortOrder: sortOrder++,
                            isPrimary: isPrimary
                        }
                    });
                    imageCount++;
                    isPrimary = false; // Only first image per variant/product is primary initially
                }
            }
        }
        console.log(`✅ Seeded ${p.name} (${p.variants.length} variants)`);
    }

    console.log(`\n🎉 Seeding complete!`);
    console.log(`   Products created: ${productCount}`);
    console.log(`   Variants created: ${variantCount}`);
    console.log(`   Images created: ${imageCount}`);
}

seedMenProducts()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
