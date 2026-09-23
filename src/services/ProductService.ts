import { ProductRepository } from '../repositories/ProductRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { getPagination, formatPaginationResponse } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../config/db';

export class ProductService {
  static async getCategories(query: any = {}) {
    const {
      status,
      isActive,
      mainSlug,
      parentSlug,
      parentId,
      level,
      hasProducts,
      search,
      q,
      sort,
      sortBy,
      tree,
      format,
      grouped,
      page,
      limit,
    } = query;

    const andConditions: any[] = [];

    // 1. Status filter: 'active', 'inactive', 'all'
    if (status) {
      const s = String(status).toLowerCase();
      if (s === 'active' || s === 'true') {
        andConditions.push({ isActive: true });
      } else if (s === 'inactive' || s === 'false') {
        andConditions.push({ isActive: false });
      }
      // 'all' leaves isActive unconstrained to return both
    } else if (isActive !== undefined) {
      const a = String(isActive).toLowerCase();
      if (a === 'true') {
        andConditions.push({ isActive: true });
      } else if (a === 'false') {
        andConditions.push({ isActive: false });
      }
    } else {
      // Default: active only
      andConditions.push({ isActive: true });
    }

    // 2. Search by name, description, or slug
    const searchTerm = (search || q) as string | undefined;
    if (searchTerm) {
      andConditions.push({
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { slug: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }

    // 3. Main category slug: 'men', 'women', 'kids', 'all'
    if (mainSlug && String(mainSlug).toLowerCase() !== 'all') {
      const ms = String(mainSlug).toLowerCase();
      andConditions.push({
        OR: [
          { slug: ms },
          { parent: { slug: ms } },
        ],
      });
    }

    // 4. Parent Slug filter (e.g. parentSlug=men)
    if (parentSlug) {
      andConditions.push({ parent: { slug: String(parentSlug).toLowerCase() } });
    }

    // 5. Parent ID filter (e.g. parentId=null for root categories only)
    if (parentId !== undefined) {
      if (parentId === 'null' || parentId === 'none' || parentId === '') {
        andConditions.push({ parentId: null });
      } else {
        andConditions.push({ parentId: String(parentId) });
      }
    }

    // 6. Level filter (e.g., level=1, level=1,2, or level[]=1&level[]=2)
    if (level && level !== 'all') {
      let levelsArray: number[] = [];
      if (Array.isArray(level)) {
        levelsArray = level.map(l => parseInt(String(l), 10)).filter(l => !isNaN(l));
      } else if (typeof level === 'string' && level.includes(',')) {
        levelsArray = level.split(',').map(l => parseInt(l.trim(), 10)).filter(l => !isNaN(l));
      } else {
        const lvl = parseInt(String(level), 10);
        if (!isNaN(lvl)) levelsArray.push(lvl);
      }
      
      if (levelsArray.length > 0) {
        andConditions.push({ level: { in: levelsArray } });
      }
    }

    // 7. Has products filter (categories with or without products)
    if (hasProducts !== undefined) {
      const hp = String(hasProducts).toLowerCase();
      if (hp === 'true' || hp === '1') {
        andConditions.push({ products: { some: {} } });
      } else if (hp === 'false' || hp === '0') {
        andConditions.push({ products: { none: {} } });
      }
    }

    // 7.5. Hide empty categories (no products and no descendants with products)
    if (query.hideEmpty === 'true') {
      const allCategories = await CategoryRepository.findMany({
        where: { isActive: true },
        select: { id: true, parentId: true, _count: { select: { products: true } } }
      });
      
      const validCategoryIds = new Set<string>();
      const childrenMap = new Map<string, string[]>();
      const categoryMap = new Map(allCategories.map((c: any) => [c.id, c]));
      
      for (const c of allCategories) {
        if (c.parentId) {
          if (!childrenMap.has(c.parentId)) childrenMap.set(c.parentId, []);
          childrenMap.get(c.parentId)!.push(c.id);
        }
      }

      const checkHasProducts = (id: string): boolean => {
        const category = categoryMap.get(id);
        if (!category) return false;
        
        let hasValidChildren = false;
        const children = childrenMap.get(id) || [];
        for (const childId of children) {
          if (checkHasProducts(childId)) {
            hasValidChildren = true;
          }
        }
        
        if (category._count?.products > 0 || hasValidChildren) {
          validCategoryIds.add(id);
          return true;
        }
        return false;
      };

      const roots = allCategories.filter((c: any) => c.parentId === null);
      for (const root of roots) {
        checkHasProducts(root.id);
      }
      
      andConditions.push({ id: { in: Array.from(validCategoryIds) } });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    // 8. Sorting
    let orderBy: any = [{ sortOrder: 'asc' }, { name: 'asc' }];
    const sortVal = sort || sortBy;
    if (sortVal === 'name_asc') orderBy = { name: 'asc' };
    if (sortVal === 'name_desc') orderBy = { name: 'desc' };
    if (sortVal === 'sortOrder_desc') orderBy = [{ sortOrder: 'desc' }, { name: 'asc' }];
    if (sortVal === 'products_desc') orderBy = { products: { _count: 'desc' } };
    if (sortVal === 'newest') orderBy = { createdAt: 'desc' };
    if (sortVal === 'oldest') orderBy = { createdAt: 'asc' };

    const categories = await CategoryRepository.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy,
    });

    // Map mainSlug (root parent: 'men', 'women', 'kids') and status ('ACTIVE' | 'INACTIVE')
    let formatted = categories.map((c: any) => {
      // If level 3, parent.parent is root. If level 2, parent is root. If level 1, slug is root.
      const rootParent = c.parent?.parent || c.parent;
      const catMainSlug = rootParent ? rootParent.slug : c.slug;
      const catStatus = c.isActive ? 'ACTIVE' : 'INACTIVE';

      return {
        id: c.id,
        parentId: c.parentId,
        mainSlug: catMainSlug,
        parent: c.parent ? { id: c.parent.id, name: c.parent.name, slug: c.parent.slug } : null,
        name: c.name,
        slug: c.slug,
        description: c.description,
        level: c.level,
        imageUrl: c.imageUrl,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        status: catStatus,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        _count: c._count,
      };
    });


    // Hierarchical multi-level tree view: ?tree=true (Root -> Subcategories -> Sub-subcategories)
    if (tree === 'true' || format === 'tree') {
      const parentCategories = formatted.filter((c: any) => c.parentId === null);
      return parentCategories.map((p: any) => ({
        ...p,
        subCategories: formatted
          .filter((sub: any) => sub.parentId === p.id)
          .map((sub: any) => ({
            ...sub,
            subCategories: formatted.filter((subSub: any) => subSub.parentId === sub.id),
          })),
      }));
    }

    // Grouped by main category: ?grouped=true
    if (grouped === 'true' || format === 'grouped') {
      const groups: Record<string, any[]> = {
        all: formatted,
      };
      for (const item of formatted) {
        if (!groups[item.mainSlug]) {
          groups[item.mainSlug] = [];
        }
        groups[item.mainSlug].push(item);
      }
      return groups;
    }

    // Optional Pagination: ?page=1&limit=20
    if (page !== undefined || limit !== undefined) {
      const { pageNum, limitNum, skip } = getPagination(page, limit);
      const paginatedData = formatted.slice(skip, skip + limitNum);
      return {
        categories: paginatedData,
        pagination: formatPaginationResponse(formatted.length, pageNum, limitNum),
      };
    }

    return formatted;
  }

  static async getCategoryDetails(idOrSlug: string) {
    const category = await CategoryRepository.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
            level: true,
            parent: {
              select: { id: true, name: true, slug: true, level: true },
            },
          },
        },
        children: {
          include: {
            children: {
              include: {
                _count: { select: { products: true } },
              },
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            },
            _count: { select: { products: true } },
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    const rootParent = category.parent?.parent || category.parent;
    const mainSlug = rootParent ? rootParent.slug : category.slug;
    const status = category.isActive ? 'ACTIVE' : 'INACTIVE';

    // Compute navigation breadcrumbs: Root > Subcategory > Child
    const breadcrumbs: { id: string; name: string; slug: string; level: number }[] = [];
    if (category.parent?.parent) {
      breadcrumbs.push({
        id: category.parent.parent.id,
        name: category.parent.parent.name,
        slug: category.parent.parent.slug,
        level: category.parent.parent.level,
      });
    }
    if (category.parent) {
      breadcrumbs.push({
        id: category.parent.id,
        name: category.parent.name,
        slug: category.parent.slug,
        level: category.parent.level,
      });
    }
    breadcrumbs.push({
      id: category.id,
      name: category.name,
      slug: category.slug,
      level: category.level,
    });

    return {
      id: category.id,
      parentId: category.parentId,
      mainSlug,
      parent: category.parent
        ? {
            id: category.parent.id,
            name: category.parent.name,
            slug: category.parent.slug,
            level: category.parent.level,
          }
        : null,
      breadcrumbs,
      name: category.name,
      slug: category.slug,
      description: category.description,
      level: category.level,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      status,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      _count: category._count,
      subCategories: category.children.map((sub: any) => ({
        id: sub.id,
        parentId: sub.parentId,
        mainSlug,
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        level: sub.level,
        imageUrl: sub.imageUrl,
        sortOrder: sub.sortOrder,
        isActive: sub.isActive,
        status: sub.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        _count: sub._count,
        subCategories: sub.children ? sub.children.map((subSub: any) => ({
          id: subSub.id,
          parentId: subSub.parentId,
          mainSlug,
          name: subSub.name,
          slug: subSub.slug,
          description: subSub.description,
          level: subSub.level,
          imageUrl: subSub.imageUrl,
          sortOrder: subSub.sortOrder,
          isActive: subSub.isActive,
          status: subSub.isActive ? 'ACTIVE' : 'INACTIVE',
          createdAt: subSub.createdAt,
          updatedAt: subSub.updatedAt,
          _count: subSub._count,
        })) : [],
      })),
    };
  }

  static async getProducts(query: any) {
    const {
      category,
      mainSlug,
      search,
      brand,
      fabric,
      fit,
      sleeve,
      pattern,
      minPrice,
      maxPrice,
      size,
      color,
      inStock,
      isFeatured,
      sort,
      page,
      limit,
    } = query;

    const { pageNum, limitNum, skip } = getPagination(page, limit);

    const andConditions: any[] = [{ isActive: true }];

    // 1. Category / Department filter (3-level hierarchy matching)
    const targetCategory = category || (mainSlug && mainSlug.toLowerCase() !== 'all' ? mainSlug : null);
    if (targetCategory) {
      const catSlug = String(targetCategory).toLowerCase();
      andConditions.push({
        category: {
          OR: [
            { slug: catSlug },
            { parent: { slug: catSlug } },
            { parent: { parent: { slug: catSlug } } },
          ],
        },
      });
    }

    // 2. Keyword Search
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { brand: { contains: search as string, mode: 'insensitive' } },
        ],
      });
    }

    // 3. Brand filter (supports single or comma-separated: 'Nike,Puma')
    if (brand) {
      const brands = String(brand).split(',').map((b) => b.trim()).filter(Boolean);
      if (brands.length === 1) {
        andConditions.push({ brand: { equals: brands[0], mode: 'insensitive' } });
      } else if (brands.length > 1) {
        andConditions.push({ brand: { in: brands, mode: 'insensitive' } });
      }
    }

    // 4. Fabric filter
    if (fabric) {
      const fabrics = String(fabric).split(',').map((f) => f.trim()).filter(Boolean);
      andConditions.push({ fabric: { in: fabrics, mode: 'insensitive' } });
    }

    // 5. Fit filter (e.g. Slim, Regular, Relaxed)
    if (fit) {
      const fits = String(fit).split(',').map((f) => f.trim()).filter(Boolean);
      andConditions.push({ fit: { in: fits, mode: 'insensitive' } });
    }

    // 6. Sleeve filter
    if (sleeve) {
      const sleeves = String(sleeve).split(',').map((s) => s.trim()).filter(Boolean);
      andConditions.push({ sleeve: { in: sleeves, mode: 'insensitive' } });
    }

    // 7. Pattern filter
    if (pattern) {
      const patterns = String(pattern).split(',').map((p) => p.trim()).filter(Boolean);
      andConditions.push({ pattern: { in: patterns, mode: 'insensitive' } });
    }

    // 8. Featured filter
    if (isFeatured !== undefined) {
      andConditions.push({ isFeatured: String(isFeatured).toLowerCase() === 'true' });
    }

    // 9. Price range
    if (minPrice || maxPrice) {
      const priceFilter: any = {};
      if (minPrice) priceFilter.gte = parseFloat(minPrice as string);
      if (maxPrice) priceFilter.lte = parseFloat(maxPrice as string);
      andConditions.push({ sellingPrice: priceFilter });
    }

    // 10. Variant Filters (Size, Color, In-Stock)
    const variantWhere: any = { isActive: true };

    if (inStock !== undefined && String(inStock).toLowerCase() === 'true') {
      variantWhere.stockQuantity = { gt: 0 };
    }

    if (size) {
      const sizes = String(size).split(',').map((s) => s.trim()).filter(Boolean);
      variantWhere.size = { in: sizes, mode: 'insensitive' };
    }

    if (color) {
      const colors = String(color).split(',').map((c) => c.trim()).filter(Boolean);
      variantWhere.color = { in: colors, mode: 'insensitive' };
    }

    if (size || color || inStock !== undefined) {
      andConditions.push({ variants: { some: variantWhere } });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    // 11. Sorting
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { sellingPrice: 'asc' };
    if (sort === 'price_desc') orderBy = { sellingPrice: 'desc' };
    if (sort === 'name_asc') orderBy = { name: 'asc' };
    if (sort === 'name_desc') orderBy = { name: 'desc' };
    if (sort === 'newest') orderBy = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };

    const [products, total] = await Promise.all([
      ProductRepository.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              parent: { select: { id: true, name: true, slug: true } },
            },
          },

          variants: {
            where: { isActive: true },
            select: {
              id: true,
              sku: true,
              size: true,
              color: true,
              colorHex: true,
              price: true,
              stockQuantity: true,
              imageUrl: true,
              images: true,
              specifications: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      ProductRepository.count({ where }),
    ]);

    return {
      products,
      pagination: formatPaginationResponse(total, pageNum, limitNum),
    };
  }

  static async getProductDetails(identifier: string) {
    const product = await ProductRepository.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
        isActive: true,
      },
      include: {
        category: true,

        variants: {
          where: { isActive: true },
          orderBy: [{ color: 'asc' }, { size: 'asc' }],
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found or currently unavailable', 404);
    }

    const availableColors = Array.from(
      new Set(product.variants.map((v) => JSON.stringify({ color: v.color, hex: v.colorHex })))
    ).map((item) => JSON.parse(item));

    const availableSizes = Array.from(new Set(product.variants.map((v) => v.size)));

    return {
      ...product,
      availableColors,
      availableSizes,
    };
  }

  static async getCatalogFilters(query: any = {}) {
    const { mainSlug, category } = query;
    const targetDept = (mainSlug || category) as string | undefined;

    // Filter scope by category/department
    const productWhere: any = { isActive: true };
    if (targetDept && targetDept.toLowerCase() !== 'all') {
      const td = targetDept.toLowerCase();
      productWhere.category = {
        OR: [
          { slug: td },
          { parent: { slug: td } },
          { parent: { parent: { slug: td } } },
        ],
      };
    }

    // Fetch all catalog data concurrently for maximum performance
    const [
      allCategories,
      activeProducts,
      variants,
      priceStats,
    ] = await Promise.all([
      // 1. All categories with product counts
      CategoryRepository.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          level: true,
          parentId: true,
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
              parent: { select: { id: true, name: true, slug: true } },
            },
          },
          _count: { select: { products: true } },
        },
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      }),

      // 2. Active products in scope for attribute counts
      ProductRepository.findMany({
        where: productWhere,
        select: {
          id: true,
          brand: true,
          fabric: true,
          fit: true,
          sleeve: true,
          pattern: true,
          sellingPrice: true,
          category: {
            select: {
              id: true,
              slug: true,
              parent: {
                select: {
                  slug: true,
                  parent: { select: { slug: true } },
                },
              },
            },
          },
        },
      }),

      // 3. Active variants in scope with stock
      ProductRepository.findManyVariants({
        where: {
          isActive: true,
          stockQuantity: { gt: 0 },
          product: productWhere,
        },
        select: { size: true, color: true, colorHex: true, stockQuantity: true },
      }),

      // 4. Price min / max
      prisma.product.aggregate({
        where: productWhere,
        _min: { sellingPrice: true },
        _max: { sellingPrice: true },
        _avg: { sellingPrice: true },
      }),
    ]);

    // Format categories with mainSlug and product count
    const formattedCategories = allCategories.map((c) => {
      const rootParent = c.parent?.parent || c.parent;
      const catMainSlug = rootParent ? rootParent.slug : c.slug;

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        mainSlug: catMainSlug,
        level: c.level,
        parentId: c.parentId,
        parent: c.parent ? { name: c.parent.name, slug: c.parent.slug } : null,
        productCount: c._count.products,
      };
    });

    // If scoped to a department, filter category list
    let visibleCategories = formattedCategories;
    if (targetDept && targetDept.toLowerCase() !== 'all') {
      const td = targetDept.toLowerCase();
      visibleCategories = formattedCategories.filter((c) => c.mainSlug === td);
    }

    // 3-Level Category Tree with product counts
    const rootCategories = (targetDept && targetDept.toLowerCase() !== 'all'
      ? formattedCategories.filter((c) => c.slug === targetDept.toLowerCase() && c.parentId === null)
      : formattedCategories.filter((c) => c.parentId === null)
    ).map((root) => ({
      name: root.name,
      slug: root.slug,
      productCount: root.productCount,
      subCategories: formattedCategories
        .filter((sub) => sub.parentId === root.id)
        .map((sub) => ({
          name: sub.name,
          slug: sub.slug,
          productCount: sub.productCount,
          subCategories: formattedCategories
            .filter((subSub) => subSub.parentId === sub.id)
            .map((subSub) => ({
              name: subSub.name,
              slug: subSub.slug,
              productCount: subSub.productCount,
            })),
        })),
    }));

    // Helper to count frequencies
    function countBy<T>(arr: T[], keyFn: (item: T) => string | null | undefined) {
      const map: Record<string, number> = {};
      for (const item of arr) {
        const key = keyFn(item);
        if (key) map[key] = (map[key] || 0) + 1;
      }
      return Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }

    // Attribute Counts
    const brands = countBy(activeProducts, (p) => p.brand);
    const fabrics = countBy(activeProducts, (p) => p.fabric);
    const fits = countBy(activeProducts, (p) => p.fit);
    const sleeves = countBy(activeProducts, (p) => p.sleeve);
    const patterns = countBy(activeProducts, (p) => p.pattern);

    // Size counts
    const sizeMap: Record<string, number> = {};
    for (const v of variants) {
      if (v.size) sizeMap[v.size] = (sizeMap[v.size] || 0) + 1;
    }
    const sizes = Object.entries(sizeMap).map(([size, count]) => ({ size, count }));

    // Color counts with hex
    const colorMap: Record<string, { count: number; hex: string }> = {};
    for (const v of variants) {
      if (v.color) {
        if (!colorMap[v.color]) {
          colorMap[v.color] = { count: 0, hex: v.colorHex || '#000000' };
        }
        colorMap[v.color].count += 1;
      }
    }
    const colors = Object.entries(colorMap).map(([color, info]) => ({
      color,
      hex: info.hex,
      count: info.count,
    }));

    // Departments summary with product counts
    const departments = ['men', 'women', 'kids'].map((slug) => {
      const deptName = slug.charAt(0).toUpperCase() + slug.slice(1);
      const count = activeProducts.filter((p) => {
        const root = p.category.parent?.parent?.slug || p.category.parent?.slug || p.category.slug;
        return root === slug;
      }).length;
      return { name: deptName, slug, count };
    });

    // Price Statistics & Buckets
    const minPrice = priceStats._min.sellingPrice ? Number(priceStats._min.sellingPrice) : 0;
    const maxPrice = priceStats._max.sellingPrice ? Number(priceStats._max.sellingPrice) : 0;
    const avgPrice = priceStats._avg.sellingPrice ? Math.round(Number(priceStats._avg.sellingPrice)) : 0;

    const priceBuckets = [
      {
        label: 'Under ₹500',
        min: 0,
        max: 500,
        count: activeProducts.filter((p) => Number(p.sellingPrice) < 500).length,
      },
      {
        label: '₹500 to ₹1,000',
        min: 500,
        max: 1000,
        count: activeProducts.filter((p) => Number(p.sellingPrice) >= 500 && Number(p.sellingPrice) <= 1000).length,
      },
      {
        label: '₹1,000 to ₹1,500',
        min: 1000,
        max: 1500,
        count: activeProducts.filter((p) => Number(p.sellingPrice) > 1000 && Number(p.sellingPrice) <= 1500).length,
      },
      {
        label: 'Above ₹1,500',
        min: 1500,
        max: null,
        count: activeProducts.filter((p) => Number(p.sellingPrice) > 1500).length,
      },
    ].filter((b) => b.count > 0);

    // Available Sort Options for client UI
    const sortOptions = [
      { label: 'Recommended / Newest', value: 'newest' },
      { label: 'Price: Low to High', value: 'price_asc' },
      { label: 'Price: High to Low', value: 'price_desc' },
      { label: 'Name: A to Z', value: 'name_asc' },
      { label: 'Name: Z to A', value: 'name_desc' },
    ];

    return {
      totalProducts: activeProducts.length,
      departments,
      categories: visibleCategories,
      categoryTree: rootCategories,
      brands,
      sizes,
      colors,
      fabrics,
      fits,
      sleeves,
      patterns,
      price: {
        min: minPrice,
        max: maxPrice,
        avg: avgPrice,
      },
      priceBuckets,
      sortOptions,
    };
  }
}
