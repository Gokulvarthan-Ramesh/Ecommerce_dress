import { Cashfree } from 'cashfree-pg';
import { ENV } from './env';

// Configure Cashfree SDK
const getAppId = () => (process.env.CASHFREE_APP_ID || ENV.CASHFREE.APP_ID || '').trim();
const getSecretKey = () => (process.env.CASHFREE_SECRET_KEY || ENV.CASHFREE.SECRET_KEY || '').trim();
const getCashfreeEnv = () => (process.env.CASHFREE_ENV || ENV.CASHFREE.ENV || 'SANDBOX').trim().toUpperCase();

Cashfree.XClientId = getAppId();
Cashfree.XClientSecret = getSecretKey();
Cashfree.XEnvironment =
  getCashfreeEnv() === 'PRODUCTION'
    ? Cashfree.Environment.PRODUCTION
    : Cashfree.Environment.SANDBOX;

export const CASHFREE_BASE_URL =
  getCashfreeEnv() === 'PRODUCTION'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

export { Cashfree };
