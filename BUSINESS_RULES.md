# BUSINESS RULES & OPERATIONAL POLICIES

This document defines the core business model, customer policies, operational parameters, and configurable system rules for the e-commerce platform.

---

## 1. Business Identity & Support

| Field | Value / Configuration |
| :--- | :--- |
| **Business Name** | `[Your Business Name]` *(e.g., Nexus Retail / TrendVault)* |
| **Owners / Legal Entity** | `[Founder 1 & Founder 2 / Entity Name]` |
| **Registered Business Address** | `[Your Business Physical Address, City, State, PIN]` |
| **Customer Support Phone** | `+91 [Support Phone Number]` |
| **Customer Support Email** | `support@[yourdomain].com` |
| **Operating Hours** | Monday - Saturday: 09:00 AM - 07:00 PM IST |

---

## 2. Customer Onboarding & Authentication (WhatsApp-First)

To maximize conversion and minimize friction for Indian mobile shoppers, the system uses a **WhatsApp-First passwordless registration & login**:

| Field | Description / Business Rule |
| :--- | :--- |
| **Registration Fields** | **Full Name**, **WhatsApp Number**, and **WhatsApp OTP** (6 digits). |
| **Optional Fields** | Referral Code (instant ₹50 wallet credit if provided). |
| **OTP Validity** | **5 minutes** (300 seconds). |
| **Resend Cooldown** | **60 seconds** to prevent spam / abuse. |
| **Max Attempts** | 5 incorrect attempts before OTP invalidation. |
| **Returning Users** | Passwordless login by entering WhatsApp number + WhatsApp OTP. |
| **Developer Mode** | Automatically simulates OTP in terminal logs when live WhatsApp API tokens are omitted. |

---

## 3. Customer Policies (Return, Cancellation & Refund)

### Return Policy
- **Eligible Window**: Within **7 days** of verified delivery date.
- **Conditions**: Items must be unused, unwashed, with original tags intact and in original packaging.
- **Non-Returnable Items**: Intimate apparel / undergarments, face masks, final clearance sale items (unless damaged/defective on arrival).
- **Reverse Pickup**: Scheduled within 48-72 hours of return approval. If reverse pickup is unavailable for the customer's pincode, self-ship reimbursement is provided up to ₹100.

### Cancellation Policy
- **Customer Cancellation Window**: Allowed anytime **before the order status reaches `SHIPPED` / `DISPATCHED`**.
- **Post-Dispatch**: Once dispatched, orders cannot be cancelled directly; customers must refuse delivery or initiate a return post-delivery.
- **Admin Cancellation**: Admins reserve the right to cancel orders due to stock discrepancies, pricing errors, or detected fraud/abuse.

### Refund Policy
- **Refund Initiation**: Triggered within 24 hours of:
  - Order cancellation (instant trigger).
  - Returned item passing quality check at fulfillment hub.
- **Refund Methods**:
  - **Prepaid (Cashfree Gateway)**: Refunded directly to the original payment source (UPI / Bank Account / Card) via Cashfree Refund API. Credited within **3-5 business days** depending on customer's bank.
  - **COD Orders**: Refunded to the customer's **Store Wallet** instantly or to bank account via Cashfree Payout / NEFT upon customer providing bank account/UPI details.
  - **Wallet Payments**: Instantly re-credited to customer's in-app Wallet.

---

## 4. Shipping & Delivery Rules

| Parameter | Configuration |
| :--- | :--- |
| **Delivery Areas** | Pan-India (All serviceable postal PIN codes via partner logistics) |
| **Standard Delivery Charge** | ₹50 flat fee on orders below ₹999 |
| **Free Delivery Threshold** | Orders with subtotal **₹999 and above** qualify for Free Delivery |
| **Estimated Delivery Time** | Metros: 2-4 business days; Rest of India: 4-7 business days |

*(Note: Delivery charges and free delivery threshold are admin-configurable via the System Settings table).*

---

## 5. Payment Gateway & Payment Methods

