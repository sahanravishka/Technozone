# Techno Zone Lanka — Online Store
Next.js + Supabase + PayHere

Mobile-first, SEO-optimized e-commerce platform for a Sri Lankan electronics shop.
Stack: **Next.js (App Router, TS) · Supabase (Postgres/Auth/Storage) · Vercel · PayHere**.

## Status

| Stage | Scope | Status |
|---|---|---|
| 1 | DB schema + RLS (migrations) | ✅ this commit |
| 2 | Storefront + i18n + SEO scaffolding | ✅ this commit |
| 3 | Cart + PayHere checkout + webhook + stock reservation | ✅ |
| 4 | Accounts + order tracking + PWA + WhatsApp button | ✅ |
| 5 | Admin (products/variants, discounts, orders, staff) | ✅ |
| 6 | Bulk A4 QR packing slips | ✅ |
| 7 | SEO + Vercel deploy config (cron in vercel.json) | ✅ |

## 1. Supabase setup

1. Create a project at supabase.com (region: Singapore `ap-southeast-1` — lowest latency to LK).
2. Run migrations **in order** via SQL Editor, or with the CLI:
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push        # applies supabase/migrations/*
   ```
   Order: `0001_init` → `0002_functions_triggers` → `0003_rls` → `0004_seed`.
3. Auth → Providers: enable **Email** and **Google**.
4. Storage: create a public bucket `product-images` (uploads go through the admin API, which enforces staff role; public read is fine for product photos).
5. Sign up once through the app with the owner's email, then run the
   "FIRST OWNER ACCOUNT" insert at the bottom of `0004_seed.sql`.

## 2. Environment variables

Copy `.env.example` → `.env.local`. In production, set the same keys in
**Vercel → Project → Settings → Environment Variables**.

Key rules:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is browser-safe **only because RLS is enabled
  on every table** (migration 0003). Never weaken a policy to "fix" an access error —
  route that operation through a server action instead.
- `SUPABASE_SERVICE_ROLE_KEY` and `PAYHERE_MERCHANT_SECRET` are **server-only**.
  They must never appear in any `NEXT_PUBLIC_*` var or client bundle.

## 3. Security model (decisions already baked into the schema)

- **Orders cannot be created or priced by the browser.** There is intentionally
  *no* RLS insert policy on `orders`/`order_items`. Checkout is a server action:
  it re-prices the cart from the DB, applies discounts/coupons server-side,
  reserves stock via `reserve_stock()` (row-locked, oversell-proof), and inserts
  with the service role.
- **PayHere is verified server-side.** The browser's "success" redirect is treated
  as cosmetic. Only the `/api/payhere/notify` webhook — after verifying `md5sig`
  with the merchant secret — calls `confirm_order_paid()`, which atomically
  decrements stock, releases the hold, logs movements, and flips status to `paid`.
  The function is idempotent (webhook retries are safe) and is revoked from
  anon/authenticated, so it is callable only with the service role.
- **Raw webhooks are logged** to `payment_events` for reconciliation/disputes.
- **Coupons are never publicly readable** (no code enumeration); the storefront
  validates via the `validate_coupon()` RPC.
- **Every status change and stock movement is audit-logged** (`order_status_log`,
  `stock_movements`) — this is also the data feed for future forecasting/analytics.
- **Expired checkout holds** are released by `release_expired_reservations()`,
  invoked by a Vercel Cron route protected with `CRON_SECRET`.

## 4. Scaffolds already in the schema (future modules bolt on, no rewrite)

- **Variants**: every product has ≥1 variant (simple products get a default one),
  so stock/orders always reference a variant — adding color/storage options later
  is pure data, no migration.
- **i18n**: `product_translations` / `category_translations` keyed by `en|si|ta`;
  storefront falls back to the product's default-language fields.
- **Search**: `products.search_tsv` (Postgres FTS) now; swap to Algolia/Meilisearch
  behind the `external_search` flag later.
- **Recommendations**: `product_suggestions` holds manual pins now; the `events`
  table accumulates the behavioral data to compute them automatically later.
- **WhatsApp**: all message templating lives in one module (`lib/whatsapp.ts` in
  Stage 4) returning either a `wa.me` URL (now) or a Cloud API payload (later) —
  the flag `whatsapp_cloud_api` switches it.
- **Feature flags**: `feature_flags` table, read server-side, cached.

## 5. Running locally

```bash
npm install
npm run dev          # http://localhost:3000 -> redirects to /en
```

**No Supabase needed to preview** — when env vars are absent the storefront
runs on a built-in demo catalog (10 products, LKR pricing, discounts), so you
can push to Vercel and see the full design immediately. Connect Supabase and
add real products later; the same pages switch to live data automatically.

### Storefront (Stage 2) notes
- **Routes**: `/{en|si|ta}` home · `/category/[slug]` · `/product/[slug]` · `/cart` · `/checkout`.
  Middleware adds the locale prefix; `hreflang` alternates + canonical on every product.
- **SEO**: SSR/ISR (5-min revalidate), JSON-LD `Product` schema (price + stock for
  Google rich results), Open Graph with product image (clean WhatsApp link previews),
  `sitemap.xml` (all locales × all products), `robots.txt`, security headers.
- **Design system**: tokens in `app/globals.css` + `tailwind.config.ts`
  (ink/paper/volt palette, Sora display, Instrument Sans body, JetBrains Mono for
  prices/SKUs). Sinhala/Tamil locales automatically switch to Noto script fonts.
- **Motion**: hero power-on sequence, route-change fade, scroll reveals, hover
  lift with violet glow — all disabled under `prefers-reduced-motion`.
- **Mobile**: drawer nav, horizontal category rail, 2-col grid, sticky
  add-to-cart bar on product pages with safe-area padding.
- **Cart**: client-side (localStorage), stock-capped quantities, delivery-zone
  selector with live totals. Checkout is a WhatsApp handoff stub until Stage 3
  wires PayHere — the shop loses zero orders in the meantime.
- **Branding**: Techno Zone Lanka — navy `#0B1526`, royal blue `#1B6FD8` (actions),
  logo cyan `#53B7E8` (accents), Plus Jakarta Sans. All tokens live in
  `app/globals.css` + `tailwind.config.ts`; name/WhatsApp number in `lib/site.ts`.
  The logo file is `public/logo.jpg` (footer) and `app/icon.png` (PWA/app icon) —
  replace both with a transparent-background version when available for best results.

