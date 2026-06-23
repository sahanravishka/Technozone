-- ============================================================
-- 0003_rls.sql — Row Level Security on EVERY table
--
-- Principles:
--  * anon/authenticated browser clients get the minimum.
--  * Catalog: public read of active rows only.
--  * Customers: own rows only.
--  * Orders are CREATED server-side (service role) — no client
--    insert policy exists, so totals/prices can't be forged.
--  * Staff writes scoped by role (owner > manager > packer).
--  * service_role bypasses RLS (server code only — never ship
--    the service key to the browser).
-- ============================================================

alter table roles                 enable row level security;
alter table staff                 enable row level security;
alter table categories            enable row level security;
alter table category_translations enable row level security;
alter table products              enable row level security;
alter table product_variants      enable row level security;
alter table product_images        enable row level security;
alter table product_translations  enable row level security;
alter table product_suggestions   enable row level security;
alter table discounts             enable row level security;
alter table coupons               enable row level security;
alter table coupon_redemptions    enable row level security;
alter table customers             enable row level security;
alter table delivery_zones        enable row level security;
alter table addresses             enable row level security;
alter table orders                enable row level security;
alter table order_items           enable row level security;
alter table order_status_log      enable row level security;
alter table stock_movements       enable row level security;
alter table stock_reservations    enable row level security;
alter table payment_events        enable row level security;
alter table events                enable row level security;
alter table push_subscriptions    enable row level security;
alter table feature_flags         enable row level security;

-- ============================================================
-- CATALOG — public read (active only), owner/manager write
-- ============================================================
create policy catalog_read_categories on categories
  for select using (is_active or public.is_staff());
create policy catalog_write_categories on categories
  for all using (public.staff_role() in ('owner','manager'))
  with check (public.staff_role() in ('owner','manager'));

create policy catalog_read_cat_i18n on category_translations
  for select using (true);
create policy catalog_write_cat_i18n on category_translations
  for all using (public.staff_role() in ('owner','manager'))
  with check (public.staff_role() in ('owner','manager'));

create policy catalog_read_products on products
  for select using (is_active or public.is_staff());
create policy catalog_write_products on products
  for all using (public.staff_role() in ('owner','manager'))
  with check (public.staff_role() in ('owner','manager'));

create policy catalog_read_variants on product_variants
  for select using (
    is_active and exists (select 1 from products p where p.id = product_id and p.is_active)
    or public.is_staff()
  );
create policy catalog_write_variants on product_variants
  for all using (public.staff_role() in ('owner','manager'))
  with check (public.staff_role() in ('owner','manager'));

create policy catalog_read_images on product_images
  for select using (true);
create policy catalog_write_images on product_images
  for all using (public.staff_role() in ('owner','manager'))
  with check (public.staff_role() in ('owner','manager'));

create policy catalog_read_i18n on product_translations
  for select using (true);
create policy catalog_write_i18n on product_translations
  for all using (public.staff_role() in ('owner','manager'))
  with check (public.staff_role() in ('owner','manager'));

create policy catalog_read_suggestions on product_suggestions
  for select using (true);
create policy catalog_write_suggestions on product_suggestions
  for all using (public.staff_role() in ('owner','manager'))
  with check (public.staff_role() in ('owner','manager'));

-- Active discounts are public (storefront needs strikethrough pricing)
create policy discounts_read on discounts
  for select using (
    (is_active and starts_at <= now() and (ends_at is null or ends_at > now()))
    or public.is_staff()
  );
create policy discounts_write on discounts
  for all using (public.staff_role() in ('owner','manager'))
  with check (public.staff_role() in ('owner','manager'));

-- Coupons: NEVER publicly readable (no code enumeration).
-- Storefront validates via validate_coupon() RPC only.
create policy coupons_staff_read on coupons
  for select using (public.staff_role() in ('owner','manager'));
create policy coupons_staff_write on coupons
  for all using (public.staff_role() in ('owner','manager'))
  with check (public.staff_role() in ('owner','manager'));

create policy redemptions_read on coupon_redemptions
  for select using (customer_id = auth.uid() or public.staff_role() in ('owner','manager'));
-- inserts happen server-side (service role) during checkout

-- ============================================================
-- CUSTOMERS / ADDRESSES — own rows only (+ staff read)
-- ============================================================
create policy customers_self_read on customers
  for select using (id = auth.uid() or public.is_staff());
create policy customers_self_update on customers
  for update using (id = auth.uid()) with check (id = auth.uid());
-- row is created by the auth trigger (security definer), no insert policy needed

create policy addresses_self_all on addresses
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy addresses_staff_read on addresses
  for select using (public.is_staff());

create policy zones_public_read on delivery_zones
  for select using (is_active or public.is_staff());
create policy zones_owner_write on delivery_zones
  for all using (public.staff_role() in ('owner','manager'))
  with check (public.staff_role() in ('owner','manager'));

-- ============================================================
-- ORDERS — customer reads own; staff read all; status updates
-- by staff; creation is server-side only (no insert policy).
-- ============================================================
create policy orders_customer_read on orders
  for select using (customer_id = auth.uid());
create policy orders_staff_read on orders
  for select using (public.is_staff());
create policy orders_staff_update on orders
  for update using (public.is_staff())
  with check (public.is_staff());
  -- packers can move status forward; column-level limits (e.g. packers
  -- can't edit totals) are enforced in the admin API layer.

create policy items_customer_read on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy items_staff_read on order_items
  for select using (public.is_staff());

create policy status_log_customer_read on order_status_log
  for select using (
    exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy status_log_staff_read on order_status_log
  for select using (public.is_staff());
-- writes via trigger / service role only

-- ============================================================
-- STOCK / PAYMENTS / AUDIT — staff visibility, server writes
-- ============================================================
create policy stock_movements_staff_read on stock_movements
  for select using (public.is_staff());
create policy stock_movements_mgr_write on stock_movements
  for insert with check (public.staff_role() in ('owner','manager'));  -- manual restock/adjustment

create policy reservations_staff_read on stock_reservations
  for select using (public.is_staff());

create policy payment_events_owner_read on payment_events
  for select using (public.staff_role() in ('owner','manager'));
-- inserts from webhook handler (service role) only

-- ============================================================
-- EVENTS / PUSH / FLAGS
-- ============================================================
create policy events_insert_any on events
  for insert with check (true);          -- analytics beacons (anon ok)
create policy events_staff_read on events
  for select using (public.staff_role() in ('owner','manager'));

create policy push_self_all on push_subscriptions
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

create policy flags_public_read on feature_flags
  for select using (true);
create policy flags_owner_write on feature_flags
  for all using (public.staff_role() = 'owner')
  with check (public.staff_role() = 'owner');

-- ============================================================
-- STAFF / ROLES — owner manages; staff can see own record
-- ============================================================
create policy roles_staff_read on roles
  for select using (public.is_staff());
create policy roles_owner_write on roles
  for all using (public.staff_role() = 'owner')
  with check (public.staff_role() = 'owner');

create policy staff_self_read on staff
  for select using (user_id = auth.uid() or public.staff_role() = 'owner');
create policy staff_owner_write on staff
  for all using (public.staff_role() = 'owner')
  with check (public.staff_role() = 'owner');
