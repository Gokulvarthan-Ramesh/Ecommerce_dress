import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Allowed master entities (avoids SQL injection / invalid access)
const allowedMasters = [
  'promo-code-distribution-types',
  'promo-campaign-types',
  'promo-discount-types'
] as const;

type AllowedMaster = typeof allowedMasters[number];

// Mapping route paths to Prisma model names
const prismaModelMapping: Record<AllowedMaster, 'promoCodeDistributionType' | 'promoCampaignType' | 'promoDiscountType'> = {
  'promo-code-distribution-types': 'promoCodeDistributionType',
  'promo-campaign-types': 'promoCampaignType',
  'promo-discount-types': 'promoDiscountType'
};

export class MasterController {
  
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { masterType } = req.params;
      
      if (!allowedMasters.includes(masterType as AllowedMaster)) {
        throw new AppError('Invalid master type', 400);
      }

      const modelName = prismaModelMapping[masterType as AllowedMaster];
      // @ts-ignore - dynamic model access
      const items = await prisma[modelName].findMany({
        orderBy: { createdAt: 'asc' }
      });

      ApiResponse.success(res, items);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { masterType, id } = req.params;
      
      if (!allowedMasters.includes(masterType as AllowedMaster)) {
        throw new AppError('Invalid master type', 400);
      }

      const modelName = prismaModelMapping[masterType as AllowedMaster];
      // @ts-ignore
      const item = await prisma[modelName].findUnique({
        where: { id }
      });

      if (!item) {
        throw new AppError('Master record not found', 404);
      }

      ApiResponse.success(res, item);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { masterType } = req.params;
      const { code, name, description, isActive } = req.body;
      
      if (!allowedMasters.includes(masterType as AllowedMaster)) {
        throw new AppError('Invalid master type', 400);
      }

      if (!code || !name) {
        throw new AppError('Code and Name are required', 400);
      }

      const modelName = prismaModelMapping[masterType as AllowedMaster];
      
      // @ts-ignore
      const existing = await prisma[modelName].findUnique({
        where: { code }
      });

      if (existing) {
        throw new AppError(`Record with code ${code} already exists`, 409);
      }

      // @ts-ignore
      const item = await prisma[modelName].create({
        data: {
          code,
          name,
          description,
          isActive: isActive !== undefined ? isActive : true
        }
      });

      ApiResponse.created(res, item);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { masterType, id } = req.params;
      const { code, name, description, isActive } = req.body;
      
      if (!allowedMasters.includes(masterType as AllowedMaster)) {
        throw new AppError('Invalid master type', 400);
      }

      const modelName = prismaModelMapping[masterType as AllowedMaster];
      
      // @ts-ignore
      const existing = await prisma[modelName].findUnique({
        where: { id }
      });

      if (!existing) {
        throw new AppError('Master record not found', 404);
      }

      // @ts-ignore
      const item = await prisma[modelName].update({
        where: { id },
        data: {
          ...(code !== undefined && { code }),
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
        }
      });

      ApiResponse.success(res, item);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { masterType, id } = req.params;
      
      if (!allowedMasters.includes(masterType as AllowedMaster)) {
        throw new AppError('Invalid master type', 400);
      }

      const modelName = prismaModelMapping[masterType as AllowedMaster];
      
      // @ts-ignore
      const existing = await prisma[modelName].findUnique({
        where: { id }
      });

      if (!existing) {
        throw new AppError('Master record not found', 404);
      }

      // @ts-ignore
      await prisma[modelName].delete({
        where: { id }
      });

      ApiResponse.success(res, { message: 'Master record deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