## 6. PayHere sandbox → live

1. Develop with `PAYHERE_MODE=sandbox` + sandbox merchant credentials.
2. Register the notify URL in the PayHere dashboard (sandbox and live separately).
3. Go-live: switch `PAYHERE_MODE=live` and swap the merchant ID/secret **in Vercel
   env vars only** — zero code changes. Keep sandbox values in Preview environments.

## 7. Deploying to Vercel

1. Push this repo to GitHub, import into Vercel.
2. Set all env vars (Production + Preview with sandbox values).
3. Add the cron job in `vercel.json` (ships in Stage 3):
   `*/10 * * * *` → `/api/cron/release-reservations`.


## Stage 3–7 notes

**Checkout flow**: cart → `/checkout` (sign-in required) → server action re-prices every
line from the DB, validates the coupon via RPC, reserves stock (row-locked), inserts the
order with the service role, then returns a **signed PayHere form** the browser submits.
The return page (`/order/[id]`) shows a live status timeline and auto-refreshes while the
webhook confirms. **Only `/api/payhere/notify` marks orders paid** — after verifying
`md5sig`. Failed/cancelled payments release the stock hold.

**Admin** (`/admin`, staff login required — RLS enforces roles):
Dashboard (orders today, monthly revenue, low-stock alerts) · Orders kanban with
one-click status advance + per-order WhatsApp button (templates in `lib/whatsapp.ts`,
Cloud-API swap is that one file) · Products CRUD with variants, image upload, specs and
related-product pins · Discounts & coupon codes · Staff management (owner only).
Select orders → **Print packing slips**: A4 sheet, 8 labels/page, each with a QR that
opens the order in admin.

