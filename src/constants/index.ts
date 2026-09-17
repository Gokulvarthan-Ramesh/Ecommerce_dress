export const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export const PAYMENT_METHOD = {
  CASHFREE: 'CASHFREE',
  COD: 'COD',
  WALLET: 'WALLET',
} as const;

export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
} as const;

export const SETTING_KEYS = {
  FIRST_ORDER_OFFER: 'first_order_offer',
  REFERRAL_PROGRAM: 'referral_program',
  SHIPPING: 'shipping',
  PAYMENTS: 'payments',
  WALLET: 'wallet',
} as const;
