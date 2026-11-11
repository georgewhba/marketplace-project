# Souq Misr (سوق مصر) — Multi-Vendor E-Commerce Marketplace

A full-stack, production-grade **Multi-Vendor E-Commerce Marketplace** built with **React 19**, **Node.js (Hono)**, **PostgreSQL (Drizzle ORM)**, and **TypeScript**. It features three complete portals (**Customer Storefront**, **Vendor Dashboard**, and **Admin Control Center**), end-to-end financial ledger & settlement automation, atomic inventory concurrency controls, multi-factor authentication, and full **RTL/LTR multi-language support**.

---

## 🔗 Links

- **GitHub Repository:** [https://github.com/georgewhba/marketplace-project](https://github.com/georgewhba/marketplace-project)
- **Live Deployment (Railway):** [https://marketplace-project-production-de9f4e32.up.railway.app](https://marketplace-project-production-de9f4e32.up.railway.app)

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | **React 19**, TypeScript, Vite 8, React Router v7, TanStack React Query v5, Tailwind CSS v4, Framer Motion, Lucide Icons |
| **Backend** | **Node.js 20+**, **Hono** (`@hono/node-server`), TypeScript, RESTful API Architecture, Pino Structured Logging |
| **Database & Caching** | **PostgreSQL 16**, **Drizzle ORM** & Drizzle Kit (13 SQL migrations, 30+ relational tables & materialized views), **Redis** & **BullMQ** |
| **Authentication & Security** | **JWT** (Access + Refresh Token Rotation via `HttpOnly` Secure Cookies), **Google OAuth 2.0**, **TOTP 2FA / MFA** (`otplib`), **RBAC** (Fine-grained Role & Permission middleware), `bcryptjs`, **Zod** Validation, Rate Limiting, CSRF & Security Headers (CSP, HSTS) |
| **Payments, Shipping & Media** | Paymob Payment Gateway (HMAC verified webhooks + Cash on Delivery), Bosta Shipping Provider integration, Sharp (WebP conversion & EXIF stripping), Cloudflare R2 / S3 storage |
| **Testing & DevOps** | **Vitest** (115 Unit & Integration tests), **Playwright** (E2E & WCAG Accessibility), Docker & Docker Compose, GitHub Actions CI/CD, PM2, Nginx |

---

## ✨ Core Features

### 1. Customer Storefront
- **Product Discovery:** Advanced filtering by category, vendor, price range, ratings, and full-text search with pagination.
- **Shopping Cart & Wishlist:** Persistent database-backed cart and wishlist with real-time stock validation.
- **Atomic Checkout & Coupons:** Multi-vendor order splitting within a single PostgreSQL transaction using `SELECT ... FOR UPDATE` row-level locks to prevent overselling under high concurrency.
- **Order Tracking & Refunds:** Live shipment status timeline, order cancellation, and item-level refund requests.
- **Multi-Language (i18n) & Theme:** Seamless RTL/LTR switching (Arabic, English, French, German, Spanish, Turkish) and Dark/Light mode.

### 2. Vendor Portal (`/vendor`)
- **Store & Catalog Management:** Create/edit products, upload multiple auto-optimized WebP images, manage stock alerts, and reply to customer reviews.
- **Order Fulfillment:** Manage vendor-specific order items (`pending` → `confirmed` → `shipped` → `delivered`) with automated Bosta waybill generation or manual tracking.
- **Earnings, Settlements & Payouts:** Real-time financial ledger, automated commission calculations, periodic settlement statements, and payout requests.
- **Subscription Tiers:** Tiered vendor plans (`Basic`, `Plus`, `Pro`) controlling product limits, image limits, commission rates, and payout cycles.

### 3. Admin Control Center (`/admin`)
- **Platform Analytics:** Revenue, GMV, conversion funnel, and daily sales materialized views with CSV export.
- **Vendor & Product Moderation:** Approve/suspend vendors, moderate products, and manage categories.
- **Financial Governance:** Dynamic commission rules (global, category, or vendor-specific), settlement generation, payout approvals, and atomic refund reversals.
- **RBAC & Security:** Custom roles and granular permissions (`vendors.approve`, `orders.refund`, `payouts.approve`, `commission.manage`, etc.) with full audit logging.

---

## 📂 Project Architecture

```text
marketplace-project/
├── client/                      # React 19 + TypeScript Frontend (Vite)
│   ├── src/
│   │   ├── api.ts               # Typed REST API client with automatic silent token refresh
│   │   ├── auth.tsx             # Authentication context (Login, Register, OTP, Google OAuth, MFA)
│   │   ├── i18n.tsx             # Multi-language RTL/LTR engine
│   │   ├── components/          # Reusable UI components, layouts, charts, AI chat widget
│   │   ├── hooks/               # Custom React hooks (SEO title, site settings, theme)
│   │   └── pages/               # 45+ lazy-loaded pages (Storefront, /vendor/*, /admin/*)
│   └── e2e/                     # Playwright End-to-End & Accessibility test suites
├── server/                      # Node.js + Hono REST API Backend
│   ├── index.ts                 # App entry point, global middlewares, static serving, cron jobs
│   ├── env.ts                   # Strict Zod environment variable validation
│   ├── db/
│   │   ├── index.ts             # PostgreSQL connection pool & Drizzle instance
│   │   ├── migrate.ts           # Automated production migration runner
│   │   ├── seed.ts              # Comprehensive database seeder (RBAC, plans, vendors, products)
│   │   └── schema/              # 30+ Drizzle ORM PostgreSQL table definitions
│   ├── middleware/              # authenticate, authorize, rbac, validate, rateLimit, errorHandler
│   ├── routes/                  # 16 modular REST API routers
│   ├── services/                # Business logic (auth, commission, settlement, paymob, shipping)
│   └── __tests__/               # 15 Unit & Integration test suites (115 tests)
├── drizzle/                     # SQL migration files & schema snapshots
├── Dockerfile                   # Multi-stage production Docker build
├── docker-compose.yml           # Full local stack (App + PostgreSQL 16 + Redis)
└── railway.toml                 # Railway cloud deployment configuration
```

---

## 🔌 REST API Endpoints Overview

All endpoints return standardized JSON envelopes (`{ success: true, data, meta }` or `{ success: false, error: { code, message, details } }`).

| Module | Base Path | Key Endpoints | Auth / Role |
|---|---|---|---|
| **Authentication** | `/api/auth` | `POST /register`, `POST /verify-otp`, `POST /login`, `POST /google`, `POST /refresh`, `POST /logout`, `GET /me`, `PUT /profile`, `POST /mfa/setup`, `POST /mfa/challenge`, `POST /forgot-password`, `POST /reset-password` | Public / JWT |
| **Storefront** | `/api/store` | `GET /home`, `GET /products`, `GET /products/:slug`, `GET /categories`, `GET /vendors/:slug`, `GET /coupons/validate`, `GET /settings` | Public |
| **Shopping Cart** | `/api/cart` | `GET /`, `POST /items`, `PUT /items/:id`, `DELETE /items/:id`, `DELETE /` | Customer |
| **Orders** | `/api/orders` | `POST /` (Atomic Checkout), `GET /`, `GET /:id`, `PUT /:id/cancel`, `GET /:id/shipments` | Customer |
| **Addresses & Wishlist** | `/api/addresses`<br>`/api/wishlist` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` | Customer |
| **Product Reviews** | `/api/reviews` | `GET /product/:productId`, `POST /`, `DELETE /:id` | Public / Customer |
| **Refunds** | `/api/refunds` | `POST /`, `GET /my`, `GET /vendor`, `GET /admin`, `PUT /admin/:id/status` | Customer / Vendor / Admin |
| **Vendor Portal** | `/api/vendor` | `GET /dashboard`, `GET /analytics`, `GET /products`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id`, `GET /orders`, `PUT /order-items/:id/status`, `GET /settlements`, `POST /payouts`, `GET /subscription` | Vendor (`approved`) |
| **Admin Portal** | `/api/admin` | `GET /dashboard`, `GET /analytics`, `GET /vendors`, `PUT /vendors/:id/status`, `GET /products`, `GET /orders`, `GET /users`, `GET /categories`, `GET /coupons`, `GET /commission-rules`, `GET /settlements`, `PUT /payouts/:id`, `GET /settings` | Admin + RBAC Permission |
| **Roles & RBAC** | `/api/roles` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `GET /permissions`, `POST /assign` | Admin (`manage_roles`) |
| **Payments & Webhooks** | `/api/payments`<br>`/api/webhooks` | `POST /paymob/checkout`, `POST /webhook` (Paymob HMAC), `POST /bosta` (Shipping Webhook) | Customer / HMAC |
| **System Health** | `/api/health` | `GET /` (Database connectivity & disk health check) | Public |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js** `>= 20.x`
- **PostgreSQL** `>= 15` (running locally on port `5432`, or via Docker)
- **Redis** (optional in development — automatically falls back to in-memory mock if not configured)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/georgewhba/marketplace-project.git
cd marketplace-project

# Install backend & shared dependencies
npm ci

# Install frontend dependencies
cd client && npm ci && cd ..
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and set your PostgreSQL connection string and JWT secrets:
```bash
cp .env.example .env
```

Minimum required variables in `.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/marketplace
JWT_ACCESS_SECRET=replace_with_a_strong_secret_at_least_32_chars
JWT_REFRESH_SECRET=replace_with_another_strong_secret_32_chars
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### 3. Run Database Migrations & Seed Demo Data
```bash
npm run db:migrate
npm run db:seed
```

### 4. Start Development Servers
```bash
# Terminal 1 — Start Backend API (http://localhost:3001)
npm run dev

# Terminal 2 — Start React Frontend (http://localhost:5173)
cd client && npm run dev
```

---

## 🔐 Demo Credentials (After Running `npm run db:seed`)

| Role | Email | Password | Portal Path |
|---|---|---|---|
| **Super Admin** | `admin@marketplace.com` | `Admin@123456` | `/admin` |
| **Approved Vendor** | `sony@marketplace.com` | `Vendor@123456` | `/vendor` |
| **Customer** | `omar@example.com` | `Customer@123456` | `/` |

---

## 🧪 Testing, Linting & Production Build

```bash
# Run TypeScript type-checking
npx tsc --noEmit

# Run ESLint across backend & frontend
npm run lint

# Run full Vitest Unit & Integration suite (15 test files, 115 tests)
npm test

# Build both Backend (./dist) and Frontend (./client/dist) for production
npm run build

# Start production server (runs migrations automatically then boots server)
npm start
```

---

## ☁️ Deployment (Railway / Docker / Render)

### Option A: Railway / Render (One-Click Cloud Deploy)
The repository includes [`railway.toml`](./railway.toml) and [`Dockerfile`](./Dockerfile):
- **Build Command:** `npm ci && cd client && npm ci && cd .. && npm run build`
- **Start Command:** `npm start` (automatically executes `node dist/server/db/migrate.js` followed by `node dist/server/index.js`)
- **Healthcheck Path:** `/api/health`
- **Required Environment Variables:** `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`, `CORS_ORIGIN=https://<your-domain>`

### Option B: Docker Compose
```bash
docker compose up -d --build
```

---

## 📄 Additional Documentation
- [Architecture Overview](./PROJECT_ARCHITECTURE.md)
- [Deployment & Security Guide](./DEPLOYMENT.md)
