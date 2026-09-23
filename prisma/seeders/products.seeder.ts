import { PrismaClient, ProductType } from '@prisma/client';

// Hardcoded parsed lists from user's request
const parsedCategoryProducts: Record<string, string[]> = {
  "Round Neck T-Shirts": [
    "Classic Cotton Round Neck T-Shirt",
    "Essential Crew Neck T-Shirt",
    "Premium Everyday Round Neck Tee",
    "Comfort Fit Cotton T-Shirt"
  ],
  "V-Neck T-Shirts": [
    "Classic V-Neck T-Shirt",
    "Premium V-Neck Cotton Tee",
    "Slim Fit V-Neck T-Shirt",
    "Everyday V-Neck Tee"
  ],
  "Henley T-Shirts": [
    "Classic Henley T-Shirt",
    "Premium Cotton Henley",
    "Slim Fit Henley Tee",
    "Casual Button Henley"
  ],
  "Full Sleeve T-Shirts": [
    "Classic Full Sleeve Tee",
    "Premium Cotton Full Sleeve",
    "Regular Fit Long Sleeve Tee",
    "Everyday Full Sleeve T-Shirt"
  ],
  "Regular Polo": [
    "Classic Cotton Polo",
    "Essential Pique Polo",
    "Premium Regular Polo",
    "Everyday Casual Polo"
  ],
  "Slim Fit Polo": [
    "Slim Fit Cotton Polo",
    "Premium Slim Polo",
    "Stretch Slim Polo",
    "Classic Fitted Polo"
  ],
  "Printed Polo": [
    "Striped Printed Polo",
    "Geometric Print Polo",
    "Floral Print Polo",
    "Contrast Print Polo"
  ],
  "Full Sleeve Polo": [
    "Classic Full Sleeve Polo",
    "Premium Pique Full Sleeve Polo",
    "Casual Long Sleeve Polo",
    "Cotton Full Sleeve Polo"
  ],
  "Plain Oversized": [
    "Essential Oversized Tee",
    "Heavy Cotton Oversized Tee",
    "Premium Drop Shoulder Tee",
    "Relaxed Oversized T-Shirt"
  ],
  "Graphic Oversized": [
    "Urban Graphic Oversized Tee",
    "Street Art Oversized Tee",
    "Vintage Graphic Tee",
    "Typography Oversized Tee"
  ],
  "Printed Oversized": [
    "Abstract Print Oversized Tee",
    "Floral Print Oversized Tee",
    "All Over Print Tee",
    "Street Print Oversized Tee"
  ],
  "Typography": [
    "Bold Typography Tee",
    "Minimal Quote Tee",
    "Statement Text Tee",
    "Urban Typography Tee"
  ],
  "Anime & Character": [
    "Anime Character Tee",
    "Manga Graphic Tee",
    "Hero Graphic Tee",
    "Character Print Oversized Tee"
  ],
  "Vintage Prints": [
    "Vintage Logo Tee",
    "Retro Graphic Tee",
    "Classic Vintage Print",
    "Washed Vintage Tee"
  ],
  "Artistic Prints": [
    "Abstract Art Tee",
    "Brushstroke Graphic Tee",
    "Contemporary Art Tee",
    "Creative Illustration Tee"
  ],
  "Dry Fit": [
    "Performance Dry Fit Tee",
    "Quick Dry Training Tee",
    "Active Dry Fit T-Shirt",
    "Lightweight Performance Tee"
  ],
  "Running T-Shirts": [
    "Lightweight Running Tee",
    "Reflective Running T-Shirt",
    "Performance Running Top",
    "Breathable Running Tee"
  ],
  "Gym T-Shirts": [
    "Gym Performance Tee",
    "Muscle Fit Gym T-Shirt",
    "Training Cotton Tee",
    "Workout Dry Fit Tee"
  ],
  "Training T-Shirts": [
    "Performance Training Tee",
    "Athletic Training T-Shirt",
    "Workout Training Top",
    "Active Training Tee"
  ],
  "Checked Shirts": [
    "Classic Check Shirt",
    "Buffalo Check Shirt",
    "Multi-Check Shirt",
    "Plaid Cotton Shirt"
  ],
  "Printed Shirts": [
    "Cartoon Print Shirt",
    "Floral Print Shirt",
    "Graphic Print Shirt",
    "Tropical Print Shirt"
  ],
  "Striped Shirts": [
    "Classic Stripe Shirt",
    "Vertical Stripe Shirt",
    "Multi Stripe Casual Shirt",
    "Fine Stripe Cotton Shirt"
  ],
  "Solid Shirts": [
    "Classic Solid Cotton Shirt",
    "Premium Casual Shirt",
    "Regular Fit Solid Shirt",
    "Soft Cotton Casual Shirt"
  ],
  "Solid Formal": [
    "Classic White Formal Shirt",
    "Premium Blue Formal Shirt",
    "Essential Black Formal Shirt",
    "Regular Fit Formal Shirt"
  ],
  "Striped Formal": [
    "Fine Stripe Formal Shirt",
    "Classic Blue Stripe Shirt",
    "Office Stripe Shirt",
    "Premium Stripe Shirt"
  ],
  "Slim Fit Formal": [
    "Slim Fit White Shirt",
    "Slim Fit Blue Shirt",
    "Stretch Slim Formal Shirt",
    "Premium Slim Office Shirt"
  ],
  "Regular Fit Formal": [
    "Classic Regular Formal Shirt",
    "Comfort Fit Office Shirt",
    "Cotton Regular Formal",
    "Premium Regular Shirt"
  ],
  "Light Wash": [
    "Classic Light Regular Jeans",
    "Comfort Light Denim",
    "Everyday Regular Jeans",
    "Vintage Wash Regular Jeans"
  ],
  "Dark Wash": [
    "Classic Dark Regular Jeans",
    "Premium Indigo Denim",
    "Smart Dark Wash Jeans",
    "Deep Blue Regular Jeans"
  ],
  "Overshirt": [
    "Heavy Denim Overshirt",
    "Relaxed Denim Overshirt",
    "Utility Denim Overshirt",
    "Layered Denim Shirt"
  ],
  "Solid Linen": [
    "Premium Linen Shirt",
    "Classic Solid Linen",
    "Relaxed Linen Shirt",
    "Pure Linen Casual Shirt"
  ],
  "Printed Linen": [
    "Floral Linen Shirt",
    "Tropical Linen Shirt",
    "Resort Print Linen",
    "Abstract Linen Shirt"
  ],
  "Casual Linen": [
    "Everyday Linen Shirt",
    "Relaxed Casual Linen",
    "Summer Linen Shirt",
    "Lightweight Linen Shirt"
  ],
  "Mid Wash": [
    "Classic Mid Wash Jeans",
    "Everyday Blue Denim",
    "Comfort Regular Denim",
    "Premium Mid Wash Jeans"
  ],
  "Stretch": [
    "Stretch Skinny Jeans",
    "Comfort Skinny Denim",
    "Flex Fit Skinny Jeans",
    "Performance Stretch Denim"
  ],
  "Distressed": [
    "Light Distressed Skinny",
    "Ripped Skinny Jeans",
    "Heavy Distressed Denim",
    "Urban Ripped Skinny"
  ],
  "Solid": [
    "Classic Solid Skinny",
    "Black Skinny Jeans",
    "Clean Finish Skinny",
    "Premium Solid Denim"
  ],
  "Relaxed Fit": [
    "Relaxed Blue Jeans",
    "Comfort Relaxed Denim",
    "Everyday Relaxed Jeans",
    "Premium Relaxed Fit"
  ],
  "Baggy Fit": [
    "Classic Baggy Jeans",
    "Streetwear Baggy Denim",
    "Relaxed Baggy Blue Jeans",
    "Wide Baggy Denim"
  ],
  "Wide Leg": [
    "Wide Leg Denim",
    "Extra Wide Jeans",
    "Street Wide Leg Jeans",
    "Relaxed Wide Denim"
  ],
  "Ripped": [
    "Knee Ripped Jeans",
    "Heavy Ripped Denim",
    "Light Ripped Jeans",
    "Street Ripped Denim"
  ],
  "Heavy Distressed": [
    "Heavy Distressed Blue",
    "Destroyed Denim",
    "Extreme Distressed Jeans",
    "Vintage Destroyed Denim"
  ],
  "Light Distressed": [
    "Light Distressed Denim",
    "Subtle Ripped Jeans",
    "Casual Distressed Jeans",
    "Vintage Wash Distressed"
  ],
  "Slim Fit": [
    "Slim Fit Cotton Chinos",
    "Stretch Slim Chinos",
    "Premium Slim Chinos",
    "Classic Slim Khakis"
  ],
  "Regular Fit": [
    "Classic Regular Chinos",
    "Cotton Regular Chinos",
    "Comfort Khaki Chinos",
    "Everyday Regular Chinos"
  ],
  "Pleated": [
    "Classic Pleated Trousers",
    "Double Pleat Trousers",
    "Relaxed Pleated Pants",
    "Premium Pleated Formal"
  ],
  "Stretch Chinos": [
    "Flex Stretch Chinos",
    "Comfort Stretch Khakis",
    "Performance Chinos",
    "Premium Stretch Chinos"
  ],
  "Regular Cargo": [
    "Classic Cargo Pants",
    "Cotton Utility Cargo",
    "Everyday Cargo Trousers",
    "Multi-Pocket Cargo"
  ],
  "Relaxed Cargo": [
    "Relaxed Cargo Pants",
    "Loose Fit Utility Cargo",
    "Comfort Cargo Trousers",
    "Street Relaxed Cargo"
  ],
  "Jogger Cargo": [
    "Cargo Joggers",
    "Stretch Cargo Joggers",
    "Utility Jogger Pants",
    "Slim Cargo Joggers"
  ],
  "Short Kurtas": [
    "Cotton Short Kurta",
    "Printed Short Kurta",
    "Linen Short Kurta",
    "Casual Short Kurta"
  ],
  "Long Kurtas": [
    "Classic Cotton Kurta",
    "Premium Silk Kurta",
    "Linen Long Kurta",
    "Embroidered Long Kurta"
  ],
  "Printed Kurtas": [
    "Floral Printed Kurta",
    "Block Print Kurta",
    "Geometric Print Kurta",
    "Traditional Print Kurta"
  ],
  "Kurta Pyjama": [
    "Cotton Kurta Pyjama Set",
    "Premium Silk Kurta Set",
    "Festive Kurta Pyjama",
    "Embroidered Kurta Set"
  ],
  "Kurta Churidar": [
    "Classic Kurta Churidar",
    "Festive Churidar Set",
    "Embroidered Churidar Set",
    "Premium Ethnic Set"
  ],
  "Kurta Dhoti": [
    "Cotton Kurta Dhoti Set",
    "Festive Dhoti Set",
    "Designer Dhoti Kurta",
    "Silk Dhoti Set"
  ],
  "Sherwani": [
    "Classic Wedding Sherwani",
    "Embroidered Sherwani",
    "Royal Sherwani",
    "Designer Sherwani"
  ],
  "Nehru Jacket": [
    "Classic Nehru Jacket",
    "Printed Nehru Jacket",
    "Embroidered Nehru Jacket",
    "Silk Nehru Jacket"
  ],
  "Indo-Western": [
    "Classic Indo-Western Set",
    "Designer Indo-Western",
    "Embroidered Indo-Western",
    "Premium Indo-Western Suit"
  ],
  "Denim Jackets": [
    "Classic Blue Denim Jacket",
    "Black Denim Jacket",
    "Washed Denim Jacket",
    "Oversized Denim Jacket"
  ],
  "Bomber Jackets": [
    "Classic Bomber Jacket",
    "Lightweight Bomber",
    "Printed Bomber Jacket",
    "Premium Bomber Jacket"
  ],
  "Biker Jackets": [
    "Classic Biker Jacket",
    "Faux Leather Biker",
    "Premium Leather Biker",
    "Quilted Biker Jacket"
  ],
  "Puffer Jackets": [
    "Lightweight Puffer",
    "Hooded Puffer Jacket",
    "Quilted Puffer",
    "Premium Winter Puffer"
  ],
  "Parkas": [
    "Classic Winter Parka",
    "Hooded Parka",
    "Long Parka",
    "Insulated Parka"
  ],
  "Quilted Jackets": [
    "Lightweight Quilted Jacket",
    "Hooded Quilted Jacket",
    "Diamond Quilted Jacket",
    "Premium Quilted Jacket"
  ],
  "Long Coats": [
    "Classic Long Coat",
    "Wool Blend Long Coat",
    "Double Breasted Coat",
    "Premium Long Coat"
  ],
  "Overcoats": [
    "Classic Overcoat",
    "Wool Overcoat",
    "Double Breasted Overcoat",
    "Premium Formal Overcoat"
  ],
  "Single Breasted": [
    "Classic Single Breasted Blazer",
    "Slim Fit Single Breasted",
    "Textured Single Breasted",
    "Premium Single Breasted"
  ],
  "Double Breasted": [
    "Classic Double Breasted Blazer",
    "Premium Double Breasted",
    "Textured Double Breasted",
    "Formal Double Breasted"
  ],
  "Casual Blazers": [
    "Cotton Casual Blazer",
    "Linen Casual Blazer",
    "Textured Casual Blazer",
    "Relaxed Casual Blazer"
  ],
  "Two Piece": [
    "Classic Two Piece Suit",
    "Slim Fit Two Piece",
    "Premium Business Suit",
    "Textured Two Piece Suit"
  ],
  "Three Piece": [
    "Classic Three Piece Suit",
    "Premium Three Piece Suit",
    "Wedding Three Piece Suit",
    "Textured Three Piece Suit"
  ],
  "Tuxedo": [
    "Classic Black Tuxedo",
    "Slim Fit Tuxedo",
    "Velvet Tuxedo",
    "Premium Wedding Tuxedo"
  ],
  "Maxi Dresses": [
    "Floral Maxi Dress",
    "Party Maxi Dress",
    "Printed Maxi Dress",
    "Tiered Maxi Dress"
  ],
  "Midi Dresses": [
    "Floral Midi Dress",
    "Casual Cotton Midi",
    "Printed Midi Dress",
    "Belted Midi Dress"
  ],
  "A-Line Dresses": [
    "Classic A-Line Dress",
    "Floral A-Line Dress",
    "Cotton A-Line Dress",
    "Printed A-Line Dress"
  ],
  "Bodycon": [
    "Classic Bodycon Dress",
    "Sequin Bodycon Dress",
    "Velvet Bodycon Dress",
    "Ruched Bodycon Dress"
  ],
  "Cocktail": [
    "Satin Cocktail Dress",
    "Sequin Cocktail Dress",
    "Lace Cocktail Dress",
    "Velvet Cocktail Dress"
  ],
  "Sequin Dresses": [
    "Silver Sequin Dress",
    "Gold Sequin Dress",
    "Black Sequin Dress",
    "Rose Sequin Dress"
  ],
  "Jumpsuits": [
    "Wide Leg Jumpsuit",
    "Casual Cotton Jumpsuit",
    "Printed Jumpsuit",
    "Party Jumpsuit"
  ],
  "Rompers": [
    "Cotton Baby Romper",
    "Printed Baby Romper",
    "Animal Print Romper",
    "Party Romper"
  ],
  "Graphic T-Shirts": [
    "Cartoon Graphic T-Shirt",
    "Superhero Graphic Tee",
    "Animal Print Tee",
    "Fun Typography Tee"
  ],
  "Polo T-Shirts": [
    "Classic Kids Polo",
    "Striped Polo",
    "Contrast Collar Polo",
    "Printed Polo"
  ],
  "Printed T-Shirts": [
    "Cartoon Print Tee",
    "Animal Print Tee",
    "Vehicle Print Tee",
    "Graphic Print Tee"
  ],
  "Casual Shirts": [
    "Cotton Casual Shirt",
    "Checked Casual Shirt",
    "Printed Casual Shirt",
    "Denim Casual Shirt"
  ],
  "Jeans": [
    "Kids Slim Jeans",
    "Regular Fit Jeans",
    "Stretch Denim Jeans",
    "Comfort Jeans"
  ],
  "Trousers": [
    "Cotton Trousers",
    "Casual Trousers",
    "Formal Trousers",
    "Stretch Trousers"
  ],
  "Cargo Pants": [
    "Classic Cargo Pants",
    "Utility Cargo Pants",
    "Jogger Cargo",
    "Multi-Pocket Cargo"
  ],
  "Party Frocks": [
    "Floral Party Frock",
    "Sequin Party Frock",
    "Bow Party Frock",
    "Princess Frock"
  ],
  "Casual Dresses": [
    "Cotton Casual Dress",
    "Floral Casual Dress",
    "Printed Casual Dress",
    "Denim Casual Dress"
  ],
  "Graphic Tees": [
    "Cartoon Graphic Tee",
    "Unicorn Graphic Tee",
    "Typography Tee",
    "Animal Graphic Tee"
  ],
  "Crop Tops": [
    "Printed Crop Top",
    "Ribbed Crop Top",
    "Graphic Crop Tee",
    "Casual Crop Top"
  ],
  "Casual Tops": [
    "Floral Casual Top",
    "Cotton Casual Top",
    "Printed Casual Top",
    "Ruffle Casual Top"
  ],
  "Onesies": [
    "Cotton Baby Onesie",
    "Printed Onesie",
    "Animal Onesie",
    "Full Sleeve Onesie"
  ],
  "Bodysuits": [
    "Cotton Bodysuit",
    "Sleeveless Bodysuit",
    "Full Sleeve Bodysuit",
    "Printed Bodysuit"
  ]
};

