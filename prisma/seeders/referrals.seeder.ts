import { PrismaClient, Role, ReferralStatus, WalletTxType, WalletTxCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedReferrals(prisma: PrismaClient) {
  console.log('🤝 Seeding referrals...');

  const referrer = await prisma.user.findFirst({
    where: { email: 'customer@test.com' }
  });

  if (!referrer) {
    console.log('⚠️  Referrer (Customer) not found, skipping referral seed.');
    return null;
  }

  // Create or get a referee user
  const refereeEmail = 'referee@test.com';
  let referee = await prisma.user.findUnique({ where: { email: refereeEmail } });
  
  if (!referee) {
    const passwordHash = await bcrypt.hash('Test@12345', 10);
    referee = await prisma.user.create({
      data: {
        name: 'Referred Customer',
        email: refereeEmail,
        phone: '9876543211',
        passwordHash,
        role: Role.CUSTOMER,
        referralCode: 'REF12345',
        referredById: referrer.id, // Linking here
        wallet: { create: { balance: 50.0 } }, // Give sign up bonus
      }
    });
  }

  // Create the referral record
  const referral = await prisma.referral.upsert({
    where: { 
      refereeId: referee.id
    },
    update: {},
    create: {
      referrerId: referrer.id,
      refereeId: referee.id,
      status: ReferralStatus.CREDITED,
      rewards: {
        create: [
          {
            userId: referrer.id,
            amount: 100.0,
            rewardType: 'REFERRER_BONUS',
            status: ReferralStatus.CREDITED,
          },
          {
            userId: referee.id,
            amount: 50.0,
            rewardType: 'REFEREE_BONUS',
            status: ReferralStatus.CREDITED,
          }
        ]
      }
    }
  });

  console.log(`   ✅ Referral created: Referrer (${referrer.email}) -> Referee (${referee.email})`);
  return referral;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedReferrals(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error seeding referrals:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
