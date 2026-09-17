import { prisma } from '../config/db';

export const ProductRepository = {
  ...prisma.product,
  
  // Expose variants queries through the Product repository context
  findManyVariants: prisma.productVariant.findMany,
  updateVariant: prisma.productVariant.update,
  upsertVariant: prisma.productVariant.upsert,

  // Transaction support
  getTransaction: () => prisma.$transaction,
};
