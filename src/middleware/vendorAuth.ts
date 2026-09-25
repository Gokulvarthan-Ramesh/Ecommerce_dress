import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

/**
 * Decoded vendor JWT payload
 */
export interface AuthenticatedVendor {
  id: string;
  phone: string;
  type: 'VENDOR';
}

/**
 * Extend Express Request to include vendorUser
 */
declare global {
  namespace Express {
    interface Request {
      vendorUser?: AuthenticatedVendor;
    }
  }
}

/**
 * Middleware to authenticate vendor JWT tokens.
 * Completely separate from customer authenticateToken.
 * Expects JWT with { id, phone, type: 'VENDOR' }.
 */
export const authenticateVendorToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Vendor authentication token required',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;

    // Ensure this is a VENDOR token, not a customer/admin token
    if (decoded.type !== 'VENDOR') {
      res.status(401).json({
        success: false,
        message: 'Invalid token type. Please use vendor login.',
      });
      return;
    }

    req.vendorUser = {
      id: decoded.id,
      phone: decoded.phone,
      type: 'VENDOR',
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired vendor authentication token',
    });
    return;
  }
};
