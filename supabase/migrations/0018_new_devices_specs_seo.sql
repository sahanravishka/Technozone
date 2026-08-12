-- ============================================================
-- 0018_new_devices_specs_seo.sql
-- Descriptions, specifications, and SEO metadata for the 11 new Nokia
-- devices added in 0017. Specs sourced from GSMArena/PhoneArena/Wikipedia
-- listings for each model (2026-08-12).
-- ============================================================

update products set
  description = 'The Nokia 2720 Flip brings back the classic clamshell with 4G, VoLTE calling and WhatsApp/Facebook built in. Its outer display shows caller ID before you even flip it open, and big buttons make calling and texting effortless. Backed by genuine warranty and islandwide delivery from Techno Zone Lanka.',
  specs = '{"Display":"2.8\" TFT LCD, 240 x 320px + 1.3\" external display","Camera":"2 MP rear with LED flash","Battery":"1500 mAh Li-Ion, up to 28 days standby","Network":"2G/3G/4G LTE, VoLTE, Wi-Fi hotspot, GPS","Memory":"512 MB RAM, 4 GB storage, microSD up to 32 GB","OS":"KaiOS \u2014 WhatsApp, Facebook, Google Assistant","SIM":"Dual SIM","Dimensions":"104.8 x 54.5 x 18.7 mm","Weight":"118 g","Colors":"Black, Grey"}'::jsonb,
  meta_title = 'Nokia 2720 Flip Dual SIM Price in Sri Lanka | Techno Zone',
  meta_description = 'Buy the Nokia 2720 Flip Dual SIM in Sri Lanka \u2014 4G flip phone with WhatsApp, Facebook and Google Assistant. Genuine warranty, islandwide delivery, cash on delivery available.'
where id = 'b0000000-0000-4000-8000-000000002720';

update products set
  description = 'A rock-solid dual-SIM basic phone built for two numbers, one device. The Nokia X1-01''s loud built-in speaker doubles as an FM radio and MP3 player, and its long-life battery keeps you connected for days. A dependable choice for work and personal lines alike.',
  specs = '{"Display":"1.8\" TFT, 128 x 160px","Camera":"None","Battery":"1320 mAh Li-Ion","Network":"2G GSM, Dual SIM dual standby","Memory":"microSD up to 16 GB","Features":"FM radio with loudspeaker, MP3 player, flashlight","Weight":"91.1 g, 16 mm thickness","SIM":"Dual SIM (5 phonebooks)"}'::jsonb,
  meta_title = 'Nokia X1-01 Dual SIM Price in Sri Lanka | Techno Zone',
  meta_description = 'Nokia X1-01 dual SIM phone in Sri Lanka \u2014 loud FM radio, MP3 player, flashlight and long battery life. Genuine warranty, islandwide delivery from Techno Zone Lanka.'
where id = 'b0000000-0000-4000-8000-0000000a1010';

update products set
  description = 'The Nokia C2-01 pairs a 3.2 MP camera with 3G connectivity in a compact candybar body, so you can browse, email and share photos without breaking the bank. Series 40 keeps things simple and fast, with a battery that easily lasts several days.',
  specs = '{"Display":"2.0\" TFT, 240 x 320px","Camera":"3.2 MP rear","Battery":"1020 mAh Li-Ion (BL-5C)","Network":"2G/3G (GSM + UMTS)","Memory":"64 MB RAM, 128 MB ROM, microSD up to 16 GB","Dimensions":"109.8 x 46.9 x 15.3 mm","Weight":"89 g","SIM":"Single SIM (Mini-SIM)","Colors":"Black, Silver, White"}'::jsonb,
  meta_title = 'Nokia C2-01 Price in Sri Lanka | Techno Zone Lanka',
  meta_description = 'Nokia C2-01 3G candybar phone in Sri Lanka with a 3.2 MP camera. Genuine warranty, islandwide delivery, cash on delivery available at Techno Zone Lanka.'
where id = 'b0000000-0000-4000-8000-00000000c201';

