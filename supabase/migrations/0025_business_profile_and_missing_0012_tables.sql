-- ============================================================
-- 0025_business_profile_and_missing_0012_tables.sql
-- Two things happened here:
--
-- 1. Discovered migration 0012 (site_settings + homepage_banners tables)
--    was committed to the repo but never actually applied to the live
--    database — meaning the free-delivery-threshold admin setting and the
--    homepage banners CMS have been silently no-ops this whole time.
--    Applied it now (see inline for the recreated table definitions).
--
-- 2. Added a 'business_profile' site_settings row with the real, verified
--    details from the actual Google Business Profile (address, phone,
--    rating, review count) — used in LocalBusiness structured data on the
--    homepage. Editable at /admin/settings so the rating/review count can
--    be kept accurate as it grows, without a code change each time.
-- ============================================================

-- (site_settings / homepage_banners table creation — see 0012 for full
-- definition; applied directly via Supabase migration tool on 2026-08-22)

insert into site_settings (key, value, updated_at) values (
  'business_profile',
  '{"street":"No 77, University of Sri Jayewardenepura Road, Gangodawila","locality":"Nugegoda","region":"Western Province","phone":"+94702561110","category":"ElectronicsStore","ratingValue":4.8,"reviewCount":6}'::jsonb,
  now()
) on conflict (key) do update set value = excluded.value, updated_at = now();