function getVariantRule(categoryName: string, categoryPath: string) {
    const text = (categoryName + ' ' + categoryPath).toLowerCase();
    
    // Bottomwear
    if (text.includes('jeans') || text.includes('trouser') || text.includes('chinos') || text.includes('cargo') || text.includes('shorts') || text.includes('trackpant') || text.includes('jogger')) {
        return {
            type: 'bottomwear',
            variants: [
                { size: '30', color: 'Blue' },
                { size: '32', color: 'Blue' },
                { size: '34', color: 'Blue' },
                { size: '36', color: 'Blue' }
            ]
        };
    }
    // Footwear
    if (text.includes('shoe') || text.includes('sneaker') || text.includes('loafer') || text.includes('sandal') || text.includes('slipper') || text.includes('footwear') || text.includes('boot') || text.includes('heel') || text.includes('pump') || text.includes('wedge')) {
        return {
            type: 'footwear',
            variants: [
                { size: '7', color: 'Black' },
                { size: '8', color: 'Black' },
                { size: '9', color: 'Black' },
                { size: '10', color: 'Black' }
            ]
        };
    }
    // Saree
    if (text.includes('saree')) {
        return {
            type: 'saree',
            variants: [
                { size: 'Free Size', color: 'Red' },
                { size: 'Free Size', color: 'Blue' },
                { size: 'Free Size', color: 'Green' },
                { size: 'Free Size', color: 'Maroon' }
            ]
        };
    }
    // Bags / Accessories
    if (text.includes('bag') || text.includes('wallet') || text.includes('backpack') || text.includes('clutch') || text.includes('accessory') || text.includes('belt') || text.includes('watch') || text.includes('jewellery') || text.includes('sunglass')) {
        return {
            type: 'accessories',
            variants: [
                { size: 'One Size', color: 'Black' },
                { size: 'One Size', color: 'Brown' },
                { size: 'One Size', color: 'Tan' },
                { size: 'One Size', color: 'Beige' }
            ]
        };
    }
    
    // Default Topwear / Clothing
    return {
        type: 'topwear',
        variants: [
            { size: 'S', color: 'Black' },
            { size: 'M', color: 'Black' },
            { size: 'L', color: 'Black' },
            { size: 'XL', color: 'Black' }
        ]
    };
}

