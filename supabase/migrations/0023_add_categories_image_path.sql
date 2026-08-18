-- ============================================================
-- 0023_add_categories_image_path.sql
-- The categories table was missing image_path entirely, even though the
-- admin category-image upload feature and the storefront category hero
-- banner both depend on it. This silently broke getCategories() site-wide:
-- selecting a nonexistent column made every call fail and fall through to
-- demo data (real names/slugs, but fake ids like 'c1'-'c5') — harmless
-- today only because every caller routes by slug/name rather than id, but
-- a landmine for anything that starts relying on the real category id.
-- ============================================================

alter table categories add column if not exists image_path text;
