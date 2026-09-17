import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  SHOW_DEV_OTP: process.env.SHOW_DEV_OTP === 'true' || process.env.NODE_ENV === 'development',

  CASHFREE: {
    APP_ID: process.env.CASHFREE_APP_ID || '',
    SECRET_KEY: process.env.CASHFREE_SECRET_KEY || '',
    WEBHOOK_SECRET: process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY || '',
    ENV: process.env.CASHFREE_ENV || 'SANDBOX',
    API_VERSION: process.env.CASHFREE_API_VERSION || '2023-08-01',
  },
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    API_KEY: process.env.CLOUDINARY_API_KEY || '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  },
  GOOGLE_DRIVE: {
    FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
    CLIENT_EMAIL: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || '',
    PRIVATE_KEY: (process.env.GOOGLE_DRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  WHATSAPP: {
    API_TOKEN: process.env.WHATSAPP_API_TOKEN || '',
    PHONE_ID: process.env.WHATSAPP_PHONE_ID || '',
    TEMPLATE_NAME: process.env.WHATSAPP_OTP_TEMPLATE || '',
  },
  CUSTOMER_APP_URL: process.env.CUSTOMER_APP_URL || 'exp://localhost:8081',
  ADMIN_PANEL_URL: process.env.ADMIN_PANEL_URL || 'http://localhost:5173',
  BRAND: {
    NAME: process.env.BRAND_NAME || 'DecodeX Fashionwear',
    EMAIL: process.env.BRAND_EMAIL || 'decodexfashionwear@gmail.com',
    PHONE: process.env.BRAND_PHONE || '9999999999',
  },
  SEED: {
    ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL || 'decodexfashionwear@gmail.com',
    ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD || 'Admin@12345',
    ADMIN_NAME: process.env.INITIAL_ADMIN_NAME || 'DecodeX Administrator',
    ADMIN_PHONE: process.env.INITIAL_ADMIN_PHONE || '9999999999',
    CUSTOMER_EMAIL: process.env.INITIAL_CUSTOMER_EMAIL || 'customer@test.com',
    CUSTOMER_PASSWORD: process.env.INITIAL_CUSTOMER_PASSWORD || 'Test@12345',
    CUSTOMER_PHONE: process.env.INITIAL_CUSTOMER_PHONE || '9876543210',
  },
};