**Go-live checklist**
1. Run migrations, create owner account (see `0004_seed.sql`).
2. Set env vars in Vercel (incl. `CRON_SECRET`); cron is configured in `vercel.json`.
3. Register the notify URL in PayHere (sandbox first): `https://yourdomain/api/payhere/notify`.
4. Test a sandbox payment end-to-end, then flip `PAYHERE_MODE=live`.

---

## CRM, Reviews & Repairs (migration 0005)

This release adds customer tracking, reviews, loyalty, and a device-repair workflow.

### One-time setup
1. **Run the new migration** `supabase/migrations/0005_crm_reviews_repairs.sql` (after 0001–0004).
   It adds: `contacts`, `reviews`, `service_jobs` + `service_status_log` + `service_types`,
   makes `orders` guest-friendly (nullable `customer_id`, `guest_email`), caches product
   ratings, and adds RLS for all of it.
2. **Storage bucket** — create a public bucket named `product-images` for product photos.
3. **PayHere** — register your notify URL `https://YOURDOMAIN/api/payhere/notify`.
4. (Recommended) supply a **transparent PNG logo** for the light header.

### What customers get
- **Guest checkout** — buy with just name/phone/email/address; no account required.
- **Accounts** still work and unlock order history + verified reviews.
- **Reviews** — star ratings on every product; verified-purchase badge; submissions
  from signed-in buyers publish instantly, anonymous ones queue for moderation.
- **Repairs** — `/services` to book a device repair, `/track` to check status
  (gated by job number + last 4 phone digits). Status updates go out over WhatsApp.

### What the shop gets (admin)
- **Customers** (`/admin/customers`) — one row per real person, auto-matched by phone
  (then email) across guest + account orders. Search by phone/email/name/city.
  Loyalty tier (New → Regular → Gold → VIP) is computed from orders + lifetime value,
  with one-click **personalized coupons**.
- **Reviews** (`/admin/reviews`) — approve/hide/delete submissions, or post a review
  on a customer's behalf.
- **Repairs** (`/admin/repairs`) — kanban board (Received → Diagnosing → Awaiting
  approval → Repairing → Ready), intake form, estimates, and a **WhatsApp** button per
  card that pre-fills the right status message. Every status change is logged.

### How loyalty tiers work
`lib/loyalty.ts` — VIP at ≥6 orders or ≥Rs 300k lifetime; Gold at ≥3 or ≥Rs 75k;
Regular at ≥1. Suggested discounts: VIP 10%, Gold 7%, Regular 5% (override in the UI).

### Demo mode
With no env vars the whole site still runs: catalog from `lib/demo-data.ts`,
checkout + repair booking fall back to WhatsApp handoff, reviews list empty.

---

## COD, Search & WhatsApp ordering (migration 0006)

### One-time setup
- **Run** `supabase/migrations/0006_cod_search_whatsapp.sql` (after 0001–0005). It adds the
  `payment_method` column to orders, the `mark_order_collected` RPC, the `pg_trgm` search
  indexes, and the `search_products` function.

### Payment options at checkout
Customers now choose how to pay:
- **Card / online** (PayHere) — instant, only shown when PayHere keys are set.
- **Cash on delivery** — order is created as *pending/unpaid*, stock reserved. Staff tap
  **Mark paid** on the order card when the customer pays on hand-over.
- **Order on WhatsApp** — creates the order, reserves stock, and opens WhatsApp pre-filled
  with the items, total, address, and reference number. Matches how most Sri Lankan shoppers
  already buy. Confirm + **Mark paid** from the admin order board.

COD and WhatsApp ordering work **even before PayHere is configured**, so you can launch early.

