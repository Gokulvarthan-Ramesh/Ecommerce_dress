import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CASHFREE: {
    APP_ID: process.env.CASHFREE_APP_ID || '',
    SECRET_KEY: process.env.CASHFREE_SECRET_KEY || '',
    ENV: process.env.CASHFREE_ENV || 'SANDBOX',
    API_VERSION: process.env.CASHFREE_API_VERSION || '2023-08-01',
  },
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    API_KEY: process.env.CLOUDINARY_API_KEY || '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  },
  WHATSAPP: {
    API_TOKEN: process.env.WHATSAPP_API_TOKEN || '',
    PHONE_ID: process.env.WHATSAPP_PHONE_ID || '',
    TEMPLATE_NAME: process.env.WHATSAPP_OTP_TEMPLATE || '',
  },
  CUSTOMER_APP_URL: process.env.CUSTOMER_APP_URL || 'exp://localhost:8081',
  ADMIN_PANEL_URL: process.env.ADMIN_PANEL_URL || 'http://localhost:5173',
};
