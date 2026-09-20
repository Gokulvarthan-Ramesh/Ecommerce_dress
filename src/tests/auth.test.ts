import { describe, it, expect, vi } from 'vitest';
import { AuthController } from '../controllers/authController';

vi.mock('../config/db', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    otpVerification: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() }
  }
}));

describe('Auth API Hardening', () => {
  it('should define rate limited endpoints', () => {
    expect(AuthController.sendWhatsAppOtp).toBeDefined();
    expect(AuthController.login).toBeDefined();
    expect(AuthController.register).toBeDefined();
  });
});
