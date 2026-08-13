-- ============================================================
-- 0019_remove_colors_from_specs.sql
-- Removes the "Colors" text entry from products.specs everywhere.
-- Colour is already represented properly via product_variants (real
-- selectable colour swatches), so a duplicate "Colors: Black, Blue..."
-- line in the specs list was redundant and could drift out of sync.
-- ============================================================

update products set specs = specs - 'Colors' where specs ? 'Colors';
