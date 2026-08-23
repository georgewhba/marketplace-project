# Full Project Audit

## 1. Security
- **MFA:** MFA schema exists (`mfaSecrets`), but actual enforcement across auth lifecycle is incomplete or missing. Need a real TOTP implementation with recovery codes and explicit JWT claims.
- **Webhooks (P0):** Bosta shipping webhook (`/api/webhooks/bosta`) does not verify any signatures. An attacker can forge delivery events, which triggers commission payouts and alters vendor balances.
- **Payment Webhook (P0):** Paymob webhook updates payment status but lacks strict validation to ensure the paid amount matches the order total.
- **Rate Limiting:** General rate limits exist, but specific endpoints (login, password reset, MFA) need stricter brute-force protection.
- **File Uploads (P2):** Image magic byte validation exists for products, but a centralized robust upload security model (MIME, size limits, decompression bomb protection) is needed across all endpoints.

## 2. Backend & Database
- **Scheduled Jobs (P1):** Cron jobs are defined in `server/index.ts`. If PM2 runs in cluster mode, jobs will execute multiple times concurrently, causing duplicate settlements and corrupted financial data. Requires a distributed lock or dedicated worker.
- **Transactions & Concurrency:** The checkout and order delivery logic use DB transactions (e.g., `FOR UPDATE`), which is good. However, payout requests and settlement finalizations need deeper locking mechanisms to prevent double payouts during concurrent admin approvals.
- **Error Handling:** Enhanced via Hono's `onError` and custom middlewares, but some edge cases in subroutes may leak stack traces or cause unhandled rejections.

## 3. Financial Integrity
- **Refunds (P1):** Refund lifecycle is incomplete. Refunding an order must correctly reverse commissions, adjust vendor balances, update platform revenue, and log immutable ledger transactions. Currently, there is a risk of financial desynchronization if a delivered item is refunded.
- **Ledger System:** The `transactions` table tracks commissions and payouts, but needs to strictly act as an immutable double-entry ledger.
- **Settlements (P2):** Generation logic relies on cron jobs that are vulnerable to race conditions. Needs strict idempotency.

## 4. Marketplace Logic
- **Coupons:** Coupon usage is tracked atomically in checkout, but refunding an order restores the coupon count with `GREATEST`. Needs strict concurrency testing.
- **Shipping Fees:** Hardcoded shipping fees (30 EGP per vendor) in `order.routes.ts` is a critical business logic flaw that limits the marketplace's flexibility. Needs a dynamic shipping model.

## 5. DevOps & Testing
- **Deployment:** PM2 cluster mode conflicts with in-memory cron jobs.
- **Monitoring:** Sentry is integrated, but health checks could be more robust regarding external dependency states.
- **Testing:** While some unit and integration tests exist, E2E tests and strict concurrency tests for financial endpoints (payouts, refunds) are lacking.

## 6. Frontend & UX
- **Design System (P3):** The current React client lacks a unified, premium, modern design system. Needs a complete rebuild targeting Middle Eastern aesthetics, proper RTL support, and accessible components.
- **State Management & Routing:** Needs review for loading states, error boundaries, and empty states.
- **Motion & 3D:** Currently non-existent or basic. Needs tasteful integration of Framer Motion and Three.js as per requirements.
