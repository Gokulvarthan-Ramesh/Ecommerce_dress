import { PrismaClient } from '@prisma/client';
import { getDriveImageUrl } from '../../src/utils/googleDrive';

export const TAXONOMY = {
  "Men": {
    "T-Shirts": {
      "Casual T-Shirts": [
        "Round Neck T-Shirts",
        "V-Neck T-Shirts",
        "Henley T-Shirts",
        "Full Sleeve T-Shirts"
      ],
      "Polo T-Shirts": [
        "Regular Polo",
        "Slim Fit Polo",
        "Printed Polo",
        "Full Sleeve Polo"
      ],
      "Oversized T-Shirts": [
        "Plain Oversized",
        "Graphic Oversized",
        "Printed Oversized"
      ],
      "Graphic & Printed T-Shirts": [
        "Typography",
        "Anime & Character",
        "Vintage Prints",
        "Artistic Prints"
      ],
      "Sports T-Shirts": [
        "Dry Fit",
        "Running T-Shirts",
        "Gym T-Shirts",
        "Training T-Shirts"
      ]
    },
    "Shirts": {
      "Casual Shirts": [
        "Checked Shirts",
        "Printed Shirts",
        "Striped Shirts",
        "Solid Shirts"
      ],
      "Formal Shirts": [
        "Solid Formal",
        "Striped Formal",
        "Slim Fit Formal",
        "Regular Fit Formal"
      ],
      "Denim Shirts": [
        "Light Wash",
        "Dark Wash",
        "Overshirt"
      ],
      "Linen Shirts": [
        "Solid Linen",
        "Printed Linen",
        "Casual Linen"
      ]
    },
    "Jeans": {
      "Slim Fit": [
        "Light Wash",
        "Mid Wash",
        "Dark Wash"
      ],
      "Skinny Fit": [
        "Stretch",
        "Distressed",
        "Solid"
      ],
      "Regular Fit": [
        "Light Wash",
        "Mid Wash",
        "Dark Wash"
      ],
      "Relaxed & Baggy": [
        "Relaxed Fit",
        "Baggy Fit",
        "Wide Leg"
      ],
      "Distressed Jeans": [
        "Ripped",
        "Heavy Distressed",
        "Light Distressed"
      ]
    },
    "Trousers & Chinos": {
      "Formal Trousers": [
        "Slim Fit",
        "Regular Fit",
        "Pleated"
      ],
      "Chinos": [
        "Slim Fit",
        "Regular Fit",
        "Stretch Chinos"
      ],
      "Cargo Pants": [
        "Regular Cargo",
        "Relaxed Cargo",
        "Jogger Cargo"
      ]
    },
    "Ethnic Wear": {
      "Kurtas": [
        "Short Kurtas",
        "Long Kurtas",
        "Printed Kurtas"
      ],
      "Kurta Sets": [
        "Kurta Pyjama",
        "Kurta Churidar",
        "Kurta Dhoti"
      ],
      "Wedding Wear": [
        "Sherwani",
        "Nehru Jacket",
        "Indo-Western"
      ]
    },
    "Jackets & Coats": {
      "Casual Jackets": [
        "Denim Jackets",
        "Bomber Jackets",
        "Biker Jackets"
      ],
      "Winter Jackets": [
        "Puffer Jackets",
        "Parkas",
        "Quilted Jackets"
      ],
      "Coats": [
        "Long Coats",
        "Overcoats"
      ]
    },
    "Suits & Blazers": {
      "Blazers": [
        "Single Breasted",
        "Double Breasted",
        "Casual Blazers"
      ],
      "Suits": [
        "Two Piece",
        "Three Piece",
        "Tuxedo"
      ]
    },
    "Hoodies & Sweatshirts": {
      "Hoodies": [
        "Pullover",
        "Zip Up",
        "Oversized"
      ],
      "Sweatshirts": [
        "Crew Neck",
        "Oversized",
        "Printed"
      ]
    },
    "Activewear": {
      "Gym Wear": [
        "Gym T-Shirts",
        "Tank Tops",
        "Training Shorts"
      ],
      "Running Wear": [
        "Running T-Shirts",
        "Running Shorts",
        "Track Pants"
      ],
      "Sportswear": [
        "Jerseys",
        "Training Wear"
      ]
    },
    "Innerwear & Loungewear": {
      "Innerwear": [
        "Briefs",
        "Boxers",
        "Vests"
      ],
      "Loungewear": [
        "Lounge Sets",
        "Pyjamas",
        "Shorts"
      ]
    },
    "Footwear": {
      "Casual Shoes": [
        "Sneakers",
        "Loafers",
        "Canvas Shoes"
      ],
      "Formal Shoes": [
        "Oxford",
        "Derby",
        "Monk Strap"
      ],
      "Sandals & Slippers": [
        "Sandals",
        "Slippers"
      ]
    },
    "Accessories": {
      "Bags": [
        "Wallets",
        "Backpacks",
        "Sling Bags"
      ],
      "Belts": [
        "Leather Belts",
        "Casual Belts"
      ],
      "Watches & Sunglasses": [
        "Watches",
        "Sunglasses"
      ]
    }
  },
  "Women": {
    "Kurtis & Kurta Sets": {
      "Kurtis": [
        "Straight Kurtis",
        "A-Line Kurtis",
        "Anarkali Kurtis"
      ],
      "Kurta Sets": [
        "Kurta Palazzo Sets",
        "Kurta Pant Sets",
        "Kurta Skirt Sets"
      ],
      "Festive Sets": [
        "Embroidered Sets",
        "Chikankari Sets",
        "Mirror Work Sets"
      ]
    },
    "Sarees": {
      "Silk Sarees": [
        "Banarasi",
        "Kanchipuram",
        "Soft Silk"
      ],
      "Cotton Sarees": [
        "Handloom",
        "Printed",
        "Linen Cotton"
      ],
      "Designer Sarees": [
        "Georgette",
        "Organza",
        "Net Sarees"
      ]
    },
    "Lehengas & Cholis": {
      "Bridal Lehengas": [
        "Heavy Bridal",
        "Designer Bridal"
      ],
      "Party Lehengas": [
        "Sequined",
        "Embroidered",
        "Printed"
      ],
      "Lehenga Sets": [
        "Lehenga Choli",
        "Crop Top Lehenga"
      ]
    },
    "Tops & Tunics": {
      "Tops": [
        "Crop Tops",
        "Peplum Tops",
        "Off-Shoulder Tops"
      ],
      "T-Shirts": [
        "Graphic Tees",
        "Oversized Tees",
        "Crop Tees"
      ],
      "Tunics": [
        "Long Tunics",
        "Casual Tunics"
      ]
    },
    "Dresses & Jumpsuits": {
      "Casual Dresses": [
        "Maxi Dresses",
        "Midi Dresses",
        "A-Line Dresses"
      ],
      "Party Dresses": [
        "Bodycon",
        "Cocktail",
        "Sequin Dresses"
      ],
      "Jumpsuits & Rompers": [
        "Jumpsuits",
        "Rompers"
      ]
    },
    "Jeans & Jeggings": {
      "Skinny Jeans": [
        "High Waist",
        "Mid Rise"
      ],
      "Straight Jeans": [
        "Regular",
        "High Waist"
      ],
      "Wide & Baggy Jeans": [
        "Wide Leg",
        "Baggy",
        "Boyfriend"
      ]
    },
    "Trousers & Palazzos": {
      "Trousers": [
        "Straight Fit",
        "Wide Leg",
        "Formal"
      ],
      "Palazzos": [
        "Solid",
        "Printed"
      ],
      "Culottes": [
        "Casual",
        "Formal"
      ]
    },
    "Jackets & Shrugs": {
      "Jackets": [
        "Denim",
        "Bomber",
        "Leather"
      ],
      "Blazers": [
        "Formal",
        "Casual"
      ],
      "Shrugs": [
        "Long Shrugs",
        "Short Shrugs"
      ]
    },
    "Sweaters & Hoodies": {
      "Sweaters": [
        "Crew Neck",
        "V-Neck",
        "Cardigans"
      ],
      "Hoodies": [
        "Pullover",
        "Zip Up",
        "Oversized"
      ]
    },
    "Activewear": {
      "Gym Wear": [
        "Sports Bras",
        "Gym Tops",
        "Gym Leggings"
      ],
      "Yoga Wear": [
        "Yoga Tops",
        "Yoga Pants"
      ],
      "Running Wear": [
        "Running Tops",
        "Running Bottoms"
      ]
    },
    "Innerwear & Sleepwear": {
      "Innerwear": [
        "Bras",
        "Panties",
        "Shapewear"
      ],
      "Sleepwear": [
        "Night Suits",
        "Pyjamas",
        "Robes"
      ]
    },
    "Handbags & Footwear": {
      "Handbags": [
        "Tote Bags",
        "Sling Bags",
        "Clutches"
      ],
      "Casual Footwear": [
        "Sneakers",
        "Flats",
        "Sandals"
      ],
      "Formal Footwear": [
        "Heels",
        "Pumps",
        "Wedges"
      ]
    },
    "Accessories": {
      "Jewellery": [
        "Earrings",
        "Necklaces",
        "Bracelets"
      ],
      "Watches": [
        "Analog",
        "Smart Watches"
      ],
      "Fashion Accessories": [
        "Sunglasses",
        "Belts",
        "Scarves"
      ]
    }
  },
  "Kids": {
    "Boys": {
      "T-Shirts & Polos": [
        "Graphic T-Shirts",
        "Polo T-Shirts",
        "Printed T-Shirts"
      ],
      "Shirts": [
        "Casual Shirts",
        "Checked Shirts",
        "Printed Shirts"
      ],
      "Jeans & Trousers": [
        "Jeans",
        "Trousers",
        "Cargo Pants"
      ],
      "Shorts & Trackpants": [
        "Shorts",
        "Trackpants",
        "Joggers"
      ],
      "Ethnic Wear": [
        "Kurtas",
        "Kurta Sets",
        "Sherwanis"
      ]
    },
    "Girls": {
      "Frocks & Dresses": [
        "Party Frocks",
        "Casual Dresses",
        "Maxi Dresses"
      ],
      "Tops & T-Shirts": [
        "Graphic Tees",
        "Crop Tops",
        "Casual Tops"
      ],
      "Skirts & Shorts": [
        "Skirts",
        "Shorts",
        "Dungarees"
      ],
      "Leggings & Jeans": [
        "Leggings",
        "Jeggings",
        "Jeans"
      ],
      "Ethnic Wear": [
        "Lehengas",
        "Kurtis",
        "Ethnic Sets"
      ]
    },
    "Baby & Infant Wear": {
      "Baby Clothing": [
        "Onesies",
        "Rompers",
        "Bodysuits"
      ],
      "Baby Sleepwear": [
        "Sleepsuits",
        "Pyjama Sets"
      ],
      "Baby Essentials": [
        "Bibs",
        "Mittens",
        "Caps"
      ]
    },
    "Nightwear": {
      "Boys Nightwear": [
        "Pyjama Sets",
        "Night Suits"
      ],
      "Girls Nightwear": [
        "Night Suits",
        "Pyjama Sets"
      ],
      "Unisex Nightwear": [
        "Sleep Sets",
        "Lounge Sets"
      ]
    },
    "Footwear": {
      "Boys Footwear": [
        "Sneakers",
        "School Shoes",
        "Sandals"
      ],
      "Girls Footwear": [
        "Flats",
        "Sandals",
        "Sneakers"
      ],
      "Baby Footwear": [
        "Booties",
        "Prewalker Shoes"
      ]
    },
    "Accessories": {
      "Bags": [
        "School Bags",
        "Backpacks",
        "Sling Bags"
      ],
      "Headwear": [
        "Caps",
        "Hats"
      ],
      "Fashion Accessories": [
        "Sunglasses",
        "Belts",
        "Hair Accessories"
      ]
    }
  }
};

