import { prisma } from '../config/db';
import { OrderStatus, PaymentStatus, WalletTxCategory } from '@prisma/client';
import { WalletService } from '../services/walletService';
import { NotificationService } from '../services/notificationService';

const PENDING_ORDER_EXPIRY_MINUTES = 30;

/**
 * Cancel orders stuck in PENDING_PAYMENT beyond the expiry window.
 * Restores reserved stock and refunds any wallet amount that was debited.
 */
export async function cancelExpiredPendingOrders() {
  const cutoff = new Date(Date.now() - PENDING_ORDER_EXPIRY_MINUTES * 60 * 1000);

  const expiredOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: { lt: cutoff },
    },
    include: { orderItems: true },
  });

  console.log('[JOB] cancelExpiredPendingOrders: Found ' + expiredOrders.length + ' expired orders');

  for (const order of expiredOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: PaymentStatus.FAILED,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            oldStatus: order.status,
            newStatus: OrderStatus.CANCELLED,
            changedBy: 'SYSTEM',
            reason: 'Auto-cancelled: payment not completed within ' + PENDING_ORDER_EXPIRY_MINUTES + ' minutes',
          },
        });

        // Restore reserved stock
        for (const item of order.orderItems) {
          await tx.inventoryTransaction.create({
            data: {
              variantId: item.variantId,
              quantity: item.quantity,
              type: 'RETURN',
              referenceId: order.id,
            },
          });
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }

        // Release any active inventory reservations
        await tx.inventoryReservation.updateMany({
          where: { orderId: order.id, status: 'ACTIVE' },
          data: { status: 'EXPIRED', releasedAt: new Date() }
        });

        // Refund wallet if any was debited
        if (Number(order.walletAmount) > 0) {
          await WalletService.creditWallet({
            userId: order.userId,
            amount: Number(order.walletAmount),
            category: WalletTxCategory.REFUND,
            referenceId: order.id,
            description: 'Refund: order ' + order.orderNumber + ' expired (payment not completed)',
          });
        }
      });

      NotificationService.orderCancelled(order.userId, order.orderNumber).catch(() => {});
      console.log('[JOB] Cancelled expired order: ' + order.orderNumber);
    } catch (error) {
      console.error('[JOB] Failed to cancel expired order ' + order.id + ':', error);
    }
  }
}
