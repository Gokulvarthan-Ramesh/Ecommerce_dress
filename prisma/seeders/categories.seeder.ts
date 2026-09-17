import { PrismaClient } from '@prisma/client';

export async function seedCategories(prisma: PrismaClient) {
  console.log('📂 Seeding categories (Men, Women, Kids with multi-level subcategories)...');

  // ==========================================
  // 1. LEVEL 1 — ROOT / PARENT CATEGORIES
  // ==========================================
  const menCat = await prisma.category.upsert({
    where: { slug: 'men' },
    update: {},
    create: {
      name: 'Men',
      slug: 'men',
      description: "Men's premium apparel, ethnic wear, footwear and accessories",
      imageUrl: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=600&q=80',
      level: 1,
      sortOrder: 1,
    },
  });

  const womenCat = await prisma.category.upsert({
    where: { slug: 'women' },
    update: {},
    create: {
      name: 'Women',
      slug: 'women',
      description: "Women's contemporary fashion, ethnic wear and accessories",
      imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80',
      level: 1,
      sortOrder: 2,
    },
  });

  const kidsCat = await prisma.category.upsert({
    where: { slug: 'kids' },
    update: {},
    create: {
      name: 'Kids',
      slug: 'kids',
      description: 'Trendy and comfortable clothing for boys, girls and infants',
      imageUrl: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=600&q=80',
      level: 1,
      sortOrder: 3,
    },
  });

  // Helper to upsert a category at any level
  async function seedCategory(
    parentId: string | null,
    name: string,
    slug: string,
    description: string,
    level: number,
    sortOrder: number,
    imageUrl: string | null = null
  ) {
    return prisma.category.upsert({
      where: { slug },
      update: { name, description, parentId, level, sortOrder, ...(imageUrl ? { imageUrl } : {}) },
      create: { name, slug, description, parentId, level, sortOrder, imageUrl },
    });
  }

  // ==========================================
  // 2. LEVEL 2 — SUB-CATEGORIES UNDER MEN
  // ==========================================
  const menSubCategories = [
    { name: 'T-Shirts',             slug: 'men-tshirts',             description: "Men's casual, graphic, printed and polo t-shirts", imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80' },
    { name: 'Casual Shirts',        slug: 'men-casual-shirts',        description: "Men's casual, checked, printed and denim shirts", imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80' },
    { name: 'Formal Shirts',        slug: 'men-formal-shirts',        description: "Men's crisp formal and business office shirts", imageUrl: 'https://images.unsplash.com/photo-1620012253295-c15c429f66bf?auto=format&fit=crop&w=600&q=80' },
    { name: 'Jeans',                slug: 'men-jeans',                description: "Men's denim jeans — slim, skinny, regular and relaxed fit", imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=600&q=80' },
    { name: 'Trousers & Chinos',    slug: 'men-trousers-chinos',     description: "Men's formal trousers, casual chinos and khakis", imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=600&q=80' },
    { name: 'Kurtas & Ethnic Wear', slug: 'men-kurtas-ethnic',       description: "Men's ethnic kurtas, kurta pyjama sets and Nehru jackets", imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80' },
    { name: 'Jackets & Coats',      slug: 'men-jackets-coats',        description: "Men's jackets, bomber jackets, coats and windcheaters", imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80' },
    { name: 'Suits & Blazers',      slug: 'men-suits-blazers',        description: "Men's tuxedos, blazers, and formal suit sets", imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=600&q=80' },
    { name: 'Hoodies & Sweatshirts',slug: 'men-hoodies-sweatshirts',  description: "Men's fleece hoodies, pullovers and winter sweatshirts", imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80' },
    { name: 'Sweaters & Cardigans', slug: 'men-sweaters-cardigans',  description: "Men's knit sweaters, cardigans and winter wear", imageUrl: 'https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?auto=format&fit=crop&w=600&q=80' },
    { name: 'Track Pants & Joggers',slug: 'men-track-pants-joggers',  description: "Men's sweatpants, track pants, joggers and athleisure", imageUrl: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=600&q=80' },
    { name: 'Shorts & 3/4ths',      slug: 'men-shorts',               description: "Men's casual cotton shorts, cargo shorts and swim shorts", imageUrl: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=600&q=80' },
    { name: 'Activewear & Gym Wear',slug: 'men-activewear',          description: "Men's gym t-shirts, dry-fit tees, tanks and athletic wear", imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80' },
    { name: 'Innerwear & Loungewear',slug: 'men-innerwear-loungewear',description: "Men's briefs, boxers, trunks, vests and loungewear", imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80' },
    { name: 'Footwear & Shoes',     slug: 'men-footwear',             description: "Men's sneakers, formal leather shoes, loafers and sandals", imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80' },
    { name: 'Accessories',          slug: 'men-accessories',          description: "Men's leather belts, wallets, ties, watches and sunglasses", imageUrl: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=600&q=80' },
  ];

  const menSubMap: Record<string, any> = {};
  for (let i = 0; i < menSubCategories.length; i++) {
    const c = menSubCategories[i];
    menSubMap[c.slug] = await seedCategory(menCat.id, c.name, c.slug, c.description, 2, i + 1, c.imageUrl);
  }

  // ==========================================
  // 3. LEVEL 3 — SUB-CATEGORIES UNDER T-SHIRTS (Men)
  // ==========================================
  const menTshirtsCat = menSubMap['men-tshirts'];
  const tshirtsSubCategories = [
    { name: 'Polo T-Shirts',            slug: 'men-tshirts-polo',            description: 'Classic ribbed collar polo tees with button plackets' },
    { name: 'Oversized T-Shirts',       slug: 'men-tshirts-oversized',       description: 'Trendy dropped-shoulder, baggy and streetwear oversized tees' },
    { name: 'Round Neck T-Shirts',      slug: 'men-tshirts-round-neck',      description: 'Versatile crew neck everyday cotton t-shirts' },
    { name: 'V-Neck T-Shirts',          slug: 'men-tshirts-v-neck',          description: 'Slim and regular fit stylish V-neck tees' },
    { name: 'Graphic & Printed T-Shirts',slug: 'men-tshirts-graphic-printed', description: 'Typography, anime, vintage and artistic graphic print tees' },
    { name: 'Sleeveless & Tank Tops',   slug: 'men-tshirts-sleeveless-tanks',description: 'Gym stringers, muscle tanks and sleeveless summer vests' },
    { name: 'Full Sleeve T-Shirts',     slug: 'men-tshirts-full-sleeve',     description: 'Comfortable long sleeve cotton tees for all seasons' },
    { name: 'Henley T-Shirts',          slug: 'men-tshirts-henley',          description: 'Collarless buttoned neckline casual henley t-shirts' },
    { name: 'Hooded T-Shirts',          slug: 'men-tshirts-hooded',          description: 'Lightweight jersey cotton hooded tees with drawstrings' },
    { name: 'Dry-Fit Sports T-Shirts',  slug: 'men-tshirts-dry-fit',         description: 'Breathable moisture-wicking quick-dry workout t-shirts' },
  ];

  for (let i = 0; i < tshirtsSubCategories.length; i++) {
    const c = tshirtsSubCategories[i];
    await seedCategory(menTshirtsCat.id, c.name, c.slug, c.description, 3, i + 1);
  }

  // ==========================================
  // 4. LEVEL 3 — SUB-CATEGORIES UNDER CASUAL SHIRTS (Men)
  // ==========================================
  const menCasualShirtsCat = menSubMap['men-casual-shirts'];
  const casualShirtsSubCategories = [
    { name: 'Checked Shirts',   slug: 'men-shirts-checked',   description: 'Tartan, gingham and buffalo check casual shirts' },
    { name: 'Printed Shirts',   slug: 'men-shirts-printed',   description: 'Floral, abstract and geometric print casual shirts' },
    { name: 'Denim Shirts',     slug: 'men-shirts-denim',     description: 'Washed and rugged denim overshirts' },
    { name: 'Linen Shirts',     slug: 'men-shirts-linen',     description: 'Breathable pure linen and linen-blend resort shirts' },
    { name: 'Striped Shirts',   slug: 'men-shirts-striped',   description: 'Vertical striped and nautical casual shirts' },
  ];
  for (let i = 0; i < casualShirtsSubCategories.length; i++) {
    const c = casualShirtsSubCategories[i];
    await seedCategory(menCasualShirtsCat.id, c.name, c.slug, c.description, 3, i + 1);
  }

  // ==========================================
  // 5. LEVEL 3 — SUB-CATEGORIES UNDER JEANS (Men)
  // ==========================================
  const menJeansCat = menSubMap['men-jeans'];
  const jeansSubCategories = [
    { name: 'Slim Fit Jeans',         slug: 'men-jeans-slim-fit',         description: 'Modern slim fit stretch denim jeans' },
    { name: 'Skinny Fit Jeans',       slug: 'men-jeans-skinny-fit',       description: 'Snug skinny fit contemporary denim' },
    { name: 'Regular Straight Jeans', slug: 'men-jeans-regular-fit',      description: 'Classic straight leg comfortable fit denim' },
    { name: 'Relaxed & Baggy Jeans',  slug: 'men-jeans-relaxed-baggy',    description: 'Trending wide-leg, skater and relaxed baggy denim' },
    { name: 'Distressed & Ripped Jeans',slug: 'men-jeans-distressed-ripped',description: 'Edgy distressed, ripped and frayed denim jeans' },
    { name: 'Tapered Fit Jeans',      slug: 'men-jeans-tapered-fit',      description: 'Roomy thigh with tapered ankle leg fit' },
  ];
  for (let i = 0; i < jeansSubCategories.length; i++) {
    const c = jeansSubCategories[i];
    await seedCategory(menJeansCat.id, c.name, c.slug, c.description, 3, i + 1);
  }

  // ==========================================
  // 6. LEVEL 3 — SUB-CATEGORIES UNDER KURTAS (Men)
  // ==========================================
  const menKurtasCat = menSubMap['men-kurtas-ethnic'];
  const kurtasSubCategories = [
    { name: 'Short Kurtas',           slug: 'men-ethnic-short-kurtas',           description: 'Casual short kurtas paired with jeans or chinos' },
    { name: 'Long Kurtas',            slug: 'men-ethnic-long-kurtas',            description: 'Traditional knee-length ethnic cotton and silk kurtas' },
    { name: 'Kurta Pyjama Sets',      slug: 'men-ethnic-kurta-pyjama-sets',      description: 'Coordinated festive kurta and churidar sets' },
    { name: 'Nehru & Modi Jackets',   slug: 'men-ethnic-nehru-jackets',          description: 'Sleeveless ethnic jackets and bandhgalas' },
    { name: 'Festive Sherwanis',      slug: 'men-ethnic-sherwanis',              description: 'Grand royal wedding and festive sherwanis' },
  ];
  for (let i = 0; i < kurtasSubCategories.length; i++) {
    const c = kurtasSubCategories[i];
    await seedCategory(menKurtasCat.id, c.name, c.slug, c.description, 3, i + 1);
  }

  // ==========================================
  // 7. LEVEL 2 — SUB-CATEGORIES UNDER WOMEN
  // ==========================================
  const womenSubCategories = [
    { name: 'Kurtis & Kurta Sets',  slug: 'women-kurtis-sets',       description: "Women's ethnic kurtis, anarkalis and kurta palazzo sets", imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80' },
    { name: 'Sarees',               slug: 'women-sarees',             description: "Women's silk, cotton, georgette and designer sarees", imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80' },
    { name: 'Lehengas & Cholis',    slug: 'women-lehengas',           description: "Women's bridal, festive and party wear lehenga cholis", imageUrl: 'https://images.unsplash.com/photo-1583391733981-99d75bc5a932?auto=format&fit=crop&w=600&q=80' },
    { name: 'Tops & Tunics',        slug: 'women-tops-tunics',        description: "Women's western tops, shirts, tunics and floral blouses", imageUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80' },
    { name: 'Dresses & Jumpsuits',  slug: 'women-dresses-jumpsuits',  description: "Women's maxi, midi, mini party dresses and stylish jumpsuits", imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80' },
    { name: 'Jeans & Jeggings',     slug: 'women-jeans-jeggings',     description: "Women's skinny, high-waist, boyfriend jeans and jeggings", imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80' },
    { name: 'Trousers & Palazzos',  slug: 'women-trousers-palazzos',  description: "Women's culottes, straight trousers and flared palazzo pants", imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80' },
    { name: 'Jackets & Shrugs',     slug: 'women-jackets-shrugs',     description: "Women's denim jackets, blazers, coats and shrugs", imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80' },
    { name: 'Sweaters & Hoodies',   slug: 'women-sweaters-hoodies',   description: "Women's warm sweaters, cardigans and cozy sweatshirts", imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=600&q=80' },
    { name: 'Activewear & Sportswear',slug: 'women-activewear',       description: "Women's sports bras, tights, leggings and gym tees", imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80' },
    { name: 'Innerwear & Sleepwear',slug: 'women-innerwear-sleepwear',description: "Women's lingerie, bras, nightsuits, pyjamas and robes", imageUrl: 'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=600&q=80' },
    { name: 'Handbags & Footwear',  slug: 'women-handbags-footwear',  description: "Women's heels, flats, sandals, tote bags and clutches", imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80' },
  ];

  const womenSubMap: Record<string, any> = {};
  for (let i = 0; i < womenSubCategories.length; i++) {
    const c = womenSubCategories[i];
    womenSubMap[c.slug] = await seedCategory(womenCat.id, c.name, c.slug, c.description, 2, i + 1, c.imageUrl);
  }

  // ==========================================
  // 8. LEVEL 3 — SUB-CATEGORIES UNDER WOMEN TOPS & TUNICS
  // ==========================================
  const womenTopsCat = womenSubMap['women-tops-tunics'];
  const womenTopsSubCategories = [
    { name: 'T-Shirts & Graphic Tees',slug: 'women-tshirts-graphic-tees', description: "Casual, crop and oversized t-shirts for women" },
    { name: 'Crop Tops',              slug: 'women-tops-crop-tops',         description: 'Trendy fitted and relaxed crop tops' },
    { name: 'Peplum Tops',            slug: 'women-tops-peplum-tops',       description: 'Flattering flared waist peplum tops' },
    { name: 'Tunics & Long Tops',     slug: 'women-tops-tunics-long',       description: 'Comfortable knee-length tunics and kaftans' },
    { name: 'Camisoles & Tank Tops',  slug: 'women-tops-camisoles-tanks',   description: 'Spaghetti strap camis, racerbacks and ribbed tanks' },
    { name: 'Off-Shoulder Tops',      slug: 'women-tops-off-shoulder',     description: 'Bardot, cold shoulder and one-shoulder statement tops' },
  ];
  for (let i = 0; i < womenTopsSubCategories.length; i++) {
    const c = womenTopsSubCategories[i];
    await seedCategory(womenTopsCat.id, c.name, c.slug, c.description, 3, i + 1);
  }

  // ==========================================
  // 9. LEVEL 3 — SUB-CATEGORIES UNDER WOMEN KURTIS
  // ==========================================
  const womenKurtisCat = womenSubMap['women-kurtis-sets'];
  const womenKurtisSubCategories = [
    { name: 'Straight Kurtis',        slug: 'women-kurtis-straight',        description: 'Everyday office and college wear straight cut kurtis' },
    { name: 'Anarkali Kurtis',        slug: 'women-kurtis-anarkali',        description: 'Flared royal Anarkali and angrakha silhouettes' },
    { name: 'A-Line Kurtis',          slug: 'women-kurtis-a-line',          description: 'Comfortable flared A-line ethnic tunics' },
    { name: 'Kurta Palazzo Sets',     slug: 'women-kurtis-palazzo-sets',    description: 'Coordinated kurta and palazzo/pant 2-piece sets' },
    { name: 'Festive Embroidered Sets',slug: 'women-kurtis-festive',        description: 'Chikankari, zari and mirror work celebratory sets' },
  ];
  for (let i = 0; i < womenKurtisSubCategories.length; i++) {
    const c = womenKurtisSubCategories[i];
    await seedCategory(womenKurtisCat.id, c.name, c.slug, c.description, 3, i + 1);
  }

  // ==========================================
  // 10. LEVEL 3 — SUB-CATEGORIES UNDER WOMEN DRESSES
  // ==========================================
  const womenDressesCat = womenSubMap['women-dresses-jumpsuits'];
  const womenDressesSubCategories = [
    { name: 'Maxi Dresses',           slug: 'women-dresses-maxi',           description: 'Flowy full-length bohemian and evening maxi dresses' },
    { name: 'Bodycon Dresses',        slug: 'women-dresses-bodycon',        description: 'Figure-hugging partywear and clubwear bodycon dresses' },
    { name: 'A-Line & Midi Dresses',  slug: 'women-dresses-a-line-midi',    description: 'Flattering knee-length midi and skater dresses' },
    { name: 'Jumpsuits & Rompers',    slug: 'women-dresses-jumpsuits-rompers',description: 'One-piece jumpsuits, playsuits and utility rompers' },
    { name: 'Party & Cocktail Dresses',slug: 'women-dresses-party-gowns',   description: 'Sequined, satin and velvet evening party dresses' },
  ];
  for (let i = 0; i < womenDressesSubCategories.length; i++) {
    const c = womenDressesSubCategories[i];
    await seedCategory(womenDressesCat.id, c.name, c.slug, c.description, 3, i + 1);
  }

  // ==========================================
  // 11. LEVEL 2 — SUB-CATEGORIES UNDER KIDS
  // ==========================================
  const kidsSubCategories = [
    { name: 'Boys Clothing',        slug: 'kids-boys-clothing',       description: "T-shirts, shirts, jeans, shorts and sets for boys", imageUrl: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=600&q=80' },
    { name: 'Girls Clothing',       slug: 'kids-girls-clothing',      description: "Dresses, tops, skirts, leggings and ethnic wear for girls", imageUrl: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=600&q=80' },
    { name: 'Baby & Infant Wear',   slug: 'kids-infant-wear',         description: "Onesies, rompers, bibs and soft sleepsuits for babies", imageUrl: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=600&q=80' },
    { name: 'Kids Ethnic Wear',     slug: 'kids-ethnic-wear',         description: "Festive kurtas, sherwanis, lehengas and cholis for kids", imageUrl: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?auto=format&fit=crop&w=600&q=80' },
    { name: 'Kids Nightwear',       slug: 'kids-nightwear',           description: "Comfortable pyjama sets and cotton nightsuits for kids", imageUrl: 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?auto=format&fit=crop&w=600&q=80' },
    { name: 'Kids Footwear',        slug: 'kids-footwear',            description: "Kids sneakers, school shoes, sandals and booties", imageUrl: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=600&q=80' },
  ];

  const kidsSubMap: Record<string, any> = {};
  for (let i = 0; i < kidsSubCategories.length; i++) {
    const c = kidsSubCategories[i];
    kidsSubMap[c.slug] = await seedCategory(kidsCat.id, c.name, c.slug, c.description, 2, i + 1, c.imageUrl);
  }

  // ==========================================
  // 12. LEVEL 3 — SUB-CATEGORIES UNDER KIDS CLOTHING
  // ==========================================
  const kidsBoysCat = kidsSubMap['kids-boys-clothing'];
  const kidsBoysSubCategories = [
    { name: 'Boys T-Shirts & Polos',    slug: 'kids-boys-tshirts-polos',    description: 'Cotton graphic, cartoon and polo tees for boys' },
    { name: 'Boys Casual Shirts',       slug: 'kids-boys-casual-shirts',    description: 'Checked and printed casual shirts for boys' },
    { name: 'Boys Jeans & Trousers',    slug: 'kids-boys-jeans-trousers',   description: 'Elastic waist denim jeans and comfortable chinos' },
    { name: 'Boys Shorts & Trackpants', slug: 'kids-boys-shorts-trackpants',description: 'Playful shorts and soft cotton joggers for boys' },
  ];
  for (let i = 0; i < kidsBoysSubCategories.length; i++) {
    const c = kidsBoysSubCategories[i];
    await seedCategory(kidsBoysCat.id, c.name, c.slug, c.description, 3, i + 1);
  }

  const kidsGirlsCat = kidsSubMap['kids-girls-clothing'];
  const kidsGirlsSubCategories = [
    { name: 'Girls Frocks & Dresses',   slug: 'kids-girls-frocks-dresses',  description: 'Party frocks, cotton sundresses and floral dresses for girls' },
    { name: 'Girls Tops & T-Shirts',    slug: 'kids-girls-tops-tshirts',    description: 'Cute printed tops, crop tees and graphic t-shirts' },
    { name: 'Girls Skirts & Shorts',    slug: 'kids-girls-skirts-shorts',   description: 'Flared skirts, denim shorts and dungarees for girls' },
    { name: 'Girls Leggings & Jeans',   slug: 'kids-girls-leggings-jeans',  description: 'Soft stretch leggings, jeggings and denim jeans' },
  ];
  for (let i = 0; i < kidsGirlsSubCategories.length; i++) {
    const c = kidsGirlsSubCategories[i];
    await seedCategory(kidsGirlsCat.id, c.name, c.slug, c.description, 3, i + 1);
  }

  const totalLevel2 = menSubCategories.length + womenSubCategories.length + kidsSubCategories.length;
  const totalLevel3 =
    tshirtsSubCategories.length +
    casualShirtsSubCategories.length +
    jeansSubCategories.length +
    kurtasSubCategories.length +
    womenTopsSubCategories.length +
    womenKurtisSubCategories.length +
    womenDressesSubCategories.length +
    kidsBoysSubCategories.length +
    kidsGirlsSubCategories.length;

  console.log(`   ✅ Categories Seeding Complete:`);
  console.log(`      - Level 1 (Parents): 3 (Men, Women, Kids)`);
  console.log(`      - Level 2 (Sub-categories): ${totalLevel2}`);
  console.log(`      - Level 3 (Sub-sub-categories): ${totalLevel3}`);
  console.log(`        • Under T-Shirts: ${tshirtsSubCategories.length} subcategories`);
  console.log(`        • Under Casual Shirts: ${casualShirtsSubCategories.length}`);
  console.log(`        • Under Jeans: ${jeansSubCategories.length}`);
  console.log(`        • Under Kurtas & Ethnic: ${kurtasSubCategories.length}`);
  console.log(`        • Under Women Tops: ${womenTopsSubCategories.length}`);
  console.log(`        • Under Women Kurtis: ${womenKurtisSubCategories.length}`);
  console.log(`        • Under Women Dresses: ${womenDressesSubCategories.length}`);
  console.log(`        • Under Kids Boys: ${kidsBoysSubCategories.length}`);
  console.log(`        • Under Kids Girls: ${kidsGirlsSubCategories.length}\n`);

  return { menCat, womenCat, kidsCat };
}

// Allow direct execution: npx tsx prisma/seeders/categories.seeder.ts
if (require.main === module) {
  const prisma = new PrismaClient();
  seedCategories(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error seeding categories:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
