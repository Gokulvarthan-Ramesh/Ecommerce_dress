# E-Commerce V1 Backend REST API

Production-ready Node.js & TypeScript REST API with PostgreSQL, Prisma ORM, Cashfree Payment Gateway, Multi-Variant Catalog Architecture, 3-Level Categorization, Dynamic First-Order Discounts, and Ledger-backed In-App Wallets.

---

## 🚀 Key Features

1. **Business Rules Driven (`BUSINESS_RULES.md`)**:
   - **First-Order Discount**: Auto-applied ₹300 off on ₹1,000+ orders for new accounts (`seed-offer-welcome300`, admin toggleable & configurable).
   - **Referral Program**: Double-sided reward (Referrer ₹100, Referee ₹50) triggered automatically upon successful delivery of qualifying order (₹799+).
   - **Dynamic System Settings**: Live business parameters (delivery fees, free delivery thresholds, COD toggle, wallet redemption limits) stored in PostgreSQL and editable on the fly without service redeployments.

2. **3-Level Catalog & Multi-Variant Inventory Matrix**:
   - **3-Level Deep Hierarchy**: Parent Categories (Level 1: Men, Women, Kids), Subcategories (Level 2), and specialized Sub-subcategories (Level 3, including 10 distinct T-Shirt styles, shirts, jeans, kurtis, dresses).
   - **Smart Category Inheritance**: Automatic `mainSlug` propagation (`men`, `women`, `kids`), breadcrumb generation, active status management with recursive cascade.
   - **Faceted Product Filter Engine**: Dynamic aggregation of categories, attributes (sizes, colors, fits, fabrics, sleeves, occasions), price distribution buckets, and sorting options.
   - **Concurrency-Safe Stock Reservation**: Immediate variant stock reservation with PostgreSQL row locking (`SELECT ... FOR UPDATE`) during checkout to prevent overselling.

3. **Cashfree Payments & HMAC-SHA256 Webhooks**:
   - **Pre-Checkout Calculation**: Accurate preview breakdown of subtotal, auto-applied welcome offers, promotional coupons, delivery charges, and wallet deductions.
   - **Dual Checkout Flow**: Native support for Cash on Delivery (`COD`) and Cashfree online payment gateway (`CASHFREE`) session generation.
   - **Tamper-Proof Webhooks**: Replay attack and spoof prevention via `x-webhook-timestamp` and `rawBody` HMAC-SHA256 verification against the merchant secret.
   - **Automated Fulfillment**: Order confirmation, inventory decrement, and customer cart clearing upon payment capture.
   - **Direct Refunds**: Trigger automated Cashfree refunds for cancelled pre-dispatch orders.

4. **In-App Customer Wallet & Double-Entry Ledger**:
   - Immutable double-entry ledger tracking all credits and debits (`REFERRAL`, `ORDER_PAYMENT`, `REFUND`, `ADMIN_ADJUSTMENT`).
   - Anti-fraud mechanisms: self-referral prevention, IP/device validation, and fulfillment delivery prerequisites.

---

## 📂 Project Structure

