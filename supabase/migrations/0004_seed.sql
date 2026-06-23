-- ============================================================
-- 0004_seed.sql — Baseline data (safe to edit in admin later)
-- ============================================================

insert into roles (name, permissions) values
  ('owner',   '{"all": true}'),
  ('manager', '{"products": "write", "orders": "write", "discounts": "write",
                "coupons": "write", "stock": "write", "reports": "read"}'),
  ('packer',  '{"orders": "update_status", "packing_slips": "print"}')
on conflict (name) do nothing;

-- Tiered courier fees — editable in admin (values are placeholders, LKR)
insert into delivery_zones (name, fee, sort_order) values
  ('Colombo & Suburbs', 350.00, 1),
  ('Outstation',        450.00, 2);

-- Future modules ship behind flags — flip on without redeploying schema
insert into feature_flags (key, is_enabled, payload) values
  ('whatsapp_cloud_api', false, '{}'),         -- manual wa.me button until then
  ('web_push',           true,  '{}'),
  ('reviews',            false, '{}'),
  ('loyalty_wallet',     false, '{}'),
  ('external_search',    false, '{"provider": null}'),
  ('abandoned_cart',     false, '{}'),
  ('auto_recommendations', false, '{}')
on conflict (key) do nothing;

-- Starter category tree (edit/extend in admin)
insert into categories (slug, name, sort_order) values
  ('phones-tablets',  'Phones & Tablets', 1),
  ('audio',           'Audio',            2),
  ('chargers-cables', 'Chargers & Cables',3),
  ('smart-devices',   'Smart Devices',    4),
  ('accessories',     'Accessories',      5)
on conflict (slug) do nothing;

-- ============================================================
-- FIRST OWNER ACCOUNT — run AFTER the owner signs up once via
-- the app (so auth.users has the row), replacing the email:
--
-- insert into staff (user_id, role_id, full_name)
-- select u.id, r.id, 'Shop Owner'
-- from auth.users u, roles r
-- where u.email = 'owner@example.com' and r.name = 'owner';
-- ============================================================