| Parameter | Configuration |
| :--- | :--- |
| **Payment Gateway** | **Cashfree Payments** (PG API v2023-08-01+) |
| **Supported Methods** | UPI (GPay, PhonePe, Paytm, BHIM), Credit/Debit Cards (Visa, MasterCard, RuPay), Netbanking (50+ banks), Cashfree PayLater / Wallets |
| **Webhook Security** | **Mandatory HMAC-SHA256 signature verification** on `x-webhook-timestamp` + `rawBody` using Cashfree Client Secret before updating payment state. |
| **Cash on Delivery (COD)** | **YES** (Admin toggleable globally or per customer/pincode) |
| **COD Convenience Fee** | ₹0 (or optional admin-configured ₹40 fee to offset RTO risks) |

---

## 6. First-Order Offer Rules

Designed to maximize initial user conversion while protecting unit economics against multi-account fraud.

| Rule Parameter | Current Production Value | Admin Configurable? |
| :--- | :--- | :--- |
| **Offer Name** | `WELCOME300` / Automatic First Order Discount | Yes |
| **First Order Discount** | **₹300** flat discount | **YES** (Can be modified via Admin Panel) |
| **Minimum Order Value (MOV)** | **₹1,000** cart subtotal (excluding shipping/taxes) | **YES** (Can be modified via Admin Panel) |
| **Eligibility Scope** | First order placed by the account only | Yes (System checks for `orders.count == 0` for customer ID & verified phone) |
| **Combination Rules** | Cannot be stacked with other promotional promo codes | Yes |
| **Cancellation Reversal** | If first order is cancelled before fulfillment, eligibility is restored | Yes |
| **Admin Controlled Toggle** | **YES** (Global enable/disable switch in Admin Panel) | **YES** |

---

## 7. Referral Program Rules

Incentivizes word-of-mouth growth with strict anti-abuse rules.

| Rule Parameter | Value | Admin Configurable? |
| :--- | :--- | :--- |
| **Referrer Bonus** | **₹100** credited to in-app Wallet | **YES** |
| **New Customer (Referee) Bonus**| **₹50** credited to in-app Wallet upon registration | **YES** |
| **Minimum Qualifying Order** | **₹799** net order value | **YES** |
| **Reward Trigger Point** | **After Successful Delivery** (`status = DELIVERED`) + Return window expiry or 24h grace | **YES** |
| **Anti-Fraud Protections** | • Self-referral prohibited (same device ID, IP, or phone matching).<br>• Reward cancelled if qualifying order is returned or cancelled.<br>• Max 20 successful referral rewards per user per month. | Yes |

---

## 8. In-App Wallet Rules

The wallet represents internal store credit and maintains an append-only double-entry transaction ledger.

| Rule Parameter | Value | Admin Configurable? |
| :--- | :--- | :--- |
| **Redemption Mode** | Use as partial/full payment at checkout | Yes |
| **Maximum Wallet Usage Per Order** | Up to **50%** of cart payable amount (or 100% up to balance) | **YES** |
| **Cash Withdrawal** | **NO** (Store credit only; non-transferable to external bank accounts) | Enforced |
| **Expiration Policy** | Referral bonus expires in 90 days; Refund credits never expire | **YES** |
| **Admin Manual Adjustments** | Allowed with mandatory reason log (e.g., customer appeasement, manual compensation) | Yes |

---

## 9. Dynamic Configuration Architecture (No Hard-Coding)

To ensure neither owners nor developers have to edit code or redeploy to alter business numbers, all settings are initialized and maintained in the PostgreSQL database table `system_settings`:

```json
{
  "first_order_offer": {
    "is_enabled": true,
    "discount_amount": 300,
    "min_order_value": 1000
  },
  "referral_program": {
    "is_enabled": true,
    "referrer_bonus": 100,
    "referee_bonus": 50,
    "min_qualifying_order": 799,
    "reward_on_status": "DELIVERED"
  },
  "shipping": {
    "standard_delivery_fee": 50,
    "free_delivery_threshold": 999
  },
  "payments": {
    "cod_enabled": true,
    "cod_fee": 0,
    "cashfree_enabled": true
  },
  "wallet": {
    "max_order_redemption_percent": 50
  }
}
```

Any changes made by admins through the **Admin Dashboard** take effect immediately across the backend calculations and the customer app.
