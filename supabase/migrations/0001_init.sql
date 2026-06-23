-- ============================================================
-- 0001_init.sql — Extensions, enums, tables, indexes
-- Run order: 0001 -> 0002 -> 0003 -> 0004
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------- ENUMS ----------
create type order_status as enum
  ('pending','paid','packed','shipped','delivered','cancelled','refunded');

create type payment_status as enum
  ('unpaid','paid','failed','refunded');

create type discount_type as enum ('percentage','fixed');
create type discount_scope as enum ('product','category','all');
create type suggestion_type as enum ('related','frequently_bought_together');

create type stock_movement_type as enum
  ('sale','restock','adjustment','reservation','release','cancellation_return');

-- Locales supported (i18n scaffold)
create domain locale_code as text check (value in ('en','si','ta'));

-- ============================================================
-- STAFF & ROLES (RBAC scaffold: owner / manager / packer)
-- ============================================================
create table roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,            -- 'owner' | 'manager' | 'packer'
  permissions jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table staff (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role_id    uuid not null references roles(id),
  full_name  text not null,
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CATALOG
-- ============================================================
create table categories (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references categories(id) on delete set null,  -- tree
  slug       citext not null unique,
  name       text not null,                  -- default (English) name
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table category_translations (
  category_id uuid not null references categories(id) on delete cascade,
  locale      locale_code not null,
  name        text not null,
  primary key (category_id, locale)
);

create table products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  slug        citext not null unique,        -- /product/iphone-charger
  name        text not null,                 -- default (English)
  brand       text,
  description text,
  specs       jsonb not null default '{}'::jsonb,  -- {"Warranty":"1 year", ...}
  base_price  numeric(12,2) not null check (base_price >= 0), -- LKR
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Full-text search scaffold (upgrade path: Algolia/Meilisearch later)
  search_tsv  tsvector generated always as (
    to_tsvector('simple',
      coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,''))
  ) stored
);

-- Every product has >= 1 variant; simple products get one default variant.
-- This keeps stock/orders uniform (always reference a variant).
create table product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  sku         citext not null unique,
  name        text not null default 'Default',     -- e.g. 'Black / 128GB'
  attributes  jsonb not null default '{}'::jsonb,  -- {"color":"Black","storage":"128GB"}
  price       numeric(12,2) not null check (price >= 0),
  stock_qty       int not null default 0 check (stock_qty >= 0),
  reserved_qty    int not null default 0 check (reserved_qty >= 0),
  low_stock_threshold int not null default 3,
  is_default  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (reserved_qty <= stock_qty)
);

create table product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  variant_id  uuid references product_variants(id) on delete set null, -- variant-specific image
  storage_path text not null,            -- Supabase Storage path
  alt         text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table product_translations (
  product_id  uuid not null references products(id) on delete cascade,
  locale      locale_code not null,
  name        text not null,
  description text,
  primary key (product_id, locale)
);

-- Manual "related" / "frequently bought together" pins.
-- Upgrade path: auto-recommendations computed from the events table.
create table product_suggestions (
  product_id           uuid not null references products(id) on delete cascade,
  suggested_product_id uuid not null references products(id) on delete cascade,
  type        suggestion_type not null default 'related',
  sort_order  int not null default 0,
  primary key (product_id, suggested_product_id, type),
  check (product_id <> suggested_product_id)
);

-- ============================================================
-- PRICING: DISCOUNTS & COUPONS
-- ============================================================
create table discounts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  scope       discount_scope not null,
  product_id  uuid references products(id)   on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  type        discount_type not null,
  value       numeric(12,2) not null check (value > 0),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,                      -- null = open-ended
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  check (
    (scope = 'product'  and product_id is not null and category_id is null) or
    (scope = 'category' and category_id is not null and product_id is null) or
    (scope = 'all'      and product_id is null and category_id is null)
  ),
  check (type <> 'percentage' or value <= 100)
);

create table coupons (
  id          uuid primary key default gen_random_uuid(),
  code        citext not null unique,
  type        discount_type not null,
  value       numeric(12,2) not null check (value > 0),
  min_order_total    numeric(12,2) not null default 0,
  max_uses           int,                       -- null = unlimited
  used_count         int not null default 0,
  per_customer_limit int not null default 1,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  check (type <> 'percentage' or value <= 100)
);

create table coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references coupons(id) on delete cascade,
  customer_id uuid not null,
  order_id    uuid not null,                    -- FK added after orders table
  created_at  timestamptz not null default now()
);

