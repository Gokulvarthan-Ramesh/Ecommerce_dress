import { prisma } from '../config/db';



export interface StoreConfig {
  name: string;
  tagline?: string;
  logo_url?: string;
  support_phone: string;
  support_whatsapp: string;
  support_email: string;
  operating_hours: string;
  return_window_days: number;
  currency: string;
  currency_symbol: string;
  estimated_delivery_days: string;
  terms_url?: string;
  privacy_url?: string;
  about_us?: string;
}

export interface FirstOrderOfferConfig {
  is_enabled: boolean;
  discount_amount: number;
  min_order_value: number;
}

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

export interface AnnouncementBarConfig {
  is_enabled: boolean;
  text: string;
  text_color: string;
  background_color: string;
  target_url?: string;
}

export interface TrustBadgeItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
}

export interface SocialLinksConfig {
  instagram: string;
  whatsapp: string;
  facebook: string;
  youtube: string;
  twitter?: string;
}

export interface LegalPoliciesConfig {
  terms_and_conditions: string;
  privacy_policy: string;
  return_and_refund_policy: string;
  shipping_policy: string;
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface SizeGuideItem {
  category: string;
  title: string;
  unit: string;
  columns: string[];
  rows: Array<Record<string, string | number>>;
}

export interface CartPromptsConfig {
  free_shipping_prompt_template: string;
  free_shipping_unlocked_message: string;
  cod_threshold_notice: string;
  secure_checkout_badge_text: string;
}

export interface ThemeConfig {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  font_family: string;
  border_radius: string;
  dark_mode_enabled: boolean;
}

export interface NavigationConfig {
  header_tabs: Array<{
    id: string;
    label: string;
    path: string;
    icon?: string;
    badge_text?: string;
    badge_color?: string;
    is_highlight?: boolean;
  }>;
  footer_columns: Array<{
    title: string;
    links: Array<{ label: string; path: string }>;
  }>;
}

export interface TestimonialItem {
  id: string;
  name: string;
  rating: number;
  comment: string;
  location: string;
  verified_buyer: boolean;
  avatar_url?: string;
  date?: string;
}

export interface OrderReasonsConfig {
  cancellation_reasons: string[];
  return_reasons: string[];
}

export interface PincodeServiceabilityConfig {
  default_delivery_days: string;
  cod_available_all_india: boolean;
  metro_delivery_days: string;
  express_pincodes: string[];
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

  static async getStoreConfig(): Promise<StoreConfig> {
    return this.getSetting<StoreConfig>('store', {
      name: 'DecodeX Fashion Store',
      tagline: 'Modern & Premium Fashion Wear',
      logo_url: '',
      support_phone: '+91 7540032060',
      support_whatsapp: '+91 7540032060',
      support_email: 'support@decodex.com',
      operating_hours: 'Mon - Sat: 09:00 AM - 07:00 PM IST',
      return_window_days: 7,
      currency: 'INR',
      currency_symbol: '₹',
      estimated_delivery_days: '2-5 Business Days',
      terms_url: '/terms-and-conditions',
      privacy_url: '/privacy-policy',
      about_us: 'DecodeX brings you trendsetting apparel with exceptional comfort, premium fabrics, and unbeatable prices.',
    });
  }