update products set
  description = 'Built for pure reliability, the Nokia 1280 strips away everything but the essentials: calls, texts, and a battery that lasts up to two weeks on standby. Its rugged, lightweight body makes it a favourite backup phone or a first phone for family members.',
  specs = '{"Display":"1.36\" monochrome, 96 x 68px","Camera":"None","Battery":"800 mAh Li-Ion (BL-5CB), up to 14 days standby","Network":"2G GSM 900/1800","Dimensions":"107.2 x 45.1 x 15.3 mm","Weight":"82 g","SIM":"Single SIM","Colors":"Black, Grey, Blue, Orchid"}'::jsonb,
  meta_title = 'Nokia 1280 Price in Sri Lanka | Techno Zone Lanka',
  meta_description = 'Nokia 1280 basic phone in Sri Lanka \u2014 ultra-long battery life, rugged and lightweight. Genuine warranty, islandwide delivery from Techno Zone Lanka.'
where id = 'b0000000-0000-4000-8000-000000001280';

update products set
  description = 'The Nokia 101 packs dual-SIM dual-standby into a pocket-friendly body, so you can keep work and personal numbers on one phone. An MP3 player, FM radio and built-in flashlight round out a genuinely useful everyday phone.',
  specs = '{"Display":"1.8\" TFT, 128 x 160px","Camera":"None","Battery":"1020 mAh Li-Ion","Network":"2G GSM, Dual SIM dual standby","Memory":"microSD card slot","Features":"MP3 player, FM radio, flashlight","Weight":"71 g, 14.9 mm thickness","SIM":"Dual SIM"}'::jsonb,
  meta_title = 'Nokia 101 Dual SIM Price in Sri Lanka | Techno Zone',
  meta_description = 'Nokia 101 dual SIM phone in Sri Lanka with MP3 player, FM radio and flashlight. Genuine warranty, islandwide delivery, cash on delivery available.'
where id = 'b0000000-0000-4000-8000-000000000101';

update products set
  description = 'The Nokia 100 focuses on the basics done right: crystal-clear calls, an exceptionally long battery life of up to 35 days standby, and an FM radio for entertainment on the go. A dependable, no-fuss phone at an unbeatable price.',
  specs = '{"Display":"1.8\" TFT, 128 x 160px","Camera":"None","Battery":"850 mAh Li-Ion (BL-5CB), up to 35 days standby","Network":"2G GSM","Dimensions":"110 x 45.5 x 14.9 mm","Weight":"69.6 g","SIM":"Single SIM","Features":"FM radio, flashlight"}'::jsonb,
  meta_title = 'Nokia 100 Price in Sri Lanka | Techno Zone Lanka',
  meta_description = 'Nokia 100 basic phone in Sri Lanka \u2014 up to 35 days standby, FM radio, flashlight. Genuine warranty, islandwide delivery from Techno Zone Lanka.'
where id = 'b0000000-0000-4000-8000-000000000100';

update products set
  description = 'The Nokia 108 Dual SIM adds a VGA camera to Nokia''s reliable dual-SIM lineup, letting you capture quick snapshots alongside calls and texts on two numbers. With MP3 playback, FM radio and up to 31 days of standby, it''s built for everyday use.',
  specs = '{"Display":"1.8\" TFT, 128 x 160px","Camera":"VGA (0.3 MP) rear","Battery":"950 mAh Li-Ion (BL-4C), up to 31 days standby","Network":"2G GSM, Dual SIM dual standby","Memory":"4 MB RAM, microSD up to 32 GB","Dimensions":"110.4 x 47 x 13.5 mm","Weight":"70.2 g","Colors":"Black, White, Red, Blue, Yellow"}'::jsonb,
  meta_title = 'Nokia 108 Dual SIM Price in Sri Lanka | Techno Zone',
  meta_description = 'Nokia 108 Dual SIM phone in Sri Lanka with VGA camera, FM radio and MP3 player. Genuine warranty, islandwide delivery, cash on delivery available.'
where id = 'b0000000-0000-4000-8000-000000000108';

