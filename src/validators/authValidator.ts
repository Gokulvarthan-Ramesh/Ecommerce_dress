import { z } from 'zod';

export const sendOtpSchema = z.object({
  body: z.object({
    whatsappNumber: z.string().min(10, 'WhatsApp number must be at least 10 digits'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    whatsappNumber: z.string().min(10, 'WhatsApp number must be at least 10 digits'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    referralCode: z.string().optional().or(z.literal('')),
    gender: z.string().optional().or(z.literal('')),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid Date of Birth format. Please use YYYY-MM-DD.').optional().or(z.literal('')),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    whatsappNumber: z.string().min(10, 'WhatsApp number must be at least 10 digits'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  }),
});
