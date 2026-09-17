import { z } from 'zod';

export const saveCategorySchema = z.object({
  body: z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Category name is required'),
    slug: z.string().min(1, 'Category slug is required'),
    description: z.string().optional(),
    image: z.string().optional().nullable(),
    parentId: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

const variantSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  size: z.string().min(1, 'Size is required'),
  color: z.string().min(1, 'Color is required'),
  colorHex: z.string().optional().nullable(),
  priceAdjustment: z.number().optional(),
  stock: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const saveProductSchema = z.object({
  body: z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Title is required'),
    slug: z.string().min(1, 'Slug is required'),
    description: z.string().min(1, 'Description is required'),
    categoryId: z.string().min(1, 'Category ID is required'),
    basePrice: z.number().min(0, 'Base price must be positive'),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    images: z.array(z.string()).optional(),
    variants: z.array(variantSchema).optional(),
  }),
});
