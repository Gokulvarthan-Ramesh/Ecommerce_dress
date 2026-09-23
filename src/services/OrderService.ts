import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

import { WalletService } from './walletService';
import { CashfreeService } from './cashfreeService';
import { NotificationService } from './notificationService';
import { SystemSettingService } from './systemSettingService';
import { OrderStatus, PaymentMethod, PaymentStatus, WalletTxCategory, WalletTxType, SubOrderStatus } from '@prisma/client';
import { CartRepository } from '../repositories/CartRepository';
import { ApiFeatures } from '../utils/ApiFeatures';

export class OrderService {
  static async processCashfreeWebhook(payload: any, webhookId?: string) {
    const eventType = payload.type;
    const orderData = payload.data?.order;
    const paymentData = payload.data?.payment;

    if (!orderData?.order_id) return;

    // Use PaymentEvent table for idempotency
    const eventId = webhookId || payload.data?.payment?.cf_payment_id || `evt_${Date.now()}`;
    
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

        if (order.appliedPromoCodeId) {
          const promo = await tx.promoCode.findUnique({ where: { id: order.appliedPromoCodeId } });
          if (promo) {
            await tx.$executeRaw`
              UPDATE promo_codes
              SET "usageCount" = "usageCount" + 1, "updatedAt" = NOW()
              WHERE id = ${order.appliedPromoCodeId}
            `;
            await tx.promoCodeUsage.create({
              data: {
                promoCodeId: promo.id,
                campaignId: promo.campaignId,
                userId: order.userId,
                orderId: order.id,
                discountAmount: order.promoDiscount,
                orderSubtotal: order.subtotal,
              },
            });
          }
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


  static async getMyOrders(userId: string, queryString: any) {
    const features = new ApiFeatures(queryString).filter(['id', 'status']).sort().paginate();
    features.query.where.userId = userId;

    const [total, orders] = await Promise.all([
      prisma.order.count({ where: features.query.where }),
      prisma.order.findMany({
        ...features.query,
        include: {
          orderItems: {
            include: {
              product: { select: { returnWindowDays: true } },
              variant: {
                select: {
                  product: {
                    select: {
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
          subOrders: {
            include: {
              shop: { select: { name: true, slug: true } },
              items: {
                include: {
                  product: { select: { returnWindowDays: true } }
                }
              },
            }
          },
        },
      })
    ]);

    const limitParam = queryString.limit === 'all' || queryString.pagination === 'false' ? 'all' : parseInt(queryString.limit || '10', 10);
    
    const currentDate = new Date();
    
    const enrichedOrders = orders.map((order: any) => {
      const enrichedOrder = { ...order, isReturnApplicable: false };

      if (enrichedOrder.status === 'DELIVERED' && enrichedOrder.updatedAt) {
        const deliveredDays = Math.floor((currentDate.getTime() - new Date(enrichedOrder.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        enrichedOrder.orderItems = enrichedOrder.orderItems.map((item: any) => {
          const returnWindowDays = item.product?.returnWindowDays ?? 2;
          return { ...item, isReturnApplicable: deliveredDays <= returnWindowDays };
        });
        
        enrichedOrder.isReturnApplicable = enrichedOrder.orderItems.some((item: any) => item.isReturnApplicable);
      } else {
        enrichedOrder.orderItems = enrichedOrder.orderItems.map((item: any) => ({ ...item, isReturnApplicable: false }));
      }

      if (enrichedOrder.subOrders) {
        enrichedOrder.subOrders = enrichedOrder.subOrders.map((sub: any) => {
          let isReturnApplicable = false;
          if (sub.status === 'DELIVERED' && sub.deliveredAt) {
            const daysSinceDelivery = Math.floor((currentDate.getTime() - new Date(sub.deliveredAt).getTime()) / (1000 * 60 * 60 * 24));
            
            sub.items = sub.items.map((subItem: any) => {
              const returnWindowDays = subItem.product?.returnWindowDays ?? 2;
              const itemReturnApplicable = daysSinceDelivery <= returnWindowDays;
              if (itemReturnApplicable) isReturnApplicable = true;
              return { ...subItem, isReturnApplicable: itemReturnApplicable };
            });
          } else {
            sub.items = sub.items.map((subItem: any) => ({ ...subItem, isReturnApplicable: false }));
          }
          return { ...sub, isReturnApplicable };
        });
      }

      return enrichedOrder;
    });

    return {
      items: enrichedOrders,
      meta: ApiFeatures.getMeta(total, parseInt(queryString.page || 1, 10), limitParam as any)
    };
  }

  static async verifyAndSyncCashfreePayment(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true }
    });

    if (!order || order.paymentMethod !== PaymentMethod.CASHFREE) {
      return order;
    }

    if (order.paymentStatus === PaymentStatus.SUCCESS && order.status !== OrderStatus.PENDING_PAYMENT) {
      return order;
    }

    try {
      const payments = await CashfreeService.getOrderPayments(order.id);
      if (Array.isArray(payments) && payments.length > 0) {
        const successPayment = payments.find((p: any) => p.payment_status === 'SUCCESS');
        if (successPayment) {
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
                reason: 'Cashfree payment verified via API sync',
              },
            });

            const paymentRecord = order.payments[0];
            if (paymentRecord) {
              await tx.payment.update({
                where: { id: paymentRecord.id },
                data: {
                  status: PaymentStatus.SUCCESS,
                  providerPaymentId: successPayment.cf_payment_id ? successPayment.cf_payment_id.toString() : null,
                  method: successPayment.payment_group || 'CASHFREE',
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

            if (order.appliedPromoCodeId) {
              const promo = await tx.promoCode.findUnique({ where: { id: order.appliedPromoCodeId } });
              if (promo) {
                await tx.$executeRaw`
                  UPDATE promo_codes
                  SET "usageCount" = "usageCount" + 1, "updatedAt" = NOW()
                  WHERE id = ${order.appliedPromoCodeId}
                `;
                await tx.promoCodeUsage.create({
                  data: {
                    promoCodeId: promo.id,
                    campaignId: promo.campaignId,
                    userId: order.userId,
                    orderId: order.id,
                    discountAmount: order.promoDiscount,
                    orderSubtotal: order.subtotal,
                  },
                });
              }
            }

            // Consume Inventory Reservations
            const activeReservations = await tx.inventoryReservation.findMany({
              where: { orderId: order.id, status: 'ACTIVE' }
            });
            
            for (const res of activeReservations) {
              await tx.inventoryReservation.update({
                where: { id: res.id },
                data: { status: 'CONSUMED' }
              });
              await tx.inventoryTransaction.create({
                data: {
                  variantId: res.variantId,
                  quantity: -res.quantity, // Negative for sale
                  type: 'SALE',
                  referenceId: order.id
                }
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn(`[SYNC CASHFREE PAYMENT ERROR]:`, e);
    }

    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        payments: {
          select: { status: true, amount: true, method: true },
        },
        refunds: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        subOrders: {
          include: {
            shop: { select: { name: true, slug: true } },
            items: true,
          }
        },
      },
    });
  }

  static async verifyOrderPayment(userId: string, id: string) {
    const existing = await prisma.order.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new AppError('Order not found', 404);

    const synced = await this.verifyAndSyncCashfreePayment(id);
    return synced!;
  }

  static async getOrderDetails(userId: string, id: string) {
    const existing = await prisma.order.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new AppError('Order not found', 404);

    if (existing.status === OrderStatus.PENDING_PAYMENT && existing.paymentMethod === PaymentMethod.CASHFREE) {
      await this.verifyAndSyncCashfreePayment(id);
    }

    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: {
        orderItems: {
          include: {
            product: { select: { returnWindowDays: true } }
          }
        },
        payments: {
          select: { status: true, amount: true, method: true },
        },
        refunds: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        subOrders: {
          include: {
            shop: { select: { name: true, slug: true } },
            items: {
              include: {
                product: { select: { returnWindowDays: true } }
              }
            },
          }
        },
      },
    });

    if (!order) return order;

    const currentDate = new Date();
    
    const enrichedOrder: any = {
      ...order,
      isReturnApplicable: false
    };

    if (enrichedOrder.status === 'DELIVERED' && enrichedOrder.updatedAt) {
      const deliveredDays = Math.floor((currentDate.getTime() - new Date(enrichedOrder.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      enrichedOrder.orderItems = enrichedOrder.orderItems.map((item: any) => {
        const returnWindowDays = item.product?.returnWindowDays ?? 2;
        return { ...item, isReturnApplicable: deliveredDays <= returnWindowDays };
      });
      enrichedOrder.isReturnApplicable = enrichedOrder.orderItems.some((item: any) => item.isReturnApplicable);
    } else {
      enrichedOrder.orderItems = enrichedOrder.orderItems.map((item: any) => ({ ...item, isReturnApplicable: false }));
    }

    if (enrichedOrder.subOrders) {
      enrichedOrder.subOrders = enrichedOrder.subOrders.map((sub: any) => {
        let isReturnApplicable = false;
        if (sub.status === 'DELIVERED' && sub.deliveredAt) {
          const daysSinceDelivery = Math.floor((currentDate.getTime() - new Date(sub.deliveredAt).getTime()) / (1000 * 60 * 60 * 24));
          
          sub.items = sub.items.map((subItem: any) => {
            const returnWindowDays = subItem.product?.returnWindowDays ?? 2;
            const itemReturnApplicable = daysSinceDelivery <= returnWindowDays;
            if (itemReturnApplicable) isReturnApplicable = true;
            return { ...subItem, isReturnApplicable: itemReturnApplicable };
          });
        } else {
          sub.items = sub.items.map((subItem: any) => ({ ...subItem, isReturnApplicable: false }));
        }
        return { ...sub, isReturnApplicable };
      });
    }

    return enrichedOrder;
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

    let cfRefundId: string | null = null;
    if (order.paymentStatus === PaymentStatus.SUCCESS) {
      const refundId = `REF-${order.orderNumber}-${Date.now()}`;
      const refundAmount = Number(order.paymentAmount);
      try {
        const result = await CashfreeService.initiateRefund({
          orderId: order.id,
          refundAmount,
          refundId,
          refundNote: reason,
        });
        cfRefundId = result?.cfRefundId || refundId;
      } catch (err: any) {
        console.error('[CANCEL] Cashfree refund initiation error:', err?.message || err);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          ...(order.paymentStatus === PaymentStatus.SUCCESS && {
            paymentStatus: PaymentStatus.REFUNDED,
          }),
        },
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

      // Cascade cancellation to all sub-orders
      await tx.subOrder.updateMany({
        where: { parentOrderId: order.id, status: { not: SubOrderStatus.CANCELLED } },
        data: {
          status: SubOrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason || 'Parent order cancelled',
        },
      });

      for (const item of order.orderItems) {
        const reservation = await tx.inventoryReservation.findFirst({
          where: { orderId: order.id, variantId: item.variantId, status: 'ACTIVE' }
        });

        if (reservation) {
          // Release reservation
          await tx.inventoryReservation.update({
            where: { id: reservation.id },
            data: { status: 'RELEASED', releasedAt: new Date() }
          });
        } else {
          // Permanently return the transaction because it was previously confirmed
          await tx.inventoryTransaction.create({
            data: { variantId: item.variantId, quantity: item.quantity, type: 'RETURN', referenceId: order.id }
          });
        }

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }

      if (Number(order.walletAmount) > 0) {
        let wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
        if (!wallet) {
          wallet = await tx.wallet.create({ data: { userId: order.userId, balance: 0 } });
        }
        const balanceBefore = Number(wallet.balance);
        const refundAmt = Number(order.walletAmount);
        const balanceAfter = balanceBefore + refundAmt;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: balanceAfter },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: refundAmt,
            balanceBefore,
            balanceAfter,
            type: WalletTxType.CREDIT,
            category: WalletTxCategory.REFUND,
            referenceType: 'ORDER',
            referenceId: order.id,
            description: `Refund of wallet balance for cancelled order #${order.orderNumber}`,
          },
        });
      }

      if (order.paymentStatus === PaymentStatus.SUCCESS) {
        const pId = order.payments[0]?.id;
        await tx.refund.create({
          data: {
            orderId: order.id,
            paymentId: pId,
            cfRefundId: cfRefundId || `REF-${order.orderNumber}-${Date.now()}`,
            amount: Number(order.paymentAmount),
            reason,
            status: PaymentStatus.SUCCESS,
            processedAt: new Date(),
          },
        });
      }
    });

    // Fire notifications (outside transaction — best-effort)
    NotificationService.orderCancelled(order.userId, order.orderNumber).catch(() => {});
    if (order.paymentStatus === PaymentStatus.SUCCESS) {
      NotificationService.refundInitiated(order.userId, order.orderNumber, Number(order.paymentAmount)).catch(() => {});
    }
  }

  // =====================================
  // SUB-ORDER (VENDOR SPECIFIC) ACTIONS
  // =====================================

  static async cancelSubOrder(userId: string, subOrderId: string, reason: string = 'Cancelled by customer') {
    const subOrder = await prisma.subOrder.findFirst({
      where: { id: subOrderId, parentOrder: { userId } },
      include: { items: true, parentOrder: { include: { payments: true } } },
    });

    if (!subOrder) throw new AppError('SubOrder not found', 404);
    if (subOrder.status === SubOrderStatus.SHIPPED || subOrder.status === SubOrderStatus.DELIVERED) {
      throw new AppError('SubOrder cannot be cancelled as it has already been dispatched/delivered');
    }
    if (subOrder.status === SubOrderStatus.CANCELLED) throw new AppError('SubOrder is already cancelled');

    const refundAmount = Number(subOrder.subtotal) + Number(subOrder.shippingFee);

    await prisma.$transaction(async (tx) => {
      await tx.subOrder.update({
        where: { id: subOrderId },
        data: {
          status: SubOrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });

      for (const item of subOrder.items) {
        const reservation = await tx.inventoryReservation.findFirst({
          where: { orderId: subOrder.parentOrder.id, variantId: item.variantId, status: 'ACTIVE' }
        });

        if (reservation) {
          // Release reservation
          await tx.inventoryReservation.update({
            where: { id: reservation.id },
            data: { status: 'RELEASED', releasedAt: new Date() }
          });
        } else {
          // Permanently return the transaction because it was previously confirmed
          await tx.inventoryTransaction.create({
            data: { variantId: item.variantId, quantity: item.quantity, type: 'RETURN', referenceId: subOrderId }
          });
        }

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }

      if (subOrder.parentOrder.paymentStatus === PaymentStatus.SUCCESS) {
        await tx.refund.create({
          data: {
            orderId: subOrder.parentOrder.id,
            subOrderId: subOrder.id,
            amount: refundAmount,
            reason,
            status: PaymentStatus.PENDING,
          },
        });
      }
    });

    return { message: 'Sub-order cancelled successfully and refund initiated if applicable.' };
  }

  static async requestSubOrderReturn(userId: string, subOrderId: string, body: any) {
    const { reason, notes, items } = body;
    const subOrder = await prisma.subOrder.findFirst({
      where: { id: subOrderId, parentOrder: { userId } },
      include: { 
        items: {
          include: { product: true }
        }, 
        parentOrder: true 
      },
    });

    if (!subOrder) throw new AppError('SubOrder not found', 404);
    if (subOrder.status !== SubOrderStatus.DELIVERED || !subOrder.deliveredAt) {
      throw new AppError('Only delivered items can be returned');
    }
    
    // Check if an open return request already exists
    const existingReq = await prisma.returnRequest.findFirst({
      where: { subOrderId, status: { in: ['REQUESTED', 'APPROVED'] } }
    });
    if (existingReq) {
      throw new AppError('An active return request already exists for this order');
    }

    const itemsToReturn = items || subOrder.items.map((i: any) => ({
      orderItemId: i.id,
      quantity: i.quantity,
      reason: reason || 'Customer requested return'
    }));

    if (!itemsToReturn.length) {
      throw new AppError('No items specified for return');
    }

    // Validate return window for each item
    const currentDate = new Date();
    for (const item of itemsToReturn) {
      const orderItem = subOrder.items.find((i: any) => i.id === item.orderItemId);
      if (!orderItem) throw new AppError(`Order item ${item.orderItemId} not found in this sub-order`);
      
      const returnWindowDays = orderItem.product?.returnWindowDays ?? 2;
      const daysSinceDelivery = (currentDate.getTime() - subOrder.deliveredAt.getTime()) / (1000 * 3600 * 24);
      
      if (daysSinceDelivery > returnWindowDays) {
        throw new AppError(`Return window of ${returnWindowDays} days has expired for product: ${orderItem.productName}`);
      }
    }

    const newReturn = await prisma.$transaction(async (tx) => {
      // Get all previous non-rejected return items for this subOrder
      const previousReturns = await tx.returnItem.findMany({
        where: {
          returnRequest: {
            subOrderId: subOrderId,
            status: { not: 'REJECTED' }
          }
        }
      });

      const returnReq = await tx.returnRequest.create({
        data: {
          orderId: subOrder.parentOrderId,
          subOrderId: subOrder.id,
          customerId: userId,
          status: 'REQUESTED',
          reason: reason || 'Multiple items',
          notes: notes || null,
        }
      });

      for (const item of itemsToReturn) {
        const orderItem = subOrder.items.find((i: any) => i.id === item.orderItemId);
        if (!orderItem) throw new AppError(`Item ${item.orderItemId} not part of this sub-order`);
        
        const alreadyReturned = previousReturns
          .filter((pr: any) => pr.orderItemId === item.orderItemId)
          .reduce((sum: number, pr: any) => sum + pr.quantity, 0);

        if (item.quantity > (orderItem.quantity - alreadyReturned)) {
          throw new AppError(`Cannot return ${item.quantity} units for item ${item.orderItemId}. Only ${orderItem.quantity - alreadyReturned} units remain eligible for return.`);
        }
        
        await tx.returnItem.create({
          data: {
            returnRequestId: returnReq.id,
            orderItemId: orderItem.id,
            quantity: item.quantity,
            reason: item.reason || reason,
          }
        });
      }

      await tx.subOrder.update({
        where: { id: subOrderId },
        data: {
          returnStatus: 'REQUESTED',
          returnRequestedAt: new Date(),
          returnReason: reason,
          status: SubOrderStatus.RETURN_REQUESTED,
        },
      });

      return returnReq;
    });

    return newReturn;
  }

  static async processSubOrderReturn(subOrderId: string, action: 'APPROVE' | 'REJECT', remarks?: string) {
    const returnReq = await prisma.returnRequest.findFirst({
      where: { subOrderId, status: 'REQUESTED' },
      include: { items: true, subOrder: { include: { items: true, parentOrder: true } } }
    });

    if (!returnReq) {
      throw new AppError('Valid return request not found for this sub-order', 404);
    }

    const subOrder = returnReq.subOrder;

    if (action === 'REJECT') {
      await prisma.$transaction(async (tx) => {
        await tx.returnRequest.update({
          where: { id: returnReq.id },
          data: { status: 'REJECTED', rejectedAt: new Date(), notes: remarks || returnReq.notes }
        });
        await tx.subOrder.update({
          where: { id: subOrderId },
          data: { returnStatus: 'REJECTED', status: SubOrderStatus.DELIVERED },
        });
      });
      return { message: 'Return rejected' };
    }

    // APPROVE
    let totalRefundAmount = 0;
    for (const rItem of returnReq.items) {
      const originalOrderItem = subOrder.items.find((i: any) => i.id === rItem.orderItemId);
      if (originalOrderItem) {
        totalRefundAmount += Number(originalOrderItem.unitPrice) * rItem.quantity;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { id: returnReq.id },
        data: { status: 'APPROVED', approvedAt: new Date(), notes: remarks || returnReq.notes }
      });

      await tx.subOrder.update({
        where: { id: subOrderId },
        data: {
          returnStatus: 'APPROVED',
        },
      });

      for (const item of returnReq.items) {
        const originalOrderItem = subOrder.items.find((i: any) => i.id === item.orderItemId);
        if (originalOrderItem) {
          await tx.inventoryTransaction.create({
            data: { variantId: originalOrderItem.variantId, quantity: item.quantity, type: 'RETURN', referenceId: returnReq.id }
          });
          await tx.productVariant.update({
            where: { id: originalOrderItem.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }

      const refund = await tx.refund.create({
        data: {
          orderId: subOrder.parentOrderId,
          subOrderId: subOrder.id,
          amount: totalRefundAmount,
          reason: returnReq.reason || 'Return Approved',
          status: PaymentStatus.PENDING,
        },
      });

      for (const item of returnReq.items) {
        const originalOrderItem = subOrder.items.find((i: any) => i.id === item.orderItemId);
        if (originalOrderItem) {
          await tx.refundItem.create({
            data: {
              refundId: refund.id,
              orderItemId: item.orderItemId,
              quantity: item.quantity,
              refundAmount: Number(originalOrderItem.unitPrice) * item.quantity
            }
          });
        }
      }
      
      // We would also reverse commission from the vendor's wallet here
      // But currently shop payouts are handled in ShopService
    });

    return { message: 'Return approved, inventory restored, and refund queued.' };
  }

  /**
   * Generates a new Cashfree session for a pending order
   */
  static async retryPayment(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: userId,
      },
      include: {
        user: true,
      }
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status !== 'PENDING_PAYMENT' && order.paymentStatus !== 'PENDING') {
      throw new AppError('Order is not in a pending payment state', 400);
    }

    if (order.paymentMethod !== 'CASHFREE') {
      throw new AppError('Order payment method is not Cashfree', 400);
    }

    // Use CashfreeService to generate a new session
    const { CashfreeService } = require('./cashfreeService');
    const cashfreeSession = await CashfreeService.createOrderSession({
      orderId: order.id,
      amount: Number(order.paymentAmount),
      customerId: order.userId,
      customerPhone: order.user.phone || '9999999999',
      customerEmail: order.user.email,
    });

    // Record the new attempt in the database
    await prisma.paymentAttempt.create({
      data: {
        orderId: order.id,
        provider: 'CASHFREE',
        providerOrderId: cashfreeSession.cfOrderId.toString(),
        amount: order.paymentAmount,
        status: 'PENDING',
      },
    });

    return {
      payment_session_id: cashfreeSession.paymentSessionId,
      order_id: order.id,
      cf_order_id: cashfreeSession.cfOrderId.toString()
    };
  }
}
