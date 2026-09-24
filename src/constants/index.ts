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

export const PRODUCT_SPECIFICATION_KEYS = {
  // Common Apparel/Fashion Keys
  MATERIAL: 'Material',
  CARE_INSTRUCTIONS: 'Care Instructions',
  ORIGIN: 'Origin',
  WEIGHT: 'Weight',
  WARRANTY: 'Warranty',
  FIT: 'Fit',
  STYLE: 'Style',
  PATTERN: 'Pattern',
  OCCASION: 'Occasion',
  NECKLINE: 'Neckline',
  SLEEVE_LENGTH: 'Sleeve Length',
  
  // Variant Level Details
  FRONT_DETAILS: 'Front Details',
  BACK_DETAILS: 'Back Details',
  CLOSURE_TYPE: 'Closure Type',
  POCKETS: 'Pockets',
  STRETCH: 'Stretch',
} as const;
