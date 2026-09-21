// Promo-specific error codes for consistent API responses
export const PROMO_ERROR_CODES = {
  PROMO_NOT_FOUND: 'PROMO_NOT_FOUND',
  PROMO_INACTIVE: 'PROMO_INACTIVE',
  PROMO_EXPIRED: 'PROMO_EXPIRED',
  PROMO_NOT_STARTED: 'PROMO_NOT_STARTED',
  PROMO_USAGE_EXHAUSTED: 'PROMO_USAGE_EXHAUSTED',
  PROMO_CUSTOMER_LIMIT: 'PROMO_CUSTOMER_LIMIT',
  PROMO_CUSTOMER_RESTRICTED: 'PROMO_CUSTOMER_RESTRICTED',
  PROMO_FIRST_ORDER_ONLY: 'PROMO_FIRST_ORDER_ONLY',
  PROMO_MINIMUM_ORDER: 'PROMO_MINIMUM_ORDER',
  PROMO_NOT_APPLICABLE: 'PROMO_NOT_APPLICABLE',
  PROMO_ALREADY_USED: 'PROMO_ALREADY_USED',
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  CAMPAIGN_NOT_ACTIVE: 'CAMPAIGN_NOT_ACTIVE',
} as const;

export class PromoError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'PromoError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
