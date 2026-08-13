const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  dotenv.config({ path: '.env' });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env or .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const uploadDir = "C:\\Users\\dilushika\\Downloads\\New folder (9)";

const mapping = {
  "20w 2.jpeg": "c0000000-0000-4000-8000-0000000c0d02",
  "20w.jpeg": "c0000000-0000-4000-8000-0000000c0d02",
  "30w 2.jpeg": "c0000000-0000-4000-8000-0000000c0d03",
  "30w.jpeg": "c0000000-0000-4000-8000-0000000c0d03",
  "a23 2.jpeg": "c0000000-0000-4000-8000-00000000a023",
  "a23.jpeg": "c0000000-0000-4000-8000-00000000a023",
  "a27 2.jpeg": "c0000000-0000-4000-8000-00000000a027",
  "a27.jpeg": "c0000000-0000-4000-8000-00000000a027",
  "cb 32 2.jpeg": "c0000000-0000-4000-8000-0000000cb320",
  "cb 32 3.jpeg": "c0000000-0000-4000-8000-0000000cb320",
  "cb 32.jpeg": "c0000000-0000-4000-8000-0000000cb320",
  "cb 33.jpeg": "c0000000-0000-4000-8000-0000000cb330",
  "lightning.jpeg": "c0000000-0000-4000-8000-0000000cb331"
};

async function uploadFiles() {
  for (const [filename, productId] of Object.entries(mapping)) {
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${filename} - not found`);
      continue;
    }

    try {
      console.log(`Processing ${filename} for product ${productId}...`);
      
      const buf = fs.readFileSync(filePath);
      
      // Compress using sharp
      const optimizedBuf = await sharp(buf)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
      
      const storagePath = `${productId}/colors/${Date.now()}-${filename.replace(/[^a-zA-Z0-9]/g, '')}.webp`;
      
      // Upload to storage
      const { error: upErr } = await supabase.storage.from('product-images')
        .upload(storagePath, optimizedBuf, { contentType: 'image/webp', upsert: true });
        
      if (upErr) {
        console.error(`Failed to upload ${filename} to storage:`, upErr.message);
        continue;
      }
      
      // Insert into product_images table
      const { error: dbErr } = await supabase.from('product_images').insert({
        product_id: productId,
        storage_path: storagePath,
        alt: filename,
        sort_order: 99
      });
      
      if (dbErr) {
        console.error(`Failed to link ${filename} in database:`, dbErr.message);
      } else {
        console.log(`Successfully uploaded and linked ${filename}`);
      }
      
    } catch (err) {
      console.error(`Error processing ${filename}:`, err);
    }
  }
  
  console.log('All files processed!');
}

uploadFiles();
