import { prisma } from '../config/db';



export interface ReferralProgramConfig {
  is_enabled: boolean;
  referrer_bonus: number;
  referee_bonus: number;
  min_qualifying_order: number;
  reward_on_status: string;
}

export interface ShippingConfig {
  standard_delivery_fee: number;
  free_delivery_threshold: number;
}

export interface PaymentsConfig {
  cod_enabled: boolean;
  cod_fee: number;
  cashfree_enabled: boolean;
}

export interface WalletConfig {
  max_order_redemption_percent: number;
}

export class SystemSettingService {
  /**
   * Fetch setting by key with fallback defaults
   */
  static async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key },
      });
      if (setting && setting.value) {
        return setting.value as T;
      }
      return defaultValue;
    } catch (error) {
      console.error(`Error fetching system setting ${key}:`, error);
      return defaultValue;
    }
  }



  static async getReferralProgramConfig(): Promise<ReferralProgramConfig> {
    return this.getSetting<ReferralProgramConfig>('referral_program', {
      is_enabled: true,
      referrer_bonus: 100,
      referee_bonus: 50,
      min_qualifying_order: 799,
      reward_on_status: 'DELIVERED',
    });
  }

  static async getShippingConfig(): Promise<ShippingConfig> {
    return this.getSetting<ShippingConfig>('shipping', {
      standard_delivery_fee: 50,
      free_delivery_threshold: 999,
    });
  }

  static async getPaymentsConfig(): Promise<PaymentsConfig> {
    return this.getSetting<PaymentsConfig>('payments', {
      cod_enabled: true,
      cod_fee: 0,
      cashfree_enabled: true,
    });
  }

  static async getWalletConfig(): Promise<WalletConfig> {
    return this.getSetting<WalletConfig>('wallet', {
      max_order_redemption_percent: 50,
    });
  }

  static async updateSetting(key: string, value: any, description?: string) {
    return prisma.systemSetting.upsert({
      where: { key },
      update: { value, ...(description && { description }) },
      create: { key, value, description },
    });
  }

  static async getAllSettings() {
    return prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }
}