```
d:/Ecommerce/api/
├── prisma/                              # Database schema & modular seeders
│   ├── migrations/                      # Prisma database migrations
│   ├── schema.prisma                    # Relational PostgreSQL schema
│   ├── seed.ts                          # Master seeder orchestrator
│   └── seeders/                         # Modular domain seeders
│       ├── categories.seeder.ts         # 3-level catalog taxonomy
│       ├── coupons.seeder.ts            # Promotional coupon codes (SAVE10, etc.)
│       ├── offers.seeder.ts             # Auto-applied offers (WELCOME300)
│       ├── settings.seeder.ts           # Dynamic system settings
│       └── users.seeder.ts              # Admin & test customer accounts
├── src/                                 # Backend source code
│   ├── config/                          # Env, DB, Cashfree, Cloudinary configs
│   ├── constants/                       # Order statuses, roles, settings keys
│   ├── controllers/                     # API controllers (Auth, Category, Product, Cart, Order, Admin)
│   ├── middleware/                      # Auth, AdminGuard, Validation, Cashfree Webhook HMAC
│   ├── routes/                          # Express endpoint route definitions
│   ├── services/                        # Business logic (Checkout, Offers, Wallet, Cashfree)
│   ├── types/                           # TypeScript interfaces & API response types
│   ├── utils/                           # Helpers (phone formatting, currency, math)
│   ├── validators/                      # Zod request validation schemas
│   ├── app.ts                           # Express app configuration & middleware
│   └── server.ts                        # Server entry point
├── .env                                 # Local environment variables
├── .env.example                         # Environment variables template
├── .gitignore                           # Git ignore specifications
├── BUSINESS_RULES.md                    # Business policies, ₹300 offer, referral rules
├── CASHFREE_SETUP.md                    # Cashfree merchant onboarding & security guide
├── ecommerce_postman_collection.json    # Complete Postman API collection
├── package.json                         # Node.js dependencies and scripts
├── README.md                            # Project documentation
└── tsconfig.json                        # TypeScript compiler configuration
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL (v14+ running locally or in cloud)
- npm or yarn

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your PostgreSQL and Cashfree credentials:
```bash
cp .env.example .env
```

Key environment parameters:
```env
PORT=5000
DATABASE_URL="postgresql://username:password@localhost:5432/ecommerce_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
CASHFREE_APP_ID="your_cashfree_app_id"
CASHFREE_SECRET_KEY="your_cashfree_secret_key"
CASHFREE_ENV="TEST"
```

### 3. Database Migration & Modular Seeding
Generate Prisma Client and run migrations:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

#### Run All Seeders (Master Seed):
```bash
npx tsx prisma/seed.ts
```

#### Or Run Modular Seeders Independently:
```bash
# Seed dynamic system settings
npx tsx prisma/seeders/settings.seeder.ts

# Seed admin & test users
npx tsx prisma/seeders/users.seeder.ts

# Seed 3-level categories & subcategories
npx tsx prisma/seeders/categories.seeder.ts

# Seed auto-applied offers (WELCOME300)
npx tsx prisma/seeders/offers.seeder.ts

# Seed promotional coupons
npx tsx prisma/seeders/coupons.seeder.ts
```

### 4. Start Development Server
```bash
npm run dev
```
Server starts at: `http://localhost:5000`  
Health check endpoint: `http://localhost:5000/health`

---

## 📡 API Endpoints Reference

### 🔐 Authentication (`/api/v1/auth`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/send-otp` | Public | Send 6-digit WhatsApp OTP to phone (60s cooldown) |
| `POST` | `/register` | Public | Register customer with phone, OTP, password, name, email & optional referral code |
| `POST` | `/login` | Public | Login with identifier (phone or email) and password. Works for both Customer and Admin |
| `GET` | `/profile` | Bearer | Get authenticated user profile, wallet balance, and referral stats |

### 🏷️ Categories (`/api/v1/categories`)
| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | `?tree=true` | Returns hierarchical nested category tree (3 levels: Parents -> Subcategories -> Sub-subcategories) |
| `GET` | `/` | `?level=1` | Filter by category depth (Level 1 Parents, Level 2 Subcategories, Level 3 Sub-subcategories) |
| `GET` | `/` | `?mainSlug=men` | Filter categories belonging to a main section (`men`, `women`, or `kids`) |
| `GET` | `/` | `?activeOnly=true` | Filter only currently active categories |
| `GET` | `/:identifier` | — | Get single category by ID or slug with breadcrumbs and parent info |

### 🛍️ Products & Filtering (`/api/v1/products`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/filters` | Returns dynamic faceted filters: available categories grouped by `mainCategory`, attributes (size, color, fit, fabric, sleeve, occasion), price distribution buckets, and sorting options |
| `GET` | `/` | Search, filter (by `category`, `sizes`, `colors`, `fits`, `fabrics`, `minPrice`, `maxPrice`), sort (`price_asc`, `price_desc`, `newest`), and paginate products |
| `GET` | `/:identifier` | Single product details with full size/color variant matrix, pricing, and stock status |

### 🛒 Shopping Cart (`/api/v1/cart`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Bearer | Get customer's cart with live variant pricing and stock validation |
| `POST` | `/add` | Bearer | Add product variant to cart (`variantId`, `quantity`) |
| `PATCH` | `/items/:id` | Bearer | Update quantity of a cart item |
| `DELETE` | `/items/:id` | Bearer | Remove item from cart |

