-- ============================================================
-- 0022_legacy_products_seo_meta.sql
-- The 10 original/legacy products (Nokia 105, 1208, 216, 2200, 5130,
-- 6120 Classic, 6300, C3, Samsung C3520, Metro B310) had descriptions and
-- specs, but no meta_title/meta_description at all — Google was
-- auto-generating their search snippets instead of using targeted copy.
-- These are exactly the products with real, low-competition search demand
-- per keyword research (e.g. "nokia 105 price in sri lanka", 1.3K/mo,
-- KD 6). Every other product added since already had this covered.
-- ============================================================

update products set
  meta_title = 'Nokia 105 Price in Sri Lanka | Techno Zone Lanka',
  meta_description = 'Nokia 105 basic phone in Sri Lanka — 35-day standby, FM radio, flashlight. Genuine warranty, islandwide delivery, cash on delivery available.'
where slug = 'nokia-105';

update products set
  meta_title = 'Nokia 1208 Price in Sri Lanka | Techno Zone Lanka',
  meta_description = 'Nokia 1208 basic phone in Sri Lanka with built-in torch and tough body. Genuine warranty, islandwide delivery, cash on delivery available.'
where slug = 'nokia-1208';

update products set
  meta_title = 'Nokia 216 Dual SIM Price in Sri Lanka | Techno Zone',
  meta_description = 'Nokia 216 Dual SIM phone in Sri Lanka with camera, FM radio and Opera Mini browser. Genuine warranty, islandwide delivery available.'
where slug = 'nokia-216';

update products set
  meta_title = 'Nokia 2200 Price in Sri Lanka | Techno Zone Lanka',
  meta_description = 'Nokia 2200 Dual SIM basic phone in Sri Lanka with FM radio and flashlight. Genuine warranty, islandwide delivery, cash on delivery available.'
where slug = 'nokia-2200';

update products set
  meta_title = 'Nokia 5130 XpressMusic Price in Sri Lanka | Techno Zone',
  meta_description = 'Nokia 5130 XpressMusic in Sri Lanka — dedicated music keys, 2MP camera, FM radio. Genuine warranty, islandwide delivery available.'
where slug = 'nokia-5130';

update products set
  meta_title = 'Nokia 6120 Classic Price in Sri Lanka | Techno Zone',
  meta_description = 'Nokia 6120 Classic Symbian smartphone in Sri Lanka with 3G and a 2MP camera. Genuine warranty, islandwide delivery, cash on delivery available.'
where slug = 'nokia-6120-classic';

update products set
  meta_title = 'Nokia 6300 Price in Sri Lanka | Techno Zone Lanka',
  meta_description = 'Classic Nokia 6300 stainless-steel phone in Sri Lanka with camera, MP3 player, Bluetooth. Genuine warranty, islandwide delivery available.'
where slug = 'nokia-6300';

update products set
  meta_title = 'Nokia C3 QWERTY Price in Sri Lanka | Techno Zone Lanka',
  meta_description = 'Nokia C3 QWERTY messaging phone in Sri Lanka with Wi-Fi and FM radio. Genuine warranty, islandwide delivery, cash on delivery available.'
where slug = 'nokia-c3';

update products set
  meta_title = 'Samsung C3520 Flip Price in Sri Lanka | Techno Zone',
  meta_description = 'Samsung C3520 flip phone in Sri Lanka with camera, FM radio and Bluetooth. Genuine warranty, islandwide delivery, cash on delivery available.'
where slug = 'samsung-c3520';

update products set
  meta_title = 'Samsung Metro B310 Price in Sri Lanka | Techno Zone',
  meta_description = 'Samsung Metro B310 Dual SIM phone in Sri Lanka with FM radio and MP3 player. Genuine warranty, islandwide delivery, cash on delivery available.'
where slug = 'samsung-metro-b310';
