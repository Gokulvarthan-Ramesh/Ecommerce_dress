import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

import { WalletService } from './walletService';
import { CashfreeService } from './cashfreeService';
import { NotificationService } from './notificationService';
import { SystemSettingService } from './systemSettingService';
import { OrderStatus, PaymentMethod, PaymentStatus, WalletTxCategory } from '@prisma/client';
import { CartRepository } from '../repositories/CartRepository';

export class OrderService {
  static async processCashfreeWebhook(payload: any) {
    const eventType = payload.type;
    const orderData = payload.data?.order;
    const paymentData = payload.data?.payment;

    if (!orderData?.order_id) return;

    // Use PaymentEvent table for idempotency
    const eventId = payload.data?.payment?.cf_payment_id || `evt_${Date.now()}`;
    
    // Find the payment this relates to
    const payment = await prisma.payment.findFirst({
      where: { orderId: orderData.order_id }
    });

    if (!payment) return;

    try {
      await prisma.paymentEvent.create({
        data: {
          provider: 'CASHFREE',
          eventId: eventId.toString(),
          eventType: eventType,
          payload: payload
        }
      });
    } catch (e) {
      // If event exists, we already processed it (idempotency)
      console.log(`[WEBHOOK] Duplicate event ${eventId}, skipping.`);
      return;
    }

    const isSuccess =
      eventType === 'PAYMENT_SUCCESS_WEBHOOK' ||
      eventType === 'ORDER_PAID' ||
      paymentData?.payment_status === 'SUCCESS';

    if (isSuccess) {
      const order = await prisma.order.findUnique({
        where: { id: orderData.order_id },
        include: { orderItems: true },
      });

      if (!order || order.paymentStatus === PaymentStatus.SUCCESS) return;

      // Verify amount (Security check)
      const paidAmount = Number(paymentData?.payment_amount || orderData.order_amount || 0);
      if (paidAmount < Number(order.paymentAmount)) {
        console.error(`[WEBHOOK] Amount mismatch! Order ${order.id} paid ${paidAmount}, expected ${order.paymentAmount}`);
        // Optionally mark the order/payment as FAILED or requires manual intervention here
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CONFIRMED,
            paymentStatus: PaymentStatus.SUCCESS,
          },
        });
        
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            oldStatus: order.status,
            newStatus: OrderStatus.CONFIRMED,
            changedBy: 'SYSTEM',
            reason: 'Payment successful via Cashfree'
          }
        });

        await tx.payment.update({
          where: { id: payment.id },
          data: { 
            status: PaymentStatus.SUCCESS,
            providerPaymentId: paymentData?.cf_payment_id ? paymentData.cf_payment_id.toString() : null,
            method: paymentData?.payment_group || 'CASHFREE',
          }
        });

        if (orderData.cf_order_id) {
          const attempt = await tx.paymentAttempt.findUnique({
            where: { providerOrderId: orderData.cf_order_id.toString() }
          });
          if (attempt) {
            await tx.paymentAttempt.update({
              where: { id: attempt.id },
              data: { status: PaymentStatus.SUCCESS }
            });
          }
        }



        const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
        if (cart) {
          await tx.cartItem.deleteMany({
            where: {
              cartId: cart.id,
              variantId: { in: order.orderItems.map((i) => i.variantId) },
            },
          });
        }

        if (order.appliedOfferId) {
          await tx.offerUsage.create({ data: { offerId: order.appliedOfferId, userId: order.userId, orderId: order.id } });
          await tx.offer.update({ where: { id: order.appliedOfferId }, data: { timesUsed: { increment: 1 } } });
        }

        if (order.appliedCouponId) {
          await tx.couponUsage.create({ data: { couponId: order.appliedCouponId, userId: order.userId, orderId: order.id } });
          await tx.coupon.update({ where: { id: order.appliedCouponId }, data: { timesUsed: { increment: 1 } } });
        }
      });

      // Fire notifications (outside transaction — best-effort)
      NotificationService.paymentSuccess(order.userId, order.orderNumber).catch(() => {});
      NotificationService.orderConfirmed(order.userId, order.orderNumber).catch(() => {});
    } else if (eventType === 'PAYMENT_FAILED_WEBHOOK' || paymentData?.payment_status === 'FAILED') {
      await prisma.$transaction(async (tx) => {
        if (orderData.cf_order_id) {
          const attempt = await tx.paymentAttempt.findUnique({
            where: { providerOrderId: orderData.cf_order_id.toString() }
          });
          if (attempt) {
            await tx.paymentAttempt.update({
              where: { id: attempt.id },
              data: { status: PaymentStatus.FAILED }
            });
          }
        }
        await tx.order.updateMany({
          where: { id: orderData.order_id, paymentStatus: PaymentStatus.PENDING },
          data: { paymentStatus: PaymentStatus.FAILED },
        });
        await tx.payment.updateMany({
          where: { orderId: orderData.order_id, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED },
        });
      });
    }
  }


  static async getMyOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: {
            variant: {
              select: {
                product: {
                  select: {
                    images: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          select: {
            status: true,
            amount: true,
            method: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getOrderDetails(userId: string, id: string) {
    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: {
        orderItems: true,
        payments: {
          select: { status: true, amount: true, method: true },
        },
        refunds: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new AppError('Order not found', 404);
    return order;
  }

  static async cancelOrder(userId: string, id: string, reason: string = 'Cancelled by customer') {
    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: { orderItems: true, payments: true },
    });

    if (!order) throw new AppError('Order not found', 404);
    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
      throw new AppError('Order cannot be cancelled as it has already been dispatched/delivered');
    }
    if (order.status === OrderStatus.CANCELLED) throw new AppError('Order is already cancelled');

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });
      
      await tx.orderStatusHistory.create({
        data: { 
          orderId: order.id, 
          oldStatus: order.status,
          newStatus: OrderStatus.CANCELLED, 
          changedBy: userId,
          reason: reason 
        }
      });

      for (const item of order.orderItems) {
        await tx.inventoryTransaction.create({
          data: { variantId: item.variantId, quantity: item.quantity, type: 'RETURN', referenceId: order.id }
        });
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }

      if (Number(order.walletAmount) > 0) {
        await WalletService.creditWallet({
          userId: order.userId,
          amount: Number(order.walletAmount),
          category: WalletTxCategory.REFUND,
          referenceId: order.id,
          description: `Refund of wallet balance for cancelled order #${order.orderNumber}`,
        });
      }

      if (order.paymentStatus === PaymentStatus.SUCCESS) {
        const refundId = `REF-${order.orderNumber}-${Date.now()}`;
        const refundAmount = Number(order.paymentAmount);
        
        await CashfreeService.initiateRefund({
          orderId: order.id,
          refundAmount,
          refundId,
          refundNote: reason,
        });

        // Use the first payment ID if available
        const pId = order.payments[0]?.id;

        await tx.refund.create({
          data: {
            orderId: order.id,
            paymentId: pId,
            cfRefundId: refundId,
            amount: refundAmount,
            reason,
            status: PaymentStatus.SUCCESS,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: PaymentStatus.REFUNDED },
        });
      }
    });

    // Fire notifications (outside transaction — best-effort)
    NotificationService.orderCancelled(order.userId, order.orderNumber).catch(() => {});
    if (order.paymentStatus === PaymentStatus.SUCCESS) {
      NotificationService.refundInitiated(order.userId, order.orderNumber, Number(order.paymentAmount)).catch(() => {});
    }
  }
}