function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function seedCategories(prisma: PrismaClient) {
  console.log('📂 Seeding categories from compact taxonomy...');

  let stats = { level1: 0, level2: 0, level3: 0, level4: 0 };

  async function processNode(name: string, parentSlug: string | null, parentId: string | null, level: number, sortOrder: number, children: any) {
    const slug = parentSlug ? `${parentSlug}-${slugify(name)}` : slugify(name);
    let description = `${name}`;
    let imageUrl = null;

    if (level === 1) {
        if (name === 'Men') {
            description = "Men's premium apparel, ethnic wear, footwear and accessories";
            imageUrl = getDriveImageUrl('1s4LJPtR6uOUYoqfyJZMt9VMWT6dr9uq5');
        } else if (name === 'Women') {
            description = "Women's contemporary fashion, ethnic wear and accessories";
            imageUrl = getDriveImageUrl('1NqDoIk5gBcz8o6s8RxztmZ8WyeLdEBnK');
        } else if (name === 'Kids') {
            description = 'Trendy and comfortable clothing for boys, girls and infants';
            imageUrl = 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=600&q=80';
        }
    } else if (level === 2 && name === 'Boys') {
        imageUrl = getDriveImageUrl('1r-UZgO_-WiV2L3T6lI3Gx2ozLhA3FVsz');
        description = 'Trendy and comfortable clothing for boys';
    } else if (level === 2 && name === 'Girls') {
        imageUrl = getDriveImageUrl('1w1tJcMTfXV9OKxR5LklqOQH6MD4KNGLT');
        description = 'Dresses, tops, skirts, leggings and ethnic wear for girls';
    }

    const isActive = slug.startsWith('men');

    const category = await prisma.category.upsert({
      where: { slug },
      update: { name, description, parentId, level, sortOrder, isActive, ...(imageUrl ? { imageUrl } : {}) },
      create: { name, slug, description, parentId, level, sortOrder, isActive, imageUrl },
    });

    if (level === 1) stats.level1++;
    else if (level === 2) stats.level2++;
    else if (level === 3) stats.level3++;
    else if (level === 4) stats.level4++;

    if (Array.isArray(children)) {
        for (let i = 0; i < children.length; i++) {
            await processNode(children[i], slug, category.id, level + 1, i + 1, null);
        }
    } else if (typeof children === 'object' && children !== null) {
        let i = 1;
        for (const [childName, childValue] of Object.entries(children)) {
            await processNode(childName, slug, category.id, level + 1, i++, childValue);
        }
    }
  }

  let i = 1;
  for (const [topName, subCategories] of Object.entries(TAXONOMY)) {
      await processNode(topName, null, null, 1, i++, subCategories);
  }
  console.log(`   ✅ Categories Seeding Complete:`);
}
if (require.main === module) {
  const prisma = new PrismaClient();
  seedCategories(prisma)
    .then(async () => { await prisma.$disconnect(); })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
}
