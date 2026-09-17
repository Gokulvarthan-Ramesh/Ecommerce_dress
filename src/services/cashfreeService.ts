import { ENV } from '../config/env';
import { CASHFREE_BASE_URL } from '../config/cashfree';
import { AppError } from '../middleware/errorHandler';

export interface CreateCashfreeOrderParams {
  orderId: string;
  orderAmount: number;
  orderCurrency?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl?: string;
  notifyUrl?: string;
}

export class CashfreeService {
  private static getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-client-id': (process.env.CASHFREE_APP_ID || ENV.CASHFREE.APP_ID || '').trim(),
      'x-client-secret': (process.env.CASHFREE_SECRET_KEY || ENV.CASHFREE.SECRET_KEY || '').trim(),
      'x-api-version': (process.env.CASHFREE_API_VERSION || ENV.CASHFREE.API_VERSION || '2023-08-01').trim(),
    };
  }

  /**
   * Create an order on Cashfree and receive a payment_session_id
   */
  static async createOrderSession(params: CreateCashfreeOrderParams) {
    const {
      orderId,
      orderAmount,
      orderCurrency = 'INR',
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      returnUrl,
      notifyUrl,
    } = params;

    // Cashfree requires 10-digit Indian phone number format
    const cleanedPhone = customerPhone.replace(/\D/g, '').slice(-10);

    const payload = {
      order_id: orderId,
      order_amount: Number(orderAmount.toFixed(2)),
      order_currency: orderCurrency,
      customer_details: {
        customer_id: customerId,
        customer_name: customerName || 'Valued Customer',
        customer_email: customerEmail,
        customer_phone: cleanedPhone || '9999999999',
      },
      order_meta: {
        return_url: returnUrl || `${ENV.API_BASE_URL}/api/v1/orders/return?order_id={order_id}`,
        notify_url: notifyUrl || `${ENV.API_BASE_URL}/api/v1/webhooks/cashfree`,
      },
    };

    try {
      const response = await fetch(`${CASHFREE_BASE_URL}/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        console.error('[CASHFREE CREATE ORDER ERROR]:', data);
        throw new AppError(
          data.message || 'Cashfree payment gateway order creation failed',
          response.status
        );
      }

      return {
        cfOrderId: data.cf_order_id,
        orderId: data.order_id,
        paymentSessionId: data.payment_session_id,
        orderStatus: data.order_status,
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.error('[CASHFREE CONNECTION ERROR]:', error);
      throw new AppError('Unable to connect to Cashfree payment gateway');
    }
  }

  /**
   * Fetch payment details for an order
   */
  static async getOrderPayments(orderId: string) {
    try {
      const response = await fetch(`${CASHFREE_BASE_URL}/orders/${orderId}/payments`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = (await response.json()) as any;
      if (!response.ok) {
        throw new AppError(data.message || 'Failed to fetch Cashfree payments', response.status);
      }

      return data;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error checking Cashfree order payments');
    }
  }

  /**
   * Initiate a refund for an order via Cashfree
   */
  static async initiateRefund(params: {
    orderId: string;
    refundAmount: number;
    refundId: string;
    refundNote?: string;
  }) {
    const { orderId, refundAmount, refundId, refundNote = 'Customer refund request' } = params;

    const payload = {
      refund_amount: Number(refundAmount.toFixed(2)),
      refund_id: refundId,
      refund_note: refundNote,
    };

    try {
      const response = await fetch(`${CASHFREE_BASE_URL}/orders/${orderId}/refunds`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as any;
      if (!response.ok) {
        console.error('[CASHFREE REFUND ERROR]:', data);
        throw new AppError(data.message || 'Failed to initiate Cashfree refund', response.status);
      }

      return {
        cfRefundId: data.cf_refund_id,
        refundId: data.refund_id,
        status: data.refund_status,
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Cashfree refund processing failed');
    }
  }
}
