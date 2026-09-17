import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ENV } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { UserRepository } from '../repositories/UserRepository';
import { ReferralRepository } from '../repositories/ReferralRepository';
import { WalletService } from './walletService';
import { ReferralService } from './referralService';
import { WhatsAppService } from './whatsappService';
import { Role } from '@prisma/client';
import { cleanIndianPhoneNumber } from '../utils/phone';

export class AuthService {
  static async sendWhatsAppOtp(targetPhone: string) {
    const cleanPhone = cleanIndianPhoneNumber(targetPhone);
    
    const recentOtp = await UserRepository.getLatestOtp(cleanPhone);
    if (recentOtp && recentOtp.createdAt >= new Date(Date.now() - 60 * 1000)) {
      throw new AppError('Please wait 60 seconds before requesting another OTP');
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 8);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await UserRepository.saveOtp(cleanPhone, otpHash, expiresAt);

    const sendResult = await WhatsAppService.sendOtp(cleanPhone, otp);

    return {
      message: sendResult.simulated
        ? `OTP dispatched to WhatsApp (Dev Simulation: ${otp})`
        : 'OTP sent to your WhatsApp number successfully',
      data: {
        whatsappNumber: cleanPhone,
        expiresInSeconds: 300,
        ...(process.env.NODE_ENV === 'development' && { devOtp: otp }),
      },
    };
  }

  static async register(targetPhone: string, otp: string, password: string, name: string, email?: string, referralCode?: string) {
    const cleanPhone = cleanIndianPhoneNumber(targetPhone);

    // 1. Validate phone and otp
    const record = await UserRepository.getLatestOtp(cleanPhone);

    if (!record || record.isVerified || record.expiresAt <= new Date()) {
      throw new AppError('Invalid or expired OTP. Please request a new OTP.');
    }

    if (record.attempts >= 5) {
      throw new AppError('Too many failed attempts. Please request a new OTP.');
    }

    const isValid = await bcrypt.compare(otp.toString().trim(), record.otpHash);
    if (!isValid) {
      await UserRepository.updateOtp(record.id, { attempts: { increment: 1 } });
      throw new AppError('Incorrect OTP. Please enter the valid 6-digit code received on WhatsApp.');
    }

    await UserRepository.updateOtp(record.id, { isVerified: true });

    // 2. Check existing user
    let user = await UserRepository.findUnique({ where: { phone: cleanPhone } });
    if (user) {
      throw new AppError('User with this phone number already exists. Please log in.', 400);
    }
    if (email) {
      const emailUser = await UserRepository.findUnique({ where: { email } });
      if (emailUser) {
        throw new AppError('User with this email already exists. Please log in.', 400);
      }
    }

    // 3. Find referrer if referral code provided
    let referrerId: string | undefined = undefined;
    if (referralCode) {
      const trimmedCode = referralCode.trim().toUpperCase();
      const referrer = await UserRepository.findUnique({ where: { referralCode: trimmedCode } });
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create user
    const userReferralCode = `${name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const createdUser = await UserRepository.create({
      data: {
        name: name.trim(),
        phone: cleanPhone,
        email: email ? email.trim() : undefined,
        passwordHash,
        role: Role.CUSTOMER,
        referralCode: userReferralCode,
        referredById: referrerId, // Save referred_by_user_id directly
        wallet: { create: { balance: 0.0 } }, // 6. Create wallet
      },
    }) as any;

    // 5. Create referral tracking record if applicable
    if (referrerId) {
      await ReferralService.handleUserRegistrationReferral(createdUser.id, referrerId);
    }

    // 7. Generate JWT
    const token = jwt.sign(
      { id: createdUser.id, email: createdUser.email || '', role: createdUser.role },
      ENV.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 8. Return response
    return {
      message: 'Registered successfully',
      data: {
        token,
        user: {
          id: createdUser.id,
          name: createdUser.name,
          phone: createdUser.phone,
          email: createdUser.email,
          role: createdUser.role,
          referralCode: createdUser.referralCode,
        },
      },
    };
  }

  static async login(identifier: string, password: string) {
    let cleanPhone = identifier;
    let isEmail = identifier.includes('@');

    if (!isEmail) {
      cleanPhone = cleanIndianPhoneNumber(identifier);
    }

    // 1. Find user
    const user = await UserRepository.findUnique({
      where: isEmail ? { email: identifier } : { phone: cleanPhone }
    });

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid credentials or account not registered with password', 401);
    }

    // 2. Compare password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // 3. Generate access token
    const token = jwt.sign(
      { id: user.id, email: user.email || '', role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 4. Return user
    return {
      message: 'Logged in successfully',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          referralCode: user.referralCode,
        },
      },
    };
  }

  // Legacy method (WhatsApp OTP login only - optional depending on requirements)
  static async verifyWhatsAppOtp(targetPhone: string, otp: string, name?: string, referralCode?: string) {
    // ... we can leave this here or deprecate it if the user only wants the new flow.
    // Given the flow requirement, they seem to be replacing this with standard password login.
    throw new AppError('Method deprecated. Use /register and /login endpoints instead.');
  }

  static async getProfile(userId: string) {
    const user = await UserRepository.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const wallet = await WalletService.getOrCreateWallet(userId);
    const referralCount = await ReferralRepository.count({
      where: { referrerId: userId, status: 'CREDITED' },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      walletBalance: Number(wallet.balance),
      successfulReferrals: referralCount,
    };
  }
}
