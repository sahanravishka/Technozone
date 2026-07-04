-- ============================================================
-- 0014: Per-product SEO overrides
-- Lets staff hand-tune the <title> and meta description for any
-- product from the admin panel (with a live Google preview).
-- When null, the storefront falls back to the automatic
-- "<Name> Price in Sri Lanka" template.
-- ============================================================

alter table products add column if not exists meta_title       text;
alter table products add column if not exists meta_description text;

comment on column products.meta_title       is 'SEO title override; null = auto "<name> Price in Sri Lanka"';
comment on column products.meta_description is 'SEO meta description override; null = auto-generated';
