import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../utils/response';

export class AddressController {
  /**
   * Get all saved addresses for authenticated customer
   */
  static async getAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const addresses = await prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      ApiResponse.success(res, addresses);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single address by ID
   */
  static async getAddressById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const address = await prisma.address.findFirst({
        where: { id, userId },
      });

      if (!address) {
        throw new AppError('Address not found', 404);
      }

      ApiResponse.success(res, address);
    } catch (error) {
      next(error);
    }
  }


  /**
   * Add a new delivery address
   */
  static async createAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const {
        name,
        phone,
        addressLine1,
        addressLine2,
        city,
        district,
        state,
        pincode,
        country = 'India',
        isDefault = false,
      } = req.body;

      if (!name || !phone || !addressLine1 || !city || !state || !pincode) {
        throw new AppError('name, phone, addressLine1, city, state, and pincode are required', 400);
      }

      // If marked default, unset default on other addresses
      if (isDefault) {
        await prisma.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // If user has no addresses yet, make this one default
      const existingCount = await prisma.address.count({ where: { userId } });
      const makeDefault = isDefault || existingCount === 0;

      const address = await prisma.address.create({
        data: {
          userId,
          name: name.trim(),
          phone: phone.trim(),
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2 ? addressLine2.trim() : null,
          city: city.trim(),
          district: district ? district.trim() : city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          country: country.trim(),
          isDefault: makeDefault,
        },
      });

      ApiResponse.success(res, address, 'Address saved successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing delivery address
   */
  static async updateAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const {
        name,
        phone,
        addressLine1,
        addressLine2,
        city,
        district,
        state,
        pincode,
        country,
        isDefault,
      } = req.body;

      const existing = await prisma.address.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new AppError('Address not found', 404);
      }

      if (isDefault) {
        await prisma.address.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const updated = await prisma.address.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(phone !== undefined && { phone: phone.trim() }),
          ...(addressLine1 !== undefined && { addressLine1: addressLine1.trim() }),
          ...(addressLine2 !== undefined && { addressLine2: addressLine2 ? addressLine2.trim() : null }),
          ...(city !== undefined && { city: city.trim() }),
          ...(district !== undefined && { district: district ? district.trim() : city.trim() }),
          ...(state !== undefined && { state: state.trim() }),
          ...(pincode !== undefined && { pincode: pincode.trim() }),
          ...(country !== undefined && { country: country.trim() }),
          ...(isDefault !== undefined && { isDefault }),
        },
      });

      ApiResponse.success(res, updated, 'Address updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set address as default
   */
  static async setDefaultAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const existing = await prisma.address.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new AppError('Address not found', 404);
      }

      await prisma.$transaction([
        prisma.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        }),
        prisma.address.update({
          where: { id },
          data: { isDefault: true },
        }),
      ]);

      ApiResponse.success(res, null, 'Address set as default delivery address');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete address
   */
  static async deleteAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const existing = await prisma.address.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new AppError('Address not found', 404);
      }

      await prisma.address.delete({ where: { id } });

      // If deleted address was default, make the most recent one default
      if (existing.isDefault) {
        const remaining = await prisma.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (remaining) {
          await prisma.address.update({
            where: { id: remaining.id },
            data: { isDefault: true },
          });
        }
      }

      ApiResponse.success(res, null, 'Address deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
