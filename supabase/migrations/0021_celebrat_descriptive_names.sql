-- ============================================================
-- 0021_celebrat_descriptive_names.sql
-- Renames Celebrat cables/chargers to lead with the searchable,
-- descriptive term (connector type / wattage) instead of the brand
-- and model number. Generic terms like "USB to Type-C Cable" get far
-- more search volume than a brand+model nobody has heard of; brand
-- and model now sit at the end as a trust/identification signal.
-- Slugs updated too — safe since these products have no traffic yet.
-- ============================================================

update products set
  name = 'USB to Type-C Fast Charging Cable (3A, Braided) — Celebrat CB-32',
  slug = 'usb-to-typec-fast-charging-cable-celebrat-cb32',
  meta_title = 'USB to Type-C Fast Charging Cable 3A Price in Sri Lanka | Techno Zone',
  meta_description = 'USB to Type-C fast charging cable (3A, braided) in Sri Lanka by Celebrat. Durable nylon build, 480Mbps data transfer. Genuine warranty, islandwide delivery.'
where slug = 'celebrat-cb32-typec-cable';

update products set
  name = 'USB to Micro USB Fast Charging Cable (3A) — Celebrat CB-33',
  slug = 'usb-to-micro-usb-fast-charging-cable-celebrat-cb33',
  meta_title = 'USB to Micro USB Fast Charging Cable 3A Price in Sri Lanka | Techno Zone',
  meta_description = 'USB to Micro USB fast charging cable (3A) in Sri Lanka by Celebrat. Tangle-free flat design, 480Mbps data transfer. Genuine warranty, islandwide delivery.'
where slug = 'celebrat-cb33-micro-cable';

update products set
  name = 'USB to Lightning Fast Charging Cable (3A) — Celebrat CB-33',
  slug = 'usb-to-lightning-fast-charging-cable-celebrat-cb33',
  meta_title = 'USB to Lightning Fast Charging Cable 3A Price in Sri Lanka | Techno Zone',
  meta_description = 'USB to Lightning fast charging cable (3A) for iPhone in Sri Lanka by Celebrat. Tangle-free design, 480Mbps data transfer. Genuine warranty, islandwide delivery.'
where slug = 'celebrat-cb33-lightning-cable';

update products set
  name = '20W Dual USB UK Fast Charger — Celebrat C-H15',
  slug = '20w-dual-usb-uk-fast-charger-celebrat-ch15',
  meta_title = '20W Dual USB Fast Charger Price in Sri Lanka | Techno Zone',
  meta_description = '20W dual USB-A UK fast charger in Sri Lanka by Celebrat. Charges to 80% in 40 minutes. Genuine warranty, islandwide delivery, cash on delivery available.'
where slug = 'celebrat-ch15-20w-uk-charger';

update products set
  name = '20W USB-C PD Fast Charger — Celebrat C-D02',
  slug = '20w-usbc-pd-fast-charger-celebrat-cd02',
  meta_title = '20W USB-C PD Fast Charger Price in Sri Lanka | Techno Zone',
  meta_description = '20W USB-C PD fast charger in Sri Lanka by Celebrat. PD/PPS support for iPhone and Android. Genuine warranty, islandwide delivery, cash on delivery available.'
where slug = 'celebrat-cd02-20w-pd-charger';

update products set
  name = '30W USB-C GaN Fast Charger — Celebrat C-D03',
  slug = '30w-usbc-gan-fast-charger-celebrat-cd03',
  meta_title = '30W USB-C GaN Fast Charger Price in Sri Lanka | Techno Zone',
  meta_description = '30W USB-C GaN fast charger in Sri Lanka by Celebrat. PD/PPS/AFC/FCP support, compact design. Genuine warranty, islandwide delivery, cash on delivery available.'
where slug = 'celebrat-cd03-30w-gan-charger';
