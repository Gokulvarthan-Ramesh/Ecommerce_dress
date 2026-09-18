import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FEATURES = [
  { code: 'DASHBOARD', name: 'Dashboard Analytics', description: 'View KPI metrics and reports' },
  { code: 'CUSTOMERS', name: 'Customer Management', description: 'Manage customers and their wallets' },
  { code: 'PRODUCTS', name: 'Product Management', description: 'Manage products, categories, and variants' },
  { code: 'ORDERS', name: 'Order Management', description: 'Process orders, returns, and refunds' },
  { code: 'SHOPS', name: 'Shop & Vendor Management', description: 'Approve shops and process vendor payouts' },
  { code: 'MARKETING', name: 'Marketing & Promotions', description: 'Manage banners, offers, and coupons' },
  { code: 'SETTINGS', name: 'System Settings', description: 'Manage global platform configuration' },
  { code: 'ADMIN_ROLES', name: 'Admin Role Management', description: 'Control access and permissions for sub-admins' }
];

export async function seedFeatures() {
  console.log('Seeding RBAC Feature Masters...');
  
  for (const feature of FEATURES) {
    await prisma.featureMaster.upsert({
      where: { code: feature.code },
      update: { name: feature.name, description: feature.description },
      create: feature,
    });
  }

  console.log('✅ Feature Masters seeded successfully.');
}
