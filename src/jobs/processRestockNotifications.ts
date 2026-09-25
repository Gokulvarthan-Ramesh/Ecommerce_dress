import { prisma } from '../config/db';
import { NotificationService } from '../services/notificationService';
import { WhatsAppService } from '../services/whatsappService';

export const processRestockNotifications = async () => {
  try {
    // Find all pending subscriptions where the related variant is now in stock
    const pendingSubscriptions = await (prisma as any).backInStockSubscription.findMany({
      where: {
        status: 'PENDING',
        variant: {
          stockQuantity: { gt: 0 }
        }
      },
      include: {
        user: true,
        variant: {
          include: { product: true }
        }
      }
    });

    if (pendingSubscriptions.length === 0) {
      return;
    }

    console.log(`[JOB: Restock Notifications] Found ${pendingSubscriptions.length} pending back-in-stock subscriptions to process.`);

    for (const sub of pendingSubscriptions) {
      // RATE LIMIT CHECK: Max 3 notifications per 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentNotifications = await (prisma as any).backInStockSubscription.count({
        where: {
          userId: sub.userId,
          status: { in: ['NOTIFIED', 'NOTIFIED_RATE_LIMITED'] },
          updatedAt: { gte: sevenDaysAgo }
        }
      });

      if (recentNotifications >= 3) {
        console.log(`[JOB: Restock Notifications] Skipping user ${sub.userId} - reached max 3 notifications in 7 days.`);
        await (prisma as any).backInStockSubscription.update({
          where: { id: sub.id },
          data: { status: 'NOTIFIED_RATE_LIMITED' }
        });
        continue;
      }

      const productName = sub.variant.product.name;
      const sizeColor = `${sub.variant.color} - ${sub.variant.size}`;
      const message = `Good news! ${productName} (${sizeColor}) is back in stock. Hurry before it runs out again!`;

      // 1. In-App Notification
      if (NotificationService) {
        await NotificationService.create({
          userId: sub.userId,
          title: 'Back in Stock!',
          message: message,
          type: 'BACK_IN_STOCK'
        }).catch((e: any) => console.error('Failed to send in-app notification', e));
      }
      
      // 2. WhatsApp Message
      if (WhatsAppService && sub.user.phone) {
        await WhatsAppService.sendMessage(sub.user.phone, message)
          .catch((e: any) => console.error('WhatsApp send failed', e));
      }

      // 3. Mark as NOTIFIED
      await (prisma as any).backInStockSubscription.update({
        where: { id: sub.id },
        data: { status: 'NOTIFIED' }
      });
    }

    console.log(`[JOB: Restock Notifications] Successfully notified ${pendingSubscriptions.length} users.`);
  } catch (error) {
    console.error('[JOB ERROR] Failed to process restock notifications:', error);
  }
};
