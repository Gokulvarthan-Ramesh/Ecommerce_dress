import { prisma } from '../config/db';

export type NotificationType =
  | 'ORDER_CONFIRMED'
  | 'PAYMENT_SUCCESS'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'REFUND_INITIATED'
  | 'REFUND_COMPLETED'
  | 'REFERRAL_REWARD'
  | 'WALLET_CREDIT'
  | 'ORDER_CANCELLED';

export class NotificationService {
  /**
   * Create an in-app notification for a user
   */
  static async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
  }) {
    return prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
      },
    });
  }

  /**
   * Get all notifications for a user
   */
  static async getByUserId(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(userId: string, notificationId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Get unread count for badge display
   */
  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // -- Lifecycle helpers --------------------------

  static async orderConfirmed(userId: string, orderNumber: string) {
    return this.create({
      userId,
      type: 'ORDER_CONFIRMED',
      title: 'Order Confirmed',
      message: 'Your order ' + orderNumber + ' has been confirmed and is being processed.',
    });
  }

  static async paymentSuccess(userId: string, orderNumber: string) {
    return this.create({
      userId,
      type: 'PAYMENT_SUCCESS',
      title: 'Payment Successful',
      message: 'Payment for order ' + orderNumber + ' was successful.',
    });
  }

  static async orderShipped(userId: string, orderNumber: string) {
    return this.create({
      userId,
      type: 'ORDER_SHIPPED',
      title: 'Order Shipped',
      message: 'Your order ' + orderNumber + ' has been shipped and is on its way!',
    });
  }

  static async orderDelivered(userId: string, orderNumber: string) {
    return this.create({
      userId,
      type: 'ORDER_DELIVERED',
      title: 'Order Delivered',
      message: 'Your order ' + orderNumber + ' has been delivered. Enjoy!',
    });
  }

  static async refundInitiated(userId: string, orderNumber: string, amount: number) {
    return this.create({
      userId,
      type: 'REFUND_INITIATED',
      title: 'Refund Initiated',
      message: 'A refund of Rs.' + amount + ' for order ' + orderNumber + ' has been initiated.',
    });
  }

  static async refundCompleted(userId: string, orderNumber: string, amount: number) {
    return this.create({
      userId,
      type: 'REFUND_COMPLETED',
      title: 'Refund Completed',
      message: 'Your refund of Rs.' + amount + ' for order ' + orderNumber + ' has been processed.',
    });
  }

  static async referralRewardCredited(userId: string, amount: number) {
    return this.create({
      userId,
      type: 'REFERRAL_REWARD',
      title: 'Referral Reward Credited',
      message: 'Rs.' + amount + ' has been credited to your wallet as a referral reward!',
    });
  }

  static async orderCancelled(userId: string, orderNumber: string) {
    return this.create({
      userId,
      type: 'ORDER_CANCELLED',
      title: 'Order Cancelled',
      message: 'Your order ' + orderNumber + ' has been cancelled. Any payments have been refunded.',
    });
  }
}

