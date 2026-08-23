# Project Architecture

## System Architecture
This project is a multi-vendor marketplace platform built as a TypeScript monorepo containing:
- **Backend:** Node.js, Hono framework, Drizzle ORM, PostgreSQL.
- **Frontend:** React, Vite, TypeScript.
- **Infrastructure:** PM2 (process manager), Nginx (reverse proxy), Node-cron (scheduled jobs).

## Request Lifecycle
1. Nginx proxy routes `/api/*` to the Hono backend.
2. Global Middlewares apply: Logger, Error Handler, CORS, Security Headers, Rate Limiting.
3. Feature-specific routers (`/api/orders`, `/api/vendor`, etc.) process the request.
4. `authenticate` middleware checks the JWT in cookies/headers.
5. Role-based authorization (`authorize('admin', 'vendor')`) gates protected routes.
6. Zod validates request body/query (`validate` middleware).
7. Business logic interacts with Drizzle ORM.
8. Responses return standard JSON formats (`sendSuccess`, `sendCreated`).

## Database Relationships
- `users`: Core identity table (customer, vendor, admin).
- `vendors`: Linked 1:1 to `users`. Contains store profile and financial balances (`totalSales`).
- `products` & `product_images`: Linked to `vendors` and `categories`.
- `cart_items`: User's shopping cart.
- `orders`: Parent order document containing customer info and totals.
- `order_items`: Child records of `orders`, split by `vendorId`. Each item tracks its own status, commission, and shipping.
- `payments`: Tracks payment intents and transactions (Paymob, COD).
- `settlements` & `payout_requests`: Vendor financial payout ledger.
- `transactions`: Immutable financial ledger for vendor commissions and payouts.

## Authentication & Authorization Lifecycle
- JWT-based authentication with Access and Refresh tokens.
- Passwords hashed via `bcryptjs`.
- Roles: `customer`, `vendor`, `admin`.
- Middleware `authenticate` verifies access tokens.
- Middleware `authorize` enforces role checks.

## Marketplace Lifecycle
1. **Vendor Registration:** User registers, requests vendor status, admin approves (`PUT /api/admin/vendors/:id/approve`).
2. **Product Management:** Vendor adds products and stock.
3. **Checkout:** Customer adds to cart, applies coupon, and checks out. Atomic transaction deducts stock and clears cart.
4. **Order Splitting:** Order is split into `order_items` assigned to respective vendors.
5. **Shipping:** Vendors ship items individually. Bosta integration tracks shipments.
6. **Delivery & Commission:** When marked `delivered`, a database transaction atomically calculates commission, updates vendor balance, and logs a financial transaction.
7. **Settlement & Payout:** Cron job generates periodic settlements. Vendors request payouts against finalized settlements. Admin approves payouts, deducting from the vendor's balance.

## Scheduled Jobs Architecture
- `node-cron` runs within the main Node.js process (`server/index.ts`).
- Generates daily settlements (`generateSettlements`).
- **Risk:** In PM2 cluster mode, this cron will run independently on every worker process, causing duplicate execution.

## External Integrations
- **Payment:** Paymob (Cards, Wallets, Fawry).
- **Shipping:** Bosta (via webhooks).
- **Emails/Notifications:** Resend.
- **Monitoring:** Sentry, Pino logging.
