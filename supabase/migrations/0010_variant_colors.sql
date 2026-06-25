-- 0010_variant_colors.sql
-- Adds the colour + RAM/ROM variant system used by the admin variant builder
-- and the storefront colour picker.
--
-- Design recap:
--  * A product's variants live in product_variants.attributes as
--    {"ram":"4GB","rom":"64GB","color":"Blue"} (color only when no ram/rom, etc).
--  * Each COLOUR has one photo (product_images, linked by variant_id) and a hex
--    swatch (picked via the in-app eyedropper). Names are intentionally omitted —
--    the swatch circle + photo represent the colour to customers.
--  * Stock is per exact variant row (colour x ram/rom combo).

-- 1) Per-product toggle: does this product use RAM/ROM variants?
--    Off  -> colours only (or single).  On -> colour x ram/rom grid.
alter table products
  add column if not exists has_storage_variants boolean not null default false;

-- 2) Colour hex lives on the image row (one photo per colour) so the storefront
--    can paint the swatch and swap the photo from a single fetch.
alter table product_images
  add column if not exists color_hex text
    check (color_hex is null or color_hex ~* '^#[0-9a-f]{6}$');

-- Helpful index: fetch a product's colour images (those carrying a hex) in order.
create index if not exists idx_product_images_color
  on product_images (product_id, sort_order)
  where color_hex is not null;

-- 3) Reusable RAM/ROM presets so staff tick instead of retyping. Newly added
--    combos persist here for next time. Global list (not per product).
create table if not exists ram_rom_presets (
  id          uuid primary key default gen_random_uuid(),
  ram         text not null,                 -- e.g. '8GB'
  rom         text not null,                 -- e.g. '128GB'
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (ram, rom)
);

-- Seed the common Sri-Lanka phone tiers (safe to re-run).
insert into ram_rom_presets (ram, rom, sort_order) values
  ('2GB','32GB',10),
  ('3GB','32GB',20),
  ('4GB','64GB',30),
  ('4GB','128GB',40),
  ('6GB','64GB',50),
  ('6GB','128GB',60),
  ('8GB','128GB',70),
  ('8GB','256GB',80),
  ('12GB','256GB',90)
on conflict (ram, rom) do nothing;

-- RLS: presets are readable by anyone (admin UI), writable by service role only.
alter table ram_rom_presets enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'ram_rom_presets' and policyname = 'ram_rom_presets_read'
  ) then
    create policy ram_rom_presets_read on ram_rom_presets
      for select using (true);
  end if;
end $$;
