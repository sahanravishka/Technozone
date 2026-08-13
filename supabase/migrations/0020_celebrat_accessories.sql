-- ============================================================
-- 0020_celebrat_accessories.sql
-- New Celebrat-brand chargers, cables and headphones, priced from a
-- supplier WhatsApp price list (2026-08-13). Specs sourced from
-- celebrat.com, Amazon.eg, Daraz.lk and Sri Lankan retailer listings.
-- Chargers/cables carry a "Fast Charging" spec flag which drives the
-- animated fast-charge badge on the storefront (FastChargeBadge.tsx).
-- No product photos yet — pending real photos from the supplier folder.
-- ============================================================

insert into products (id, category_id, slug, name, brand, base_price, warranty_months, is_active,
  description, specs, meta_title, meta_description)
values
  (
    'c0000000-0000-4000-8000-0000000c0015',
    'ebed354b-a78a-49cf-86d2-b90e8c40b2b8', -- Chargers & Cables
    'celebrat-ch15-20w-uk-charger', 'Celebrat C-H15 UK Fast Charger 20W', 'Celebrat', 1900, 6, true,
    'The Celebrat C-H15 packs dual USB-A fast charging into a compact UK plug, getting your phone to over 80% in around 40 minutes. Smart chip technology protects your battery from overcharging and overheating, so you can top up quickly without worrying about your device.',
    '{"Output":"2x USB-A, up to 20W combined","Fast Charging":"Yes — up to 80% in ~40 minutes","Input":"AC 100–240V, 50/60Hz","Plug":"UK 3-pin","Protection":"Over-current, over-voltage, over-temperature","Warranty":"6 months"}'::jsonb,
    'Celebrat C-H15 UK Fast Charger 20W Price in Sri Lanka | Techno Zone',
    'Celebrat C-H15 UK 20W dual USB-A fast charger in Sri Lanka. Charges to 80% in 40 minutes. Genuine warranty, islandwide delivery, cash on delivery available.'
  ),
  (
    'c0000000-0000-4000-8000-0000000c0d02',
    'ebed354b-a78a-49cf-86d2-b90e8c40b2b8',
    'celebrat-cd02-20w-pd-charger', 'Celebrat C-D02 20W PD UK Fast Charger', 'Celebrat', 1900, 6, true,
    'A single USB-C Power Delivery port rated for a full 20W, the Celebrat C-D02 fast-charges modern phones — including iPhones — well past the point older chargers give up. PD and PPS protocol support means it negotiates the fastest safe speed automatically with whatever you plug in.',
    '{"Output":"USB-C PD, up to 20W (5V/3A, 9V/2.22A, 12V/1.6A)","Fast Charging":"Yes — PD + PPS fast charging","Input":"AC 100–240V, 50/60Hz","Plug":"UK 3-pin","Protection":"Over-current, over-voltage, over-temperature","Warranty":"6 months"}'::jsonb,
    'Celebrat C-D02 20W PD UK Charger Price in Sri Lanka | Techno Zone',
    'Celebrat C-D02 20W USB-C PD fast charger in Sri Lanka — PD/PPS support for iPhone and Android. Genuine warranty, islandwide delivery, cash on delivery.'
  ),
  (
    'c0000000-0000-4000-8000-0000000c0d03',
    'ebed354b-a78a-49cf-86d2-b90e8c40b2b8',
    'celebrat-cd03-30w-gan-charger', 'Celebrat C-D03 30W GaN UK Fast Charger', 'Celebrat', 2300, 6, true,
    'Built on compact GaN technology, the Celebrat C-D03 delivers a full 30W over USB-C while staying small enough to disappear in a bag. It speaks PD, PPS, AFC and FCP, so it fast-charges iPhones, Samsung, and most other phones at their maximum safe rate.',
    '{"Output":"USB-C PD, up to 30W","Fast Charging":"Yes — PD, PPS, AFC, FCP protocols","Technology":"GaN (Gallium Nitride)","Input":"AC 100–240V, universal voltage","Plug":"UK 3-pin with positioning foot","Protection":"Full over-current/voltage/temperature protection","Warranty":"6 months"}'::jsonb,
    'Celebrat C-D03 30W GaN UK Fast Charger Price in Sri Lanka | Techno Zone',
    'Celebrat C-D03 30W GaN USB-C fast charger in Sri Lanka — PD/PPS/AFC/FCP support. Genuine warranty, islandwide delivery, cash on delivery available.'
  ),
  (
    'c0000000-0000-4000-8000-0000000cb330',
    'ebed354b-a78a-49cf-86d2-b90e8c40b2b8',
    'celebrat-cb33-micro-cable', 'Celebrat CB-33 Fast Data Cable (Micro USB)', 'Celebrat', 750, 6, true,
    'A dependable everyday Micro USB cable, the Celebrat CB-33 charges at up to 3A and syncs data at up to 480Mbps, wrapped in a durable flat, tangle-free design that holds up to daily use.',
    '{"Connector":"USB-A to Micro USB","Fast Charging":"Yes — up to 3A","Data Transfer":"Up to 480 Mbps","Length":"1 metre","Design":"Flat, tangle-free TPE","Warranty":"6 months"}'::jsonb,
    'Celebrat CB-33 Micro USB Fast Data Cable Price in Sri Lanka | Techno Zone',
    'Celebrat CB-33 Micro USB fast charging cable in Sri Lanka — 3A charging, 480Mbps data transfer. Genuine warranty, islandwide delivery available.'
  ),
  (
    'c0000000-0000-4000-8000-0000000cb320',
    'ebed354b-a78a-49cf-86d2-b90e8c40b2b8',
    'celebrat-cb32-typec-cable', 'Celebrat CB-32 Fast Data Cable (Type-C, Braided)', 'Celebrat', 900, 6, true,
    'The Celebrat CB-32 pairs 3A fast charging with a rugged braided nylon jacket, built to survive daily bag-and-pocket wear far longer than a standard rubber cable while keeping your Type-C device charging quickly.',
    '{"Connector":"USB-A to USB-C","Fast Charging":"Yes — up to 3A","Data Transfer":"Up to 480 Mbps","Length":"1 metre","Design":"Braided nylon, tangle-resistant","Warranty":"6 months"}'::jsonb,
    'Celebrat CB-32 Type-C Braided Fast Cable Price in Sri Lanka | Techno Zone',
    'Celebrat CB-32 braided Type-C fast charging cable in Sri Lanka — 3A charging, durable nylon build. Genuine warranty, islandwide delivery available.'
  ),
  (
    'c0000000-0000-4000-8000-0000000cb331',
    'ebed354b-a78a-49cf-86d2-b90e8c40b2b8',
    'celebrat-cb33-lightning-cable', 'Celebrat CB-33 Fast Data Cable (Lightning)', 'Celebrat', 900, 6, true,
    'Built for iPhone, the Celebrat CB-33 Lightning cable delivers 3A fast charging and 480Mbps data sync in a durable, flat tangle-free design that resists everyday wear better than the cable in the box.',
    '{"Connector":"USB-A to Lightning","Fast Charging":"Yes — up to 3A","Data Transfer":"Up to 480 Mbps","Length":"1 metre","Design":"Flat, tangle-free TPE","Compatibility":"iPhone and other Lightning devices","Warranty":"6 months"}'::jsonb,
    'Celebrat CB-33 Lightning Fast Data Cable Price in Sri Lanka | Techno Zone',
    'Celebrat CB-33 Lightning fast charging cable for iPhone in Sri Lanka — 3A charging, 480Mbps data. Genuine warranty, islandwide delivery available.'
  ),
  (
    'c0000000-0000-4000-8000-00000000a028',
    '1302370c-87f0-4be0-b097-c06372f1c1cd', -- Audio
    'celebrat-a28-headphone', 'Celebrat A28 Stereo Headphone HiFi Audio', 'Celebrat', 4600, 6, true,
    'The Celebrat A28 pairs punchy 40mm HD drivers with Bluetooth 5.2 for a stable, clear wireless connection, plus a foldable design that travels well. A built-in mic handles hands-free calls, and a 3.5mm AUX input keeps it working even when the battery runs dry.',
    '{"Bluetooth":"V5.2","Driver":"40mm HD driver","Battery":"200mAh","Playtime":"Up to 12 hours music playback","Microphone":"Built-in, hands-free calling","Wired Mode":"3.5mm AUX supported","Design":"Foldable, over-ear","Warranty":"6 months"}'::jsonb,
    'Celebrat A28 Stereo Headphone Price in Sri Lanka | Techno Zone',
    'Celebrat A28 wireless stereo headphones in Sri Lanka — Bluetooth 5.2, 40mm HD drivers, 12-hour playtime. Genuine warranty, islandwide delivery.'
  ),
  (
    'c0000000-0000-4000-8000-00000000a023',
    '1302370c-87f0-4be0-b097-c06372f1c1cd',
    'celebrat-a23-headphone', 'Celebrat A23 Wireless Headphones', 'Celebrat', 4300, 6, true,
    'The Celebrat A23 goes wherever you do — TF card playback means it works without a phone nearby, and a 3.5mm AUX input keeps the music going once the battery taps out. With up to 80 hours of standby and a 2.5-hour full charge, it is built for all-day, every-day use.',
    '{"Bluetooth":"V5.0","Range":"Up to 10 metres","Battery":"200mAh","Charging Time":"~2.5 hours","Music Time":"~5 hours","Standby Time":"~80 hours","Storage":"TF card support, up to 32GB","Wired Mode":"3.5mm AUX supported","Weight":"~148g","Warranty":"6 months"}'::jsonb,
    'Celebrat A23 Wireless Headphones Price in Sri Lanka | Techno Zone',
    'Celebrat A23 wireless Bluetooth headphones in Sri Lanka — TF card playback, AUX mode, 80-hour standby. Genuine warranty, islandwide delivery.'
  ),
  (
    'c0000000-0000-4000-8000-00000000a027',
    '1302370c-87f0-4be0-b097-c06372f1c1cd',
    'celebrat-a27-headphone', 'Celebrat A27 Stereo Headphone EXT Music', 'Celebrat', 4700, 6, true,
    'The Celebrat A27 steps up to Bluetooth 5.3 for a more stable connection and up to 15 metres of range, paired with 40mm dynamic drivers for deep bass and clear highs. Up to 8 hours of music or calls on a charge, with a soft over-ear fit built for long listening sessions.',
    '{"Bluetooth":"V5.3","Driver":"40mm dynamic driver","Range":"Up to 15 metres","Battery":"200mAh","Music/Call Time":"6–8 hours","Standby Time":"~80 hours","Wired Mode":"3.5mm AUX supported","Design":"Over-ear, adjustable headband","Warranty":"6 months"}'::jsonb,
    'Celebrat A27 Stereo Headphone Price in Sri Lanka | Techno Zone',
    'Celebrat A27 wireless stereo headphones in Sri Lanka — Bluetooth 5.3, 40mm drivers, 6–8 hour battery. Genuine warranty, islandwide delivery.'
  )
on conflict (id) do nothing;

insert into product_variants (product_id, sku, name, price, stock_qty, is_default)
values
  ('c0000000-0000-4000-8000-0000000c0015',  'CEL-CH15',  'Default', 1900, 15, true),
  ('c0000000-0000-4000-8000-0000000c0d02',  'CEL-CD02',  'Default', 1900, 15, true),
  ('c0000000-0000-4000-8000-0000000c0d03',  'CEL-CD03',  'Default', 2300, 15, true),
  ('c0000000-0000-4000-8000-0000000cb330', 'CEL-CB33M', 'Default', 750,  20, true),
  ('c0000000-0000-4000-8000-0000000cb320',  'CEL-CB32',  'Default', 900,  20, true),
  ('c0000000-0000-4000-8000-0000000cb331', 'CEL-CB33L', 'Default', 900,  20, true),
  ('c0000000-0000-4000-8000-00000000a028',  'CEL-A28',   'Default', 4600, 10, true),
  ('c0000000-0000-4000-8000-00000000a023',  'CEL-A23',   'Default', 4300, 10, true),
  ('c0000000-0000-4000-8000-00000000a027',  'CEL-A27',   'Default', 4700, 10, true)
on conflict (sku) do nothing;
