import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ENV } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../config/db';
import { WhatsAppService } from './whatsappService';
import { cleanIndianPhoneNumber } from '../utils/phone';

export class VendorAuthService {
  // ==========================================
  // 1. SEND OTP (for registration or login)
  // ==========================================

  /**
   * Send OTP to vendor phone for registration
   * Checks that no VendorUser exists with this phone
   */
  static async sendRegisterOtp(phone: string) {
    const cleanPhone = cleanIndianPhoneNumber(phone);

    // Check if vendor already registered
    const existing = await prisma.vendorUser.findUnique({
      where: { phone: cleanPhone },
    });

    if (existing) {
      throw new AppError(
        'Vendor with this phone number already exists. Please login instead.',
        400
      );
    }

    return this._generateAndSendOtp(cleanPhone);
  }

  /**
   * Send OTP to vendor phone for login
   * Checks that VendorUser exists
   */
  static async sendLoginOtp(phone: string) {
    const cleanPhone = cleanIndianPhoneNumber(phone);

    const vendor = await prisma.vendorUser.findUnique({
      where: { phone: cleanPhone },
    });

    if (!vendor) {
      throw new AppError('Vendor not registered. Please register first.', 404);
    }

    if (!vendor.isActive) {
      throw new AppError('Your vendor account has been deactivated. Please contact support.', 403);
    }

    return this._generateAndSendOtp(cleanPhone);
  }

  /**
   * Resend OTP (rate-limited to 60s)
   */
  static async resendOtp(phone: string) {
    const cleanPhone = cleanIndianPhoneNumber(phone);
    return this._generateAndSendOtp(cleanPhone);
  }

  // ==========================================
  // 2. REGISTER VENDOR
  // ==========================================

