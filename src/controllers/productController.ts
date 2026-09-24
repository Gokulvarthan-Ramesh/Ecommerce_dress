import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/ProductService';
import { ApiResponse } from '../utils/response';
import { PRODUCT_SPECIFICATION_KEYS } from '../constants';

export class ProductController {
  static async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // For customer side, default to hideEmpty if not explicitly provided
      if (req.query.hideEmpty === undefined) {
        req.query.hideEmpty = 'true';
      }
      
      const categories = await ProductService.getCategories(req.query);
      ApiResponse.success(res, categories);
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const category = await ProductService.getCategoryDetails(id);
      ApiResponse.success(res, category);
    } catch (error) {
      next(error);
    }
  }

  static async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ProductService.getProducts(req.query);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getProductDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier } = req.params;
      const result = await ProductService.getProductDetails(identifier);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getCatalogFilters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ProductService.getCatalogFilters(req.query);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getSpecificationKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      
      let keys: any = [];
      if (categoryId) {
        keys = await ProductService.getSpecificationKeys(categoryId);
      } else {
        // Fallback to all constant keys if no categoryId provided
        keys = Object.values(PRODUCT_SPECIFICATION_KEYS);
      }
      
      ApiResponse.success(res, { keys });
    } catch (error) {
      next(error);
    }
  }
}
