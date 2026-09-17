import { Cashfree } from 'cashfree-pg';
import { ENV } from './env';

// Configure Cashfree SDK
Cashfree.XClientId = ENV.CASHFREE.APP_ID;
Cashfree.XClientSecret = ENV.CASHFREE.SECRET_KEY;
Cashfree.XEnvironment =
  ENV.CASHFREE.ENV.toUpperCase() === 'PRODUCTION'
    ? Cashfree.Environment.PRODUCTION
    : Cashfree.Environment.SANDBOX;

export const CASHFREE_BASE_URL =
  ENV.CASHFREE.ENV.toUpperCase() === 'PRODUCTION'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

export { Cashfree };