### Search & filtering
- Search bar in the header → `/search`. Matches product **name, brand, and SKU**
  (index-assisted via trigram). Filter by brand, price range, and in-stock; sort by
  relevance, price, or rating. Works in demo mode against the sample catalogue.

---

## In-store pickup + security audit (migration 0007)

Run `supabase/migrations/0007_pickup.sql` (after 0001–0006).

### In-store pickup
Checkout now has a **Deliver / Pick up in store** toggle. Pickup orders skip the address
and delivery fee, and the payment choice relabels COD as **Pay at store**. Admin order
cards show a 🏬 Pickup badge.

### Audit — fixed
1. **Personalized coupons were not enforced.** A `LOYAL…` code issued to one customer could
   be redeemed by anyone who learned it. `validate_coupon` now requires the redeemer to match
   the bound contact (by normalized phone, or linked account), enforced again in checkout.
   Verified: owner ✓, stranger ✗, no-phone ✗, public coupons unaffected ✓.
2. **Search filter injection.** The search term was interpolated into a PostgREST `.or()`
   filter, letting a crafted query inject conditions. Input is now whitelisted to
   letters/numbers/space/hyphen before any query is built.

### Audit — reviewed and already sound
- RLS on every table; orders reject client INSERT; coupons & contacts never public.
- Privileged RPCs (`reserve_stock`, `confirm_order_paid`, `mark_order_collected`,
  `issue_loyalty_coupon`) are revoked from browser roles and re-check `is_staff()`.
- Admin writes use the RLS-enforced user client *and* a `requireStaff()` role re-check.
- Order page is login-gated and RLS-scoped to the buyer's own orders (no IDOR).
- Stock is row-locked, reserved for COD/pickup too, and rolled back on any failure.
- Loyalty rollups count only paid orders — COD/pickup don't inflate lifetime value until collected.
- `next.config` sets image remote patterns + security headers; only the signature-verified
  PayHere webhook can mark an order paid.

### Noted for later (low risk at single-shop scale)
- Public submit actions (reviews, repair booking) cap input length but aren't rate-limited —
  add a simple throttle or captcha if you ever see spam.
- Guests track orders via WhatsApp + reference number (no on-site guest order page); add a
  phone-gated lookup RPC like `track_service` if you want one.

---

## Warranty · Courier tracking · Returns · COD controls (migration 0008)

Run `supabase/migrations/0008_warranty_courier_returns_cod.sql` (after 0001–0007).

### Warranty tracking
- Register a serial/IMEI against a purchase in **Admin → Warranties** (or at point of sale).
  Expiry is computed from the warranty period; warranties auto-link to the customer's contact.
- Customers check status at **/warranty** by serial/IMEI or last-4 phone digits.

### Courier / shipment tracking
- **Admin → Shipments** lists orders awaiting dispatch. Assign a courier (Koombiyo, Pronto,
  Domex, Aramex, or hand delivery) + tracking number, advance status, and WhatsApp the customer.
- The customer's order page shows live shipment status and a **Track parcel** link.
- Provider-agnostic: works manually today; `lib/courier.ts` has the adapter interface to wire
  real courier APIs later (those calls can't be made from the build sandbox, so they're left as
  integration points).

### Returns (RMA)
- Customers request a return at **/returns** (order number + phone). Order lines are copied in.
- **Admin → Returns** is a board: Requested → Approved → Received → Refunded. Marking a return
  **received** with restock enabled puts the units back into inventory automatically (verified).
  WhatsApp updates per step; reject path included.

### COD fraud controls
- **Admin → Settings**: set a COD order-value limit (orders above it must pay online/WhatsApp)
  and maintain a phone blocklist for repeat fake/abandoned orders.
- Enforced at checkout via the `cod_allowed` RPC before any COD order is created.
- Note: phone-OTP verification for first-time COD buyers needs an SMS gateway, so it's left as
  a pluggable step; the blocklist + value cap work today with no external dependency.
