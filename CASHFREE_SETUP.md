# Cashfree Merchant Onboarding & Security Architecture

---

## 1. Golden Security Rule: Zero Secret Leakage

```
                                  CORRECT ARCHITECTURE
  ┌────────────────────────┐                   ┌────────────────────────┐                   ┌────────────────────────┐
  │      React Native      │                   │      Node.js API       │                   │   Cashfree Gateway     │
  │      Customer App      │                   │      Backend           │                   │                        │
  └───────────┬────────────┘                   └───────────┬────────────┘                   └───────────┬────────────┘
              │                                            │                                            │
              │ 1. POST /api/v1/orders/create              │                                            │
              │───────────────────────────────────────────>│                                            │
              │                                            │ 2. POST /pg/orders                         │
              │                                            │    (Sends App ID + Client Secret)          │
              │                                            │───────────────────────────────────────────>│
              │                                            │                                            │
              │                                            │ 3. Returns payment_session_id              │
              │                                            │<───────────────────────────────────────────│
              │ 4. Returns payment_session_id ONLY         │                                            │
              │<───────────────────────────────────────────│                                            │
              │                                                                                         │
              │ 5. Opens Cashfree Mobile SDK / Dropin (Passes payment_session_id ONLY)                  │
              │────────────────────────────────────────────────────────────────────────────────────────>│
              │                                                                                         │
              │ 6. Customer completes UPI / Card / Netbanking payment                                   │
              │                                            │                                            │
              │                                            │ 7. POST /api/v1/webhooks/cashfree          │
              │                                            │    (Header: x-webhook-signature)           │
              │                                            │<───────────────────────────────────────────│
              │                                            │                                            │
              │                                            │ 8. Verifies HMAC-SHA256 signature          │
              │                                            │    Updates Order to PAID & Deducts Stock   │
              │                                            │                                            │
```

> [!CAUTION]
> **NEVER put Cashfree Client Secret in React Native or Frontend Code!**
> 
> • If the Client Secret is embedded inside the mobile app APK or React Native bundle, any user can decompile the app, extract the secret, and drain or manipulate your merchant account.<br>
> • The Client Secret MUST strictly stay on your secure Node.js backend inside environment variables (`.env`).<br>
> • The mobile app only ever receives the temporary `payment_session_id`, which is valid only for that single order.

---

## 2. Cashfree Merchant Onboarding & KYC Checklist

Before accepting live money from real customers, Cashfree requires business onboarding and KYC document verification.

### A. Business Information Needed
1. **Business Type**:
   - Individual / Proprietorship
   - Partnership
   - Limited Liability Partnership (LLP)
   - Private Limited Company (Pvt Ltd)
2. **Business Category & Sub-Category**: E-Commerce / Retail / Apparels & Fashion.
3. **Registered Business Name & Trade Name**: As defined in [BUSINESS_RULES.md](file:///d:/Ecommerce/api/BUSINESS_RULES.md).
4. **GSTIN Number** (if registered; mandatory for certain turnovers or interstate goods).
5. **Business Bank Account**: Cancelled cheque or bank statement matching the legal business entity name.

### B. Required Documents by Business Structure

| Business Structure | Required Verification Documents |
| :--- | :--- |
| **Sole Proprietorship / Individual** | • Owner's PAN Card<br>• Owner's Aadhaar / Passport / Voter ID<br>• Business address proof (Utility bill, Rent agreement, or Shop Act license)<br>• Cancelled cheque or bank statement with account holder name |
| **Partnership Firm** | • Partnership Deed<br>• Partnership PAN Card<br>• Registration Certificate (if registered)<br>• All Partners' PAN & Address Proof<br>• Firm's Bank Account Cancelled Cheque |
| **Pvt Ltd / LLP** | • Certificate of Incorporation (COI)<br>• Company / LLP PAN Card<br>• MOA & AOA / LLP Agreement<br>• Board Resolution or Authorized Signatory Letter<br>• Directors' PAN & Aadhaar Cards<br>• Company Bank Account Cancelled Cheque |

---

## 3. Mandatory Website / App Policy Pages

Cashfree's compliance team reviews your store website or app before activating production gateway access. Your platform must have public, easily accessible pages for:

1. **Contact Us**: Official legal name, physical business address, support phone, and support email (specified in `BUSINESS_RULES.md`).
2. **Terms & Conditions**: User eligibility, purchase terms, and intellectual property.
3. **Privacy Policy**: How user data, phone numbers, and payment details are handled.
4. **Return & Refund Policy**: Detailed return window (7 days), reverse pickup SLA, and refund timeline (3-5 business days) (specified in `BUSINESS_RULES.md`).
5. **Shipping & Cancellation Policy**: Delivery timelines (2-7 days), shipping fees, and pre-dispatch cancellation rules.

*(All of these policies have already been formulated in [BUSINESS_RULES.md](file:///d:/Ecommerce/api/BUSINESS_RULES.md) so you can directly copy them to your store's legal pages).*

---

## 4. Test (Sandbox) vs Production Credentials

| Environment | Dashboard URL | API Base URL | Where to Configure |
| :--- | :--- | :--- | :--- |
| **Sandbox / Test** | `https://merchant.cashfree.com/merchants/login` (Test Mode toggle) | `https://sandbox.cashfree.com/pg` | Set `CASHFREE_ENV="SANDBOX"` in `.env` |
| **Production / Live** | `https://merchant.cashfree.com/merchants/login` (Live Mode) | `https://api.cashfree.com/pg` | Set `CASHFREE_ENV="PRODUCTION"` in `.env` |

In `.env`:
```env
CASHFREE_APP_ID="<YOUR_APP_ID>"
CASHFREE_SECRET_KEY="<YOUR_SECRET_KEY>"
CASHFREE_ENV="SANDBOX"
CASHFREE_API_VERSION="2023-08-01"
```
