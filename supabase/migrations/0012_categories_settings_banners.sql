-- ============================================================================
-- 0012  Category images · site settings · homepage banner CMS
--
--   Adds:
--     1. categories.image_path        — optional tile/banner image per category
--     2. site_settings                — key/value store for store info and the
--                                        free-delivery-over threshold (public read)
--     3. homepage_banners             — admin-managed promo banners for the
--                                        homepage (replaces hardcoded promo cards)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Category image
-- ---------------------------------------------------------------------------
alter table categories add column if not exists image_path text;

-- ---------------------------------------------------------------------------
-- 2. Site settings — small admin-editable config (currently: free-delivery
--    threshold). Store branding stays in lib/site.ts (single source of truth
--    for name/whatsapp/url), so it's deliberately not duplicated here.
-- ---------------------------------------------------------------------------
create table if not exists site_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into site_settings (key, value) values
  ('shipping', '{"free_over":0}')
on conflict (key) do nothing;

alter table site_settings enable row level security;
create policy site_settings_public_read on site_settings
  for select using (true);
create policy site_settings_owner_write on site_settings
  for all using (public.staff_role() in ('owner','manager'))
  with check (public.staff_role() in ('owner','manager'));

-- ---------------------------------------------------------------------------
-- 3. Homepage banners — admin-managed promo cards for the storefront homepage
-- ---------------------------------------------------------------------------
create table if not exists homepage_banners (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  subtitle    text,
  badge_text  text,
  image_path  text,
  link_url    text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_homepage_banners_active
  on homepage_banners (sort_order) where is_active;

alter table homepage_banners enable row level security;
create policy homepage_banners_read on homepage_banners
  for select using (
    (is_active
     and (starts_at is null or starts_at <= now())
     and (ends_at   is null or ends_at   >= now()))
    or public.is_staff()
  );
create policy homepage_banners_write on homepage_banners
  for all using (public.staff_role() in ('owner','manager'))
  with check (public.staff_role() in ('owner','manager'));
