import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Promo Masters...');

  // 1. PromoCodeDistributionType
  const distributionTypes = [
    { code: 'SHARED', name: 'Shared', description: 'A single code shared among multiple users' },
    { code: 'UNIQUE', name: 'Unique', description: 'Unique codes generated for each user/campaign' },
    { code: 'CUSTOMER_SPECIFIC', name: 'Customer Specific', description: 'Code specifically tied to one customer' }
  ];

  for (const dt of distributionTypes) {
    await prisma.promoCodeDistributionType.upsert({
      where: { code: dt.code },
      update: {},
      create: dt,
    });
  }

  // 2. PromoCampaignType
  const campaignTypes = [
    { code: 'WELCOME', name: 'Welcome Offer', description: 'For new users signing up' },
    { code: 'FIRST_ORDER', name: 'First Order', description: 'Exclusive for the very first order' },
    { code: 'VISITING_CARD', name: 'Visiting Card Promo', description: 'Promo distributed via physical visiting cards' },
    { code: 'FESTIVE', name: 'Festive Offer', description: 'Festival and holiday season promotions' },
    { code: 'REFERRAL', name: 'Referral Bonus', description: 'Reward for referring a friend' },
    { code: 'SOCIAL_MEDIA', name: 'Social Media', description: 'Campaigns driven from Instagram, Facebook, etc.' },
    { code: 'INFLUENCER', name: 'Influencer Promo', description: 'Specific influencer campaigns' },
    { code: 'CUSTOMER_RETENTION', name: 'Customer Retention', description: 'Win-back campaigns for inactive users' },
    { code: 'GENERAL', name: 'General', description: 'General seasonal or ad-hoc campaigns' }
  ];

  for (const ct of campaignTypes) {
    await prisma.promoCampaignType.upsert({
      where: { code: ct.code },
      update: {},
      create: ct,
    });
  }

  // 3. PromoDiscountType
  const discountTypes = [
    { code: 'FIXED_AMOUNT', name: 'Fixed Amount', description: 'A fixed currency amount off' },
    { code: 'PERCENTAGE', name: 'Percentage', description: 'A percentage off the order total' },
    { code: 'FREE_DELIVERY', name: 'Free Delivery', description: 'Waives the delivery fee completely' }
  ];

  for (const dt of discountTypes) {
    await prisma.promoDiscountType.upsert({
      where: { code: dt.code },
      update: {},
      create: dt,
    });
  }

  console.log('Promo Masters seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
