-- ============================================================
-- 0017_nokia_catalog_refresh.sql
-- Reconciles the Techno Zone catalog against the latest supplier
-- price-list images (2026-08-12).
--
-- PART A: price corrections + reactivations for devices ALREADY in the
-- catalog (checked against `products` before writing this migration —
-- these are updates, not new rows).
-- PART B: brand-new devices from the same image batch that were not
-- already in the catalog. One image (Nokia 2720 Flip in black) was a
-- duplicate marketing photo of an existing new item, not a separate
-- product, so it was skipped to avoid a duplicate listing.
-- ============================================================

-- ---------- PART A: price + reactivation updates ----------
update products set base_price = 5990, updated_at = now()
  where id = 'a0000000-0000-4000-8000-000000000105';               -- Nokia 105
update product_variants set price = 5990, updated_at = now()
  where product_id = 'a0000000-0000-4000-8000-000000000105';

update products set base_price = 7690, is_active = true, updated_at = now()
  where id = 'a0000000-0000-4000-8000-000000001100';               -- Nokia 1100 (was inactive)
update product_variants set price = 7690, updated_at = now()
  where product_id = 'a0000000-0000-4000-8000-000000001100';

update products set base_price = 5990, is_active = true, updated_at = now()
  where id = 'a0000000-0000-4000-8000-000000001110';               -- Nokia 1110 (was inactive)
update product_variants set price = 5990, updated_at = now()
  where product_id = 'a0000000-0000-4000-8000-000000001110';

update products set base_price = 5990, updated_at = now()
  where id = 'a0000000-0000-4000-8000-000000001208';               -- Nokia 1208
update product_variants set price = 5990, updated_at = now()
  where product_id = 'a0000000-0000-4000-8000-000000001208';

update products set base_price = 7990, updated_at = now()
  where id = 'a0000000-0000-4000-8000-000000000216';               -- Nokia 216
update product_variants set price = 7990, updated_at = now()
  where product_id = 'a0000000-0000-4000-8000-000000000216';

-- Nokia 2200: price-list image shows Rs.5990 but the phone pictured looks
-- like a Nokia 1200, not the actual (slide-form) Nokia 2200 — price
-- updated as instructed; flagging the photo mismatch for you to confirm
-- with the supplier before the next image upload.
update products set base_price = 5990, updated_at = now()
  where id = 'a0000000-0000-4000-8000-000000002200';               -- Nokia 2200
update product_variants set price = 5990, updated_at = now()
  where product_id = 'a0000000-0000-4000-8000-000000002200';

update products set base_price = 6990, updated_at = now()
  where id = 'a0000000-0000-4000-8000-000000005130';               -- Nokia 5130 XpressMusic
update product_variants set price = 6990, updated_at = now()
  where product_id = 'a0000000-0000-4000-8000-000000005130';

update products set base_price = 6600, updated_at = now()
  where id = 'a0000000-0000-4000-8000-0000000b3100';               -- Samsung Metro B310
update product_variants set price = 6600, updated_at = now()
  where product_id = 'a0000000-0000-4000-8000-0000000b3100';

-- ---------- PART B: brand-new devices ----------
-- Fixed ids so product_images can reference them once you upload photos
-- (storage path convention: {product_id}/main.jpg in the products bucket).
insert into products (id, category_id, slug, name, brand, base_price, warranty_months, is_active)
values
  ('b0000000-0000-4000-8000-000000002720', '9a6ae4dc-b558-4a98-b1de-6801c6ce3c0c', 'nokia-2720-flip', 'Nokia 2720 Flip Dual SIM',    'Nokia', 9900,  12, true),
  ('b0000000-0000-4000-8000-0000000a1010', '9a6ae4dc-b558-4a98-b1de-6801c6ce3c0c', 'nokia-x1-01',      'Nokia X1-01',                 'Nokia', 8900,  12, true),
  ('b0000000-0000-4000-8000-00000000c201', '9a6ae4dc-b558-4a98-b1de-6801c6ce3c0c', 'nokia-c2-01',      'Nokia C2-01',                 'Nokia', 9900,  12, true),
  ('b0000000-0000-4000-8000-000000001280', '9a6ae4dc-b558-4a98-b1de-6801c6ce3c0c', 'nokia-1280',       'Nokia 1280',                  'Nokia', 5990,  12, true),
  ('b0000000-0000-4000-8000-000000000101', '9a6ae4dc-b558-4a98-b1de-6801c6ce3c0c', 'nokia-101',        'Nokia 101 Dual SIM',          'Nokia', 5990,  12, true),
  ('b0000000-0000-4000-8000-000000000100', '9a6ae4dc-b558-4a98-b1de-6801c6ce3c0c', 'nokia-100',        'Nokia 100',                   'Nokia', 5990,  12, true),
  ('b0000000-0000-4000-8000-000000000108', '9a6ae4dc-b558-4a98-b1de-6801c6ce3c0c', 'nokia-108',        'Nokia 108 Dual SIM',          'Nokia', 7990,  12, true),
  ('b0000000-0000-4000-8000-000000000206', '9a6ae4dc-b558-4a98-b1de-6801c6ce3c0c', 'nokia-206',        'Nokia 206 Dual SIM',          'Nokia', 9900,  12, true),
  ('b0000000-0000-4000-8000-000000002760', '9a6ae4dc-b558-4a98-b1de-6801c6ce3c0c', 'nokia-2760-flip',  'Nokia 2760 Flip Dual SIM',    'Nokia', 9900,  12, true),
  ('b0000000-0000-4000-8000-000000003310', '9a6ae4dc-b558-4a98-b1de-6801c6ce3c0c', 'nokia-3310',       'Nokia 3310',                  'Nokia', 11900, 12, true),
  ('b0000000-0000-4000-8000-000000002220', '9a6ae4dc-b558-4a98-b1de-6801c6ce3c0c', 'nokia-2220',       'Nokia 2220',                  'Nokia', 7990,  12, true)
on conflict (id) do nothing;

insert into product_variants (product_id, sku, name, price, stock_qty, is_default)
values
  ('b0000000-0000-4000-8000-000000002720', 'NOK-2720F', 'Default', 9900,  10, true),
  ('b0000000-0000-4000-8000-0000000a1010', 'NOK-X101',  'Default', 8900,  10, true),
  ('b0000000-0000-4000-8000-00000000c201', 'NOK-C201',  'Default', 9900,  10, true),
  ('b0000000-0000-4000-8000-000000001280', 'NOK-1280',  'Default', 5990,  10, true),
  ('b0000000-0000-4000-8000-000000000101', 'NOK-101',   'Default', 5990,  10, true),
  ('b0000000-0000-4000-8000-000000000100', 'NOK-100',   'Default', 5990,  10, true),
  ('b0000000-0000-4000-8000-000000000108', 'NOK-108',   'Default', 7990,  10, true),
  ('b0000000-0000-4000-8000-000000000206', 'NOK-206',   'Default', 9900,  10, true),
  ('b0000000-0000-4000-8000-000000002760', 'NOK-2760F', 'Default', 9900,  10, true),
  ('b0000000-0000-4000-8000-000000003310', 'NOK-3310',  'Default', 11900, 10, true),
  ('b0000000-0000-4000-8000-000000002220', 'NOK-2220',  'Default', 7990,  10, true)
on conflict (sku) do nothing;