  static async getFirstOrderOfferConfig(): Promise<FirstOrderOfferConfig> {
    return this.getSetting<FirstOrderOfferConfig>('first_order_offer', {
      is_enabled: true,
      discount_amount: 300,
      min_order_value: 1000,
    });
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

  static async getReferralConfig(): Promise<ReferralProgramConfig> {
    return this.getReferralProgramConfig();
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

  static async getAnnouncementBarConfig(): Promise<AnnouncementBarConfig> {
    return this.getSetting<AnnouncementBarConfig>('announcement_bar', {
      is_enabled: true,
      text: '🎉 Mega Festive Season Sale is Live! Flat ₹300 OFF on First Order | Free Delivery Above ₹999',
      text_color: '#ffffff',
      background_color: '#0f172a',
      target_url: '/category/men',
    });
  }

  static async getTrustBadgesConfig(): Promise<TrustBadgeItem[]> {
    return this.getSetting<TrustBadgeItem[]>('trust_badges', [
      { id: '1', icon: 'shield-check', title: '100% Authentic Quality', subtitle: 'Handcrafted with premium certified fabrics' },
      { id: '2', icon: 'rotate-ccw', title: 'Easy 7-Day Returns', subtitle: 'Hassle-free doorstep pickup & quick refund' },
      { id: '3', icon: 'truck', title: 'Express Fast Delivery', subtitle: 'Dispatched within 24 hours across India' },
      { id: '4', icon: 'lock', title: '100% Secure Checkout', subtitle: 'Encrypted UPI, Cards & NetBanking payments' },
    ]);
  }

  static async getSocialLinksConfig(): Promise<SocialLinksConfig> {
    return this.getSetting<SocialLinksConfig>('social_links', {
      instagram: 'https://instagram.com/decodex_fashion',
      whatsapp: 'https://wa.me/917540032060',
      facebook: 'https://facebook.com/decodexfashion',
      youtube: 'https://youtube.com/@decodexfashion',
      twitter: '',
    });
  }

  static async getPoliciesConfig(): Promise<LegalPoliciesConfig> {
    return this.getSetting<LegalPoliciesConfig>('policies', {
      terms_and_conditions: 'Welcome to DecodeX Fashion Store. By browsing or purchasing through our store, you agree to our terms of service...',
      privacy_policy: 'We value your privacy. Your personal information, contact details, and payment credentials are encrypted and strictly protected...',
      return_and_refund_policy: 'We offer an easy return policy on unworn items with original tags within the policy window. Refunds are credited to original payment source or wallet...',
      shipping_policy: 'All orders are dispatched via reputed courier partners (BlueDart, Delhivery) within 24-48 hours. Tracking details are provided via WhatsApp and SMS...',
    });
  }

  static async getFaqsConfig(): Promise<FaqItem[]> {
    return this.getSetting<FaqItem[]>('faqs', [
      { id: '1', category: 'Orders & Tracking', question: 'How can I track my order?', answer: 'Once your order is shipped, you will receive tracking details via WhatsApp and SMS, and you can track it live in My Orders.' },
      { id: '2', category: 'Payments', question: 'What payment methods do you accept?', answer: 'We accept UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, Net Banking via Cashfree, and Cash on Delivery (COD).' },
      { id: '3', category: 'Returns & Exchanges', question: 'How do I request a return or exchange?', answer: 'Go to My Orders, select the delivered order, and click "Request Return" within the return window.' },
      { id: '4', category: 'Wallet & Referrals', question: 'How does the referral program work?', answer: 'Share your referral link with friends. When they place their first order and it gets delivered, you both earn cash in your store wallet!' },
    ]);
  }

  static async getSizeGuidesConfig(): Promise<SizeGuideItem[]> {
    return this.getSetting<SizeGuideItem[]>('size_guides', [
      {
        category: 'Men Tops',
        title: 'Men Shirts & T-Shirts Size Chart',
        unit: 'inches',
        columns: ['Size', 'Chest', 'Length', 'Shoulder'],
        rows: [
          { Size: 'S', Chest: '38', Length: '27.5', Shoulder: '16.5' },
          { Size: 'M', Chest: '40', Length: '28.5', Shoulder: '17.5' },
          { Size: 'L', Chest: '42', Length: '29.5', Shoulder: '18.5' },
          { Size: 'XL', Chest: '44', Length: '30.5', Shoulder: '19.5' },
          { Size: 'XXL', Chest: '46', Length: '31.5', Shoulder: '20.5' },
        ],
      },
      {
        category: 'Men Bottoms',
        title: 'Men Trousers & Jeans Size Chart',
        unit: 'inches',
        columns: ['Size', 'Waist', 'Length', 'Hip'],
        rows: [
          { Size: '30', Waist: '30', Length: '39', Hip: '38' },
          { Size: '32', Waist: '32', Length: '40', Hip: '40' },
          { Size: '34', Waist: '34', Length: '41', Hip: '42' },
          { Size: '36', Waist: '36', Length: '41.5', Hip: '44' },
        ],
      },
    ]);
  }

  static async getCartPromptsConfig(): Promise<CartPromptsConfig> {
    return this.getSetting<CartPromptsConfig>('cart_prompts', {
      free_shipping_prompt_template: 'Add items worth ₹{remaining} more for FREE Delivery!',
      free_shipping_unlocked_message: '🎉 Congratulations! You have unlocked FREE Delivery!',
      cod_threshold_notice: 'Cash on Delivery (COD) available across India. Pay via Cash or UPI at delivery.',
      secure_checkout_badge_text: '100% Safe & Encrypted Checkout with 256-bit SSL',
    });
  }

  static async getThemeConfig(): Promise<ThemeConfig> {
    return this.getSetting<ThemeConfig>('theme', {
      primary_color: '#0f172a',
      secondary_color: '#e11d48',
      accent_color: '#3b82f6',
      background_color: '#ffffff',
      font_family: 'Outfit, Inter, system-ui, sans-serif',
      border_radius: '10px',
      dark_mode_enabled: true,
    });
  }

  static async getNavigationConfig(): Promise<NavigationConfig> {
    return this.getSetting<NavigationConfig>('navigation', {
      header_tabs: [
        { id: '1', label: 'Men', path: '/category/men' },
        { id: '2', label: 'Women', path: '/category/women' },
        { id: '3', label: 'Kids', path: '/category/kids' },
        { id: '4', label: 'New Arrivals', path: '/products?sort=newest', badge_text: 'NEW', badge_color: '#10b981' },
        { id: '5', label: 'Sale', path: '/products?onSale=true', badge_text: '50% OFF', badge_color: '#ef4444', is_highlight: true },
      ],
      footer_columns: [
        {
          title: 'Shop',
          links: [
            { label: 'Men Fashion', path: '/category/men' },
            { label: 'Women Fashion', path: '/category/women' },
            { label: 'Kids Wear', path: '/category/kids' },
            { label: 'Festive Offers', path: '/offers' },
          ],
        },
        {
          title: 'Customer Care',
          links: [
            { label: 'Track Order', path: '/my-orders' },
            { label: 'Returns & Exchange', path: '/returns' },
            { label: 'Shipping Policy', path: '/shipping-policy' },
            { label: 'FAQs & Help', path: '/faqs' },
          ],
        },
        {
          title: 'Company',
          links: [
            { label: 'About DecodeX', path: '/about' },
            { label: 'Terms & Conditions', path: '/terms' },
            { label: 'Privacy Policy', path: '/privacy' },
            { label: 'Contact Us', path: '/contact' },
          ],
        },
      ],
    });
  }

  static async getTestimonialsConfig(): Promise<TestimonialItem[]> {
    return this.getSetting<TestimonialItem[]>('testimonials', [
      {
        id: '1',
        name: 'Rahul Sharma',
        rating: 5,
        comment: 'The quality of the cotton shirts is mindblowing! Delivered in just 2 days in Bengaluru.',
        location: 'Bengaluru',
        verified_buyer: true,
        date: '2026-09-10',
      },
      {
        id: '2',
        name: 'Pooja Verma',
        rating: 5,
        comment: 'Super fast delivery and flawless fit. Loved the packaging and the ₹300 welcome discount!',
        location: 'Mumbai',
        verified_buyer: true,
        date: '2026-09-12',
      },
      {
        id: '3',
        name: 'Anand Kumar',
        rating: 5,
        comment: 'Doorstep exchange was so smooth. Highly recommend DecodeX to everyone.',
        location: 'Delhi NCR',
        verified_buyer: true,
        date: '2026-09-14',
      },
    ]);
  }

  static async getOrderReasonsConfig(): Promise<OrderReasonsConfig> {
    return this.getSetting<OrderReasonsConfig>('order_reasons', {
      cancellation_reasons: [
        'Ordered wrong size or color',
        'Found cheaper alternative elsewhere',
        'Delivery estimated time is too long',
        'Incorrect shipping address or phone provided',
        'Changed mind / no longer needed',
        'Placed by mistake',
        'Other',
      ],
      return_reasons: [
        'Size too small / tight',
        'Size too large / loose',
        'Fabric or color not as expected',
        'Received damaged or defective garment',
        'Wrong item or variant delivered',
        'Fit does not suit me',
        'Other',
      ],
    });
  }

  static async getPincodeServiceabilityConfig(): Promise<PincodeServiceabilityConfig> {
    return this.getSetting<PincodeServiceabilityConfig>('pincodes', {
      default_delivery_days: '3-5 Business Days',
      cod_available_all_india: true,
      metro_delivery_days: '1-2 Business Days',
      express_pincodes: ['560001', '560002', '400001', '110001', '600001', '500001', '700001'],
    });
  }

  static async updateSetting(key: string, value: any, description?: string) {
    return prisma.systemSetting.upsert({
      where: { key },
      update: { value, ...(description && { description }) },
      create: { key, value, description },
    });
  }

  static async deleteSetting(key: string) {
    return prisma.systemSetting.delete({
      where: { key },
    });
  }

  static async getAllSettings() {
    return prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }
}

