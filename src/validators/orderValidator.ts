import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const checkoutSchema = z.object({
  body: z.object({
    paymentMethod: z.nativeEnum(PaymentMethod).default('CASHFREE'),
    useWallet: z.boolean().default(false),
    couponCode: z.string().optional(),
    shippingAddress: z.object({
      fullName: z.string().min(1, 'Full name is required'),
      phone: z.string().min(10, 'Phone must be at least 10 characters'),
      addressLine1: z.string().min(1, 'Address Line 1 is required'),
      addressLine2: z.string().optional(),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      postalCode: z.string().min(1, 'Postal Code is required'),
      country: z.string().default('India'),
    }),
  }),
});