  /**
   * Register a new VendorUser with OTP verification
   */
  static async register(data: {
    phone: string;
    otp: string;
    name: string;
    email?: string;
  }) {
    const cleanPhone = cleanIndianPhoneNumber(data.phone);

    // 1. Validate OTP
    await this._verifyOtp(cleanPhone, data.otp);

    // 2. Check if vendor already exists
    const existing = await prisma.vendorUser.findUnique({
      where: { phone: cleanPhone },
    });

    if (existing) {
      throw new AppError('Vendor with this phone number already exists.', 400);
    }

    // 3. Check email uniqueness
    if (data.email) {
      const emailExists = await prisma.vendorUser.findUnique({
        where: { email: data.email.trim() },
      });
      if (emailExists) {
        throw new AppError('Vendor with this email already exists.', 400);
      }
    }

    // 4. Create VendorUser
    const vendor = await prisma.vendorUser.create({
      data: {
        name: data.name.trim(),
        phone: cleanPhone,
        email: data.email ? data.email.trim() : null,
        status: 'PENDING',
        isActive: true,
      },
    });

    // 5. Generate JWT
    const token = jwt.sign(
      { id: vendor.id, phone: vendor.phone, type: 'VENDOR' },
      ENV.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return {
      message: 'Vendor registered successfully',
      data: {
        token,
        vendor: {
          id: vendor.id,
          name: vendor.name,
          phone: vendor.phone,
          email: vendor.email,
          status: vendor.status,
        },
      },
    };
  }

  // ==========================================
  // 2B. REGISTER VENDOR + CREATE SHOP (One-Shot)
  // ==========================================

  /**
   * POST /vendor/register
   * One-shot: verifies OTP → creates VendorUser → creates Shop (PENDING_VERIFICATION)
   * No bearer token needed. Uses phone+OTP for identity.
   */
  static async registerWithShop(data: {
    phone: string;
    otp: string;
    ownerName: string;
    email?: string;
    // Shop fields
    name: string;           // Shop name (required)
    description?: string;
    latitude?: number;
    longitude?: number;
    businessEmail?: string;
    businessPhone?: string;
    supportPhone?: string;
    addressLine?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    panNumber?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    bankBeneficiaryName?: string;
    logoUrl?: string;
    bannerUrl?: string;
  }) {
    const cleanPhone = cleanIndianPhoneNumber(data.phone);

    // 1. Validate OTP
    await this._verifyOtp(cleanPhone, data.otp);

    // 2. Check if vendor already exists
    const existing = await prisma.vendorUser.findUnique({
      where: { phone: cleanPhone },
    });
    if (existing) {
      throw new AppError('Vendor with this phone number already exists. Please login.', 400);
    }

    // 3. Check email uniqueness
    if (data.email) {
      const emailExists = await prisma.vendorUser.findUnique({
        where: { email: data.email.trim() },
      });
      if (emailExists) {
        throw new AppError('Vendor with this email already exists.', 400);
      }
    }

    // 4. Validate required shop name
    if (!data.name || !data.name.trim()) {
      throw new AppError('Shop name is required', 400);
    }

    // 5. Generate unique slug
    let baseSlug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    if (!baseSlug) baseSlug = 'shop';

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.shop.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 6. Transaction: create VendorUser + Shop
    const result = await prisma.$transaction(async (tx) => {
      // Create VendorUser
      const vendor = await tx.vendorUser.create({
        data: {
          name: (data.ownerName || data.name).trim(),
          phone: cleanPhone,
          email: data.email ? data.email.trim() : null,
          status: 'PENDING',
          isActive: true,
        },
      });

      // Create Shop as PENDING_VERIFICATION
      const shop = await tx.shop.create({
        data: {
          ownerId: vendor.id,       // placeholder for required User relation
          vendorOwnerId: vendor.id, // actual vendor owner
          name: data.name.trim(),
          slug,
          description: data.description || null,
          status: 'PENDING_VERIFICATION',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          businessEmail: data.businessEmail || null,
          businessPhone: data.businessPhone || null,
          supportPhone: data.supportPhone || null,
          addressLine: data.addressLine || null,
          city: data.city || null,
          state: data.state || null,
          pincode: data.pincode || null,
          gstin: data.gstin || null,
          panNumber: data.panNumber || null,
          bankAccountNumber: data.bankAccountNumber || null,
          bankIfsc: data.bankIfsc || null,
          bankBeneficiaryName: data.bankBeneficiaryName || null,
          logoUrl: data.logoUrl || null,
          bannerUrl: data.bannerUrl || null,
        },
      });

      return { vendor, shop };
    });

    // 7. Generate JWT
    const token = jwt.sign(
      { id: result.vendor.id, phone: result.vendor.phone, type: 'VENDOR' },
      ENV.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return {
      message: 'Vendor shop created successfully',
      data: {
        token,
        shop: {
          id: result.shop.id,
          name: result.shop.name,
          slug: result.shop.slug,
          status: result.shop.status,
          latitude: result.shop.latitude,
          longitude: result.shop.longitude,
          businessEmail: result.shop.businessEmail,
          businessPhone: result.shop.businessPhone,
          description: result.shop.description,
          logoUrl: result.shop.logoUrl,
          bannerUrl: result.shop.bannerUrl,
        },
        vendor: {
          id: result.vendor.id,
          name: result.vendor.name,
          phone: result.vendor.phone,
          email: result.vendor.email,
          status: result.vendor.status,
        },
      },
    };
  }

  // ==========================================
  // 3. LOGIN VENDOR
  // ==========================================

  /**
   * Login an existing VendorUser with OTP
   */
  static async login(phone: string, otp: string) {
    const cleanPhone = cleanIndianPhoneNumber(phone);

    // 1. Validate OTP
    await this._verifyOtp(cleanPhone, otp);

    // 2. Find vendor
    const vendor = await prisma.vendorUser.findUnique({
      where: { phone: cleanPhone },
    });

    if (!vendor) {
      throw new AppError('Vendor not registered. Please register first.', 404);
    }

    if (!vendor.isActive) {
      throw new AppError('Your vendor account has been deactivated. Contact support.', 403);
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { id: vendor.id, phone: vendor.phone, type: 'VENDOR' },
      ENV.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return {
      message: 'Vendor logged in successfully',
      data: {
        token,
        vendor: {
          id: vendor.id,
          name: vendor.name,
          phone: vendor.phone,
          email: vendor.email,
          status: vendor.status,
        },
      },
    };
  }

  // ==========================================
  // 4. PROFILE
  // ==========================================

  /**
   * Get vendor profile with application status
   */
  static async getProfile(vendorUserId: string) {
    const vendor = await prisma.vendorUser.findUnique({
      where: { id: vendorUserId },
      include: {
        vendorApplication: {
          select: {
            id: true,
            status: true,
            shopName: true,
            submittedAt: true,
            reviewRemarks: true,
          },
        },
        ownedShops: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }

    return {
      id: vendor.id,
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email,
      status: vendor.status,
      createdAt: vendor.createdAt,
      application: vendor.vendorApplication || null,
      shops: vendor.ownedShops,
    };
  }

  /**
   * Update vendor profile
   */
  static async updateProfile(vendorUserId: string, data: { name?: string; email?: string }) {
    const vendor = await prisma.vendorUser.findUnique({
      where: { id: vendorUserId },
    });

    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }

    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.email !== undefined) {
      const trimmedEmail = data.email.trim();
      if (trimmedEmail !== vendor.email) {
        const emailExists = await prisma.vendorUser.findUnique({
          where: { email: trimmedEmail },
        });
        if (emailExists && emailExists.id !== vendorUserId) {
          throw new AppError('Email is already used by another vendor', 400);
        }
      }
      updateData.email = trimmedEmail || null;
    }

    const updated = await prisma.vendorUser.update({
      where: { id: vendorUserId },
      data: updateData,
    });

    return this.getProfile(updated.id);
  }

  // ==========================================
  // INTERNAL HELPERS
  // ==========================================

  /**
   * Generate OTP, store it in the shared otpVerification table, and send via WhatsApp
   * Reuses the same OTP table as customer auth (phone-based, no user FK)
   */
  private static async _generateAndSendOtp(cleanPhone: string) {
    // Rate limit: 60 seconds
    const recentOtp = await prisma.otpVerification.findFirst({
      where: { phone: cleanPhone },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp && recentOtp.createdAt >= new Date(Date.now() - 60 * 1000)) {
      throw new AppError('Please wait 60 seconds before requesting another OTP');
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 8);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otpVerification.create({
      data: { phone: cleanPhone, otpHash, expiresAt },
    });

    const sendResult = await WhatsAppService.sendOtp(cleanPhone, otp);

    return {
      message: sendResult.simulated
        ? `OTP dispatched to WhatsApp (Dev Simulation: ${otp})`
        : 'OTP sent to your WhatsApp number successfully',
      data: {
        whatsappNumber: cleanPhone,
        expiresInSeconds: 300,
        ...(ENV.SHOW_DEV_OTP && { devOtp: otp }),
      },
    };
  }

  /**
   * Verify OTP from the shared otpVerification table
   */
  private static async _verifyOtp(cleanPhone: string, otp: string) {
    const record = await prisma.otpVerification.findFirst({
      where: { phone: cleanPhone },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.isVerified || record.expiresAt <= new Date()) {
      throw new AppError('Invalid or expired OTP. Please request a new OTP.');
    }

    if (record.attempts >= 5) {
      throw new AppError('Too many failed attempts. Please request a new OTP.');
    }

    const isValid = await bcrypt.compare(otp.toString().trim(), record.otpHash);
    if (!isValid) {
      await prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppError('Incorrect OTP. Please enter the valid 6-digit code received on WhatsApp.', 401);
    }

    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { isVerified: true },
    });
  }
}
