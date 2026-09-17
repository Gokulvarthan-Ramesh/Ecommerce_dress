import { ENV } from '../config/env';

export class WhatsAppService {
  /**
   * Format Indian phone number to international E.164 without plus: 919876543210
   */
  static formatWhatsAppNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }
    return cleaned;
  }

  /**
   * Send WhatsApp OTP
   */
  static async sendOtp(phone: string, otp: string): Promise<{ success: boolean; message: string; simulated?: boolean }> {
    const formattedNumber = this.formatWhatsAppNumber(phone);
    const messageText = `Your verification code for your E-Commerce account is *${otp}*. Valid for 5 minutes. Do not share this OTP with anyone.`;

    // Check if live WhatsApp API credentials are configured in ENV
    const metaToken = ENV.WHATSAPP.API_TOKEN || process.env.WHATSAPP_API_TOKEN;
    const metaPhoneId = ENV.WHATSAPP.PHONE_ID || process.env.WHATSAPP_PHONE_ID;
    const templateName = ENV.WHATSAPP.TEMPLATE_NAME || process.env.WHATSAPP_OTP_TEMPLATE;

    if (metaToken && metaPhoneId) {
      try {
        const payload = templateName
          ? {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: formattedNumber,
              type: 'template',
              template: {
                name: templateName,
                language: { code: 'en_US' },
                components: [
                  {
                    type: 'body',
                    parameters: [{ type: 'text', text: otp }],
                  },
                  {
                    type: 'button',
                    sub_type: 'url',
                    index: '0',
                    parameters: [{ type: 'text', text: otp }],
                  },
                ],
              },
            }
          : {
              messaging_product: 'whatsapp',
              to: formattedNumber,
              type: 'text',
              text: { body: messageText },
            };

        const response = await fetch(`https://graph.facebook.com/v18.0/${metaPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${metaToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json() as any;
        if (!response.ok) {
          console.error('[WHATSAPP API ERROR]:', data);
          return { success: false, message: data.error?.message || 'Failed to dispatch WhatsApp message' };
        }

        console.log(`[WHATSAPP OTP SENT LIVE] to +${formattedNumber}`);
        return { success: true, message: 'OTP sent to WhatsApp successfully' };
      } catch (err: any) {
        console.error('[WHATSAPP NETWORK ERROR]:', err);
        return { success: false, message: 'WhatsApp gateway network failure' };
      }
    }

    // DEVELOPMENT / TEST SIMULATION FALLBACK:
    // When no third-party WhatsApp gateway keys are added yet, log to console for development
    console.log('====================================================');
    console.log(`📲 [WHATSAPP OTP SIMULATOR]`);
    console.log(`📞 To: +${formattedNumber}`);
    console.log(`🔑 OTP Code: ${otp}`);
    console.log(`💬 Message: "${messageText}"`);
    console.log('====================================================');

    return {
      success: true,
      message: 'OTP sent via WhatsApp (Simulation mode)',
      simulated: true,
    };
  }
}
