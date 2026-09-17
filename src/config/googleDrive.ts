import { ENV } from './env';

export const GOOGLE_DRIVE_CONFIG = {
  FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  CLIENT_EMAIL: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || '',
  PRIVATE_KEY: (process.env.GOOGLE_DRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};