### 📦 Checkout & Orders (`/api/v1/orders`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/preview` | Bearer | Calculate pre-checkout totals: subtotal, auto-applied welcome offer (₹300), coupon discounts, delivery fees, wallet deductions, and final payable |
| `POST` | `/checkout` | Bearer | Place order (`COD` or `CASHFREE`). Performs address normalization, concurrency row-locking (`SELECT FOR UPDATE`), reserves variant stock, and clears cart |
| `GET` | `/` | Bearer | List order history for authenticated user |
| `GET` | `/:id` | Bearer | Get order details, item snapshots, status history, and tracking info |
| `POST` | `/:id/cancel` | Bearer | Cancel order prior to dispatch & trigger automated refund/wallet reversal |

### 💰 Wallet & Referrals (`/api/v1/wallet`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Bearer | Get current wallet balance and ledger transaction history |
| `GET` | `/referrals` | Bearer | Referral statistics, referral code, and invited friends list |

### 🔔 Payment Webhooks (`/api/v1/webhooks`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/cashfree` | Authenticated webhook endpoint for Cashfree payment events (HMAC-SHA256 signature verification) |

---

## 🛡️ Admin Panel API (`/api/v1/admin`)

*All admin endpoints require an administrative JWT (`role: "ADMIN"`).*

### Default Seeded Admin Credentials:
- **Email**: `admin@ecommerce.com`
- **Phone**: `9999999999`
- **Password**: `Admin@12345`

| Domain | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/login` | Login as administrator; saves token to `{{adminToken}}` in Postman |
| **KPIs** | `GET` | `/admin/metrics` | Dashboard stats: today's sales, total orders, customers, active products, low stock, status breakdown |
| **Customers** | `GET` | `/admin/customers/:id` | Detailed customer profile, lifetime value, referral count, and order history |
| **Catalog** | `POST` | `/admin/categories` | Create or update category with parent assignment, image, and sort order |
| **Catalog** | `PATCH` | `/admin/categories/:id/status` | Toggle category active status (supports `cascade: true` to propagate to children) |
| **Catalog** | `DELETE` | `/admin/categories/:id` | Delete unused category |
| **Products** | `POST` | `/admin/products` | Create/update product with multi-attribute variant matrix (SKUs, sizes, colors, stock, pricing) |
| **Inventory**| `PATCH` | `/admin/variants/:variantId/stock` | Quick stock quantity adjustment for a specific variant |
| **Orders** | `GET` | `/admin/orders` | Filter and list all customer orders across the platform |
| **Orders** | `GET` | `/admin/orders/:id` | Full order inspection with item breakdown and customer address snapshot |
| **Orders** | `PATCH` | `/admin/orders/:id/status` | Update fulfillment status (`CONFIRMED`, `SHIPPED`, `DELIVERED` - triggers referral bonus, `CANCELLED`) |
| **Refunds** | `POST` | `/admin/refunds` | Initiate instant Cashfree refund for an order |
| **Wallet** | `POST` | `/admin/wallet/adjust` | Credit or debit customer wallet balance with custom audit reason |
| **Settings**| `GET` | `/admin/settings` | Retrieve all live system settings |
| **Settings**| `PUT` | `/admin/settings/:key` | Update live settings (`first_order_offer`, `referral_program`, `shipping`, `payments`, `wallet`) |
| **Offers** | `GET` | `/admin/offers` | List all promotional coupons and offers |
| **Offers** | `POST` | `/admin/offers` | Create or update promotional offers / coupon codes |

---

## 📮 Postman Collection

A complete, pre-configured Postman collection is included:  
📄 [ecommerce_postman_collection.json](file:///d:/Ecommerce/api/ecommerce_postman_collection.json)

### Collection Features:
1. **Automated Token Management**: Running **Login** or **Admin Login** automatically parses the response token and populates `{{authToken}}` and `{{adminToken}}` collection variables.
2. **Comprehensive Coverage**: Includes tests and sample payloads for Authentication, Category Hierarchy, Product Filters, Cart Management, Checkout & Orders, Customer Wallet, and all Admin Operations.
3. **Seeded Test Accounts**:
   - **Admin**: `admin@ecommerce.com` / `Admin@12345`
   - **Customer**: `9876543210` / `Test@12345`

---

## 📜 License
ISC License.