-- ============================================================
-- CUSTOMERS & ADDRESSES
-- ============================================================
create table customers (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  email           citext,
  phone           text,
  preferred_locale locale_code not null default 'en',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table delivery_zones (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,                     -- 'Colombo & Suburbs' / 'Outstation'
  fee        numeric(12,2) not null check (fee >= 0),
  sort_order int not null default 0,
  is_active  boolean not null default true,
  updated_at timestamptz not null default now()
);

create table addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  recipient   text not null,
  phone       text not null,
  line1       text not null,
  line2       text,
  city        text not null,
  district    text,
  postal_code text,
  delivery_zone_id uuid references delivery_zones(id),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ORDERS
-- ============================================================
create sequence order_number_seq start 1000;

create table orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  text not null unique
                default ('ORD-' || lpad(nextval('order_number_seq')::text, 6, '0')),
  customer_id   uuid not null references customers(id),
  status        order_status   not null default 'pending',
  payment_status payment_status not null default 'unpaid',

  -- money (all LKR)
  currency       text not null default 'LKR',
  subtotal       numeric(12,2) not null check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  delivery_fee   numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total          numeric(12,2) not null check (total >= 0),

  coupon_id     uuid references coupons(id),
  coupon_code   citext,                          -- snapshot

  delivery_zone_id   uuid references delivery_zones(id),
  delivery_zone_name text,                       -- snapshot
  shipping_address   jsonb not null,             -- SNAPSHOT, never a live FK
  customer_phone     text not null,              -- for WhatsApp touchpoint

  -- PayHere
  payhere_payment_id text,
  payhere_method     text,

  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id),
  variant_id  uuid references product_variants(id),
  -- snapshots so history survives catalog edits
  product_name text not null,
  variant_name text,
  sku          text not null,
  unit_price     numeric(12,2) not null check (unit_price >= 0),
  discount_each  numeric(12,2) not null default 0,
  qty            int not null check (qty > 0),
  line_total     numeric(12,2) not null check (line_total >= 0)
);

alter table coupon_redemptions
  add constraint coupon_redemptions_order_fk
  foreign key (order_id) references orders(id) on delete cascade;

-- Audit trail: every status change, who and when
create table order_status_log (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status   order_status not null,
  changed_by  uuid,                              -- auth.uid() or null = system/webhook
  note        text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- STOCK
-- ============================================================
create table stock_movements (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references product_variants(id) on delete cascade,
  type        stock_movement_type not null,
  qty_change  int not null,                      -- negative for sale/reservation
  order_id    uuid references orders(id) on delete set null,
  staff_id    uuid,
  note        text,
  created_at  timestamptz not null default now()
);

-- Checkout reservations (prevent overselling); expired rows released by cron
create table stock_reservations (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  variant_id  uuid not null references product_variants(id) on delete cascade,
  qty         int not null check (qty > 0),
  expires_at  timestamptz not null,
  released    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- PAYMENTS / WEBHOOKS / EVENTS / FLAGS
-- ============================================================
-- Raw PayHere webhook log: reconciliation + dispute evidence
create table payment_events (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null default 'payhere',
  order_id    uuid references orders(id) on delete set null,
  event_type  text,
  payload     jsonb not null,
  signature_valid boolean,
  created_at  timestamptz not null default now()
);

-- Generic event log: feeds analytics, forecasting, auto-recommendations later
create table events (
  id          bigint generated always as identity primary key,
  event_type  text not null,                     -- 'view_product','add_to_cart',...
  customer_id uuid,
  session_id  text,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Web push subscriptions (PWA scaffold)
create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  endpoint    text not null unique,
  keys        jsonb not null,                    -- {p256dh, auth}
  created_at  timestamptz not null default now()
);

-- Progressive rollout of future modules
create table feature_flags (
  key        text primary key,
  is_enabled boolean not null default false,
  payload    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_categories_parent       on categories(parent_id);
create index idx_products_category       on products(category_id) where is_active;
create index idx_products_search         on products using gin(search_tsv);
create index idx_variants_product        on product_variants(product_id);
create index idx_images_product          on product_images(product_id, sort_order);
create index idx_suggestions_product     on product_suggestions(product_id, type);
create index idx_discounts_window        on discounts(starts_at, ends_at) where is_active;
create index idx_discounts_product       on discounts(product_id)  where product_id is not null;
create index idx_discounts_category      on discounts(category_id) where category_id is not null;
create index idx_addresses_customer      on addresses(customer_id);
create index idx_orders_customer         on orders(customer_id, created_at desc);
create index idx_orders_status           on orders(status, created_at desc);
create index idx_order_items_order       on order_items(order_id);
create index idx_status_log_order        on order_status_log(order_id, created_at);
create index idx_stock_movements_variant on stock_movements(variant_id, created_at desc);
create index idx_reservations_expiry     on stock_reservations(expires_at) where not released;
create index idx_payment_events_order    on payment_events(order_id);
create index idx_events_type_time        on events(event_type, created_at desc);
create index idx_coupon_redemptions_cust on coupon_redemptions(coupon_id, customer_id);
