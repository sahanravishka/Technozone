-- ============================================================================
-- 0013  Wishlist sync · back-in-stock alerts · abandoned-checkout capture
--
--   Adds:
--     1. wishlists              — server-synced favorites for signed-in customers
--                                  (guests keep using localStorage only)
--     2. stock_notify_requests  — "notify me" opt-ins for sold-out variants
--     3. abandoned_checkouts    — snapshot of a checkout-in-progress, captured
--                                  once the phone number looks valid, so staff
--                                  can follow up if it never converts to an order
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Wishlists (customer-owned, server-synced)
-- ---------------------------------------------------------------------------
create table if not exists wishlists (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (customer_id, product_id)
);
create index if not exists idx_wishlists_customer on wishlists (customer_id, created_at desc);

alter table wishlists enable row level security;
create policy wishlists_owner on wishlists
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. Back-in-stock notification requests
-- ---------------------------------------------------------------------------
create table if not exists stock_notify_requests (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  variant_id  uuid references product_variants(id) on delete cascade,
  phone       text not null,
  product_name text not null,
  notified    boolean not null default false,
  notified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_stock_notify_pending
  on stock_notify_requests (product_id) where not notified;

alter table stock_notify_requests enable row level security;
-- Written only via the server action's service-role client (mirrors the
-- orders table's "no client insert policy" pattern) — staff read/manage only.
create policy stock_notify_staff on stock_notify_requests
  for select using (public.is_staff());
create policy stock_notify_staff_write on stock_notify_requests
  for update using (public.is_staff()) with check (public.is_staff());
create policy stock_notify_staff_delete on stock_notify_requests
  for delete using (public.is_staff());

-- ---------------------------------------------------------------------------
-- 3. Abandoned checkout snapshots
-- ---------------------------------------------------------------------------
create table if not exists abandoned_checkouts (
  id           uuid primary key default gen_random_uuid(),
  phone_norm   text not null unique,
  name         text,
  phone        text not null,
  email        text,
  items        jsonb not null default '[]'::jsonb,   -- [{name, qty, price}]
  subtotal     numeric(12,2) not null default 0,
  locale       text,
  converted    boolean not null default false,
  dismissed    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_abandoned_pending
  on abandoned_checkouts (updated_at desc) where not converted and not dismissed;

alter table abandoned_checkouts enable row level security;
-- Written only via the server action's service-role client — staff manage only.
create policy abandoned_checkouts_staff on abandoned_checkouts
  for select using (public.is_staff());
create policy abandoned_checkouts_staff_write on abandoned_checkouts
  for update using (public.is_staff()) with check (public.is_staff());
create policy abandoned_checkouts_staff_delete on abandoned_checkouts
  for delete using (public.is_staff());
