import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Access denied: Administrator privileges required',
    });
    return;
  }
  next();
};

export const requireVendor = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || (req.user.role !== 'VENDOR' && req.user.role !== 'ADMIN')) {
    res.status(403).json({
      success: false,
      message: 'Access denied: Vendor privileges required',
    });
    return;
  }
  next();
};

export const requirePermission = (featureCode: string, requireWrite: boolean = false) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Administrator privileges required' });
      return;
    }

    try {
      const access = await prisma.adminAccess.findUnique({
        where: {
          userId_featureCode: {
            userId: req.user.id,
            featureCode,
          }
        }
      });

      if (!access) {
        res.status(403).json({ success: false, message: `Access denied to feature: ${featureCode}` });
        return;
      }

      if (requireWrite && !access.canWrite) {
        res.status(403).json({ success: false, message: `Write access denied to feature: ${featureCode}` });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error checking permissions' });
    }
  };
};