function getColorHex(colorName: string) {
    const colors: Record<string, string> = {
        'red': 'e74c3c',
        'blue': '3498db',
        'green': '2ecc71',
        'maroon': '800000',
        'black': '2c3e50',
        'brown': '8b4513',
        'tan': 'd2b48c',
        'beige': 'f5f5dc',
        'white': 'ffffff',
        'grey': 'bdc3c7',
        'navy': '34495e',
    };
    return colors[colorName.toLowerCase()] || 'eeeeee';
}

export async function seedProducts(prisma: PrismaClient) {
  console.log('🛍️  Seeding exactly 4 products per Level-4 category...');

  const level4Categories = await prisma.category.findMany({
    where: { level: 4 },
    include: { parent: { include: { parent: { include: { parent: true } } } } }
  });

  if (!level4Categories || level4Categories.length === 0) {
    console.log('⚠️  No Level 4 categories found, skipping product seed.');
    return;
  }

  const shop = await prisma.shop.findFirst();
  
  let productsCreated = 0;
  let variantsCreated = 0;

  for (const category of level4Categories) {
    // Generate full path string for better matching
    let pathArr = [category.name];
    let curr = category.parent;
    while(curr) {
        pathArr.unshift(curr.name);
        curr = curr.parent;
    }
    const fullPath = pathArr.join(' → ');
    
    function getRealImage(categoryName) {
        const name = categoryName.toLowerCase();
        if (name.includes('t-shirt') || name.includes('polo')) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        if (name.includes('shirt') || name.includes('top')) return 'https://images.unsplash.com/photo-1596755094514-f87e32f6b717?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        if (name.includes('jean') || name.includes('trouser') || name.includes('pant') || name.includes('chino') || name.includes('jogger')) return 'https://images.unsplash.com/photo-1542272604-780c4050d4a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        if (name.includes('footwear') || name.includes('shoe') || name.includes('sneaker') || name.includes('sandal')) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        if (name.includes('dress') || name.includes('frock')) return 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        if (name.includes('accessory') || name.includes('bag') || name.includes('belt') || name.includes('watch') || name.includes('wallet')) return 'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        if (name.includes('ethnic') || name.includes('kurta') || name.includes('lehenga') || name.includes('choli')) return 'https://images.unsplash.com/photo-1583391733958-d25e07fac662?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        if (name.includes('saree')) return 'https://images.unsplash.com/photo-1610189013233-97746401077e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        if (name.includes('jacket') || name.includes('coat') || name.includes('blazer') || name.includes('hoodie') || name.includes('sweat') || name.includes('sweater')) return 'https://images.unsplash.com/photo-1551028719-00167b16eac5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        return 'https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    }

    // Check if we have an exact match in our parsed list
    let productNames = parsedCategoryProducts[category.name];
    
    if (!productNames || productNames.length === 0) {
        // Generate a generic name
        productNames = [`Premium ${category.name}`];
    }
    
    // Pick exactly 1 product
    productNames = productNames.slice(0, 1);
    
    const rule = getVariantRule(category.name, fullPath);

    for (let i = 0; i < productNames.length; i++) {
        const pName = productNames[i];
        const pSlug = category.slug + '-prod-' + (i+1);
        
        // Use a base price between 499 and 2999
        const basePrice = 499 + Math.floor(Math.random() * 25) * 100; 

        // Main product image with product name
        const productImageUrl = getRealImage(category.name);

        try {
            await prisma.product.upsert({
                where: { slug: pSlug },
                update: {},
                create: {
                    name: pName,
                    slug: pSlug,
                    description: `Experience the finest quality with our ${pName}. Perfect for any occasion.`,
                    brand: 'Essential',
                    productType: ProductType.VARIABLE,
                    sku: `${category.slug.toUpperCase()}-${i+1}`,
                    basePrice: basePrice,
                    sellingPrice: basePrice * 0.8, // 20% discount
                    categoryId: category.id,
                    shopId: shop?.id,
                    isFeatured: i === 0,
                    images: {
                        create: [
                            {
                                imageUrl: productImageUrl,
                                isPrimary: true,
                            }
                        ]
                    },
                    variants: {
                        create: rule.variants.map((v, vIndex) => {
                            const variantImgUrl = productImageUrl;
                            return {
                                sku: `${category.slug.toUpperCase()}-${i+1}-${vIndex}`,
                                size: v.size,
                                color: v.color,
                                price: basePrice * 0.8,
                                stockQuantity: 50,
                                imageUrl: variantImgUrl
                            };
                        })
                    }
                }
            });
        } catch (e) {
            console.error(`Failed on Product SKU: ${category.slug.toUpperCase()}-${i+1}`, e);
            throw e;
        }
        
        productsCreated++;
        variantsCreated += rule.variants.length;
    }
  }

  console.log(`   ✅ Successfully created ${productsCreated} products and ${variantsCreated} variants.`);
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
