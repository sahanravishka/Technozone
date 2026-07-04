# Website ↔ TZL POS integration

The Technozone website can read its catalog from the **TZL POS backend**
(`flowiix-devs/tzl-pos-be-v2`, Mongo/Express) instead of Supabase. The POS is
the source of truth for products, stock, prices, customers, orders and loyalty.

## Status

| Phase | Scope | Status |
|---|---|---|
| Foundation | POS API client, types, image helper (`lib/pos/*`) | ✅ |
| 1 | Catalog reads from POS (products, categories, product detail, search, related, by-ids, brands) behind a flag | ✅ |
| 2 | Customer auth via POS (OTP register, login, profile, addresses) | ⬜ not started |
| 3 | Checkout → POS order (validate-stock, create order, PayHere/Koko/COD/bank slip) | ⬜ not started |
| 4 | Wishlist + loyalty via POS | ⬜ not started |

## How Phase 1 works

- Setting **`NEXT_PUBLIC_POS_API_URL`** turns on POS mode. When set, the data
  layer (`lib/data.ts`) reads catalog from the POS API; when blank, the site
  behaves exactly as before (Supabase / demo). Every POS call falls back to the
  old path on error, so a POS outage never hard-breaks the storefront.
- Product URLs: POS keys products by Mongo `_id`; the website routes by slug, so
  we synthesize `slugify(name)--<id>` and parse the id back on `/product/[slug]`.

## Prerequisites you must do (POS side / hosting) — **required before Phase 1 works live**

1. **CORS** — add the website's origin (e.g. `https://technozonelanka.com`) to
   the POS backend allow-list in `tzl-pos-be-v2/src/app.js` (`allowedOrigins`).
   Without this, browser calls from the website are blocked.
2. **Env on the website** — set:
   - `NEXT_PUBLIC_POS_API_URL` = POS API base, no `/api` suffix (e.g. `https://api.tzl-pos…`)
   - `NEXT_PUBLIC_POS_IMAGE_URL` = base host serving POS product images (defaults to the API URL)
3. **Image host** — `next.config.mjs` already allow-lists `technozonelankai.lk`
   and the host from `NEXT_PUBLIC_POS_IMAGE_URL`. Add others if images 404.

## Confirmed POS API surface (from tzl-pos-be-v2 + tzl-pos-fe-v2 services)

Base URL = `NEXT_PUBLIC_POS_API_URL` + `/api`. Auth = JWT (`customerToken`
cookie **or** `Authorization: Bearer <token>`; the website uses Bearer).

- **Catalog (public, no auth):** `GET /products/public`, `/products/public/:id`,
  `/products/public/:id/related`, `/products/search`, `/products/filter`,
  `/products/filter-options`, `/products/new-arrivals`,
  `/products/promotional-products-with-variations`, `POST /products/by-ids`,
  `GET /categories`, `GET /product-variations/product/:id/public`
- **Customer auth:** `POST /customers/auth/{send-otp,verify-otp,complete-registration,resend-otp,login,logout,forgot-password,verify-reset-otp,reset-password}`,
  `GET/PUT /customers/auth/profile`, `GET/PUT/DELETE /customers/auth/address`,
  `PUT /customers/auth/change-password`
- **Orders (customer auth):** `POST /orders/validate-stock`, `POST /orders`,
  `GET /orders/my-orders`, `GET /orders/:id`, `GET /orders/number/:orderNumber`,
  `POST /orders/:id/{cancel,confirm-received,upload-payment-slip}`
- **Payments:** PayHere (`/payhere/{checkout,initiate,status,confirm}`),
  Koko (`/koko/{initiate,confirm}`), bank-transfer slip upload, COD.
  `paymentType` enum: `BANK_TRANSFER | PAYHERE | KOKO | COD`.
- **Loyalty:** points on the customer + `POST /customers/:id/loyalty-points`.

### Order payload (Phase 3 reference)

```ts
CreateOrderRequest = {
  items: { productId, productVariationID?, quantity, unitPrice, discount?, productName?, image?, warrantyMonths?, ... }[],
  shippingAddress: { fullName, phone, secondaryPhone?, email?, streetAddress, city, state?, postalCode? },
  paymentType: 'BANK_TRANSFER'|'PAYHERE'|'KOKO'|'COD',
  paymentTypeID?, deliveryCharge, convenienceFee?, total, notes?
}
```

## Open decisions for later phases

- **Auth token transport** — confirm `POST /customers/auth/login` returns the JWT
  in the response body (needed for the website's Bearer approach). If it only
  sets an httpOnly cookie, the POS must send `SameSite=None; Secure` and the
  website use `credentials: 'include'`.
- **Promotions / compare-at price** — POS `sellingPrice` is authoritative;
  showing MRP strike-through needs mapping `promotion` / `MRP` into the website's
  pricing display (not done in Phase 1).
- **Supabase** — once Phases 2–4 land, Supabase is redundant for commerce and can
  be kept only for website-only extras (homepage banners/CMS we built), or retired.