update products set
  description = 'The Nokia 206 Dual SIM steps up with a bigger 2.4-inch screen and a 1.3 MP camera, plus dual-SIM dual-standby so you never miss a call on either line. FM radio recording, Bluetooth, and expandable storage round out a well-equipped budget phone.',
  specs = '{"Display":"2.4\" TFT, 240 x 320px","Camera":"1.3 MP rear","Battery":"1100 mAh Li-Ion","Network":"2G GSM, GPRS/EDGE, Dual SIM dual standby","Memory":"64 MB internal, microSD up to 32 GB","Dimensions":"116 x 49.4 x 12.4 mm","Weight":"91 g","Colors":"Black, Cyan, Magenta, Yellow, White"}'::jsonb,
  meta_title = 'Nokia 206 Dual SIM Price in Sri Lanka | Techno Zone',
  meta_description = 'Nokia 206 Dual SIM phone in Sri Lanka with 1.3 MP camera, FM radio and Bluetooth. Genuine warranty, islandwide delivery from Techno Zone Lanka.'
where id = 'b0000000-0000-4000-8000-000000000206';

update products set
  description = 'The Nokia 2760 Flip brings 4G, VoLTE and a 5 MP camera to the classic clamshell design, with WhatsApp, Facebook and Google Assistant built in via KaiOS. Its outer display lets you check the time and caller ID without opening the phone.',
  specs = '{"Display":"2.8\" TFT LCD, 240 x 320px + 1.77\" external display","Camera":"5 MP rear with LED flash","Battery":"1450 mAh Li-Ion, removable","Network":"2G/3G/4G LTE, VoLTE, Wi-Fi hotspot, GPS","Memory":"512 MB RAM, 4 GB storage, microSD up to 32 GB","OS":"KaiOS \u2014 WhatsApp, Facebook, Google Assistant","SIM":"Dual SIM","Colors":"Black"}'::jsonb,
  meta_title = 'Nokia 2760 Flip Dual SIM Price in Sri Lanka | Techno Zone',
  meta_description = 'Nokia 2760 Flip Dual SIM in Sri Lanka \u2014 4G flip phone with 5 MP camera, WhatsApp and Google Assistant. Genuine warranty, islandwide delivery available.'
where id = 'b0000000-0000-4000-8000-000000002760';

update products set
  description = 'The legendary Nokia 3310 returns with a 2.4-inch colour screen, a fresh take on Snake, and a battery that lasts up to 22 days on standby. Built like the original, it''s the perfect nostalgic backup phone or digital-detox companion.',
  specs = '{"Display":"2.4\" QVGA TFT, 240 x 320px","Camera":"2 MP rear","Battery":"1200 mAh Li-Ion (BL-5C), up to 22 days standby","Network":"2G GSM","Memory":"16 MB internal, microSD up to 32 GB","OS":"Series 30+ \u2014 includes Snake","Dimensions":"115.6 x 51 x 12.8 mm","Weight":"85 g","Colors":"Grey, Yellow, Blue, Red"}'::jsonb,
  meta_title = 'Nokia 3310 Price in Sri Lanka | Techno Zone Lanka',
  meta_description = 'The iconic Nokia 3310 is back in Sri Lanka \u2014 22-day battery life, classic Snake game, rugged build. Genuine warranty, islandwide delivery, COD available.'
where id = 'b0000000-0000-4000-8000-000000003310';

update products set
  description = 'The Nokia 2220 Slide combines a fun sliding keypad design with a VGA camera and FM radio, all in a compact, colourful body. With up to 20 days of standby time, it''s an easy, affordable phone for everyday calls and texts.',
  specs = '{"Display":"1.8\" TFT, 128 x 160px","Camera":"VGA (0.3 MP) rear","Battery":"860 mAh Li-Ion (BL-4C), up to 20 days standby","Network":"2G GSM, GPRS","Memory":"32 MB internal","Form factor":"Slide","Dimensions":"97.1 x 47 x 15.8 mm","Weight":"93.5 g","Colors":"Grey, Purple, Pink, Blue"}'::jsonb,
  meta_title = 'Nokia 2220 Slide Price in Sri Lanka | Techno Zone',
  meta_description = 'Nokia 2220 Slide phone in Sri Lanka with VGA camera, FM radio and sliding keypad. Genuine warranty, islandwide delivery, cash on delivery available.'
where id = 'b0000000-0000-4000-8000-000000002220';
