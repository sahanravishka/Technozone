'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { imageUrl } from '@/lib/supabase';
import { uploadProductImage, deleteProductImage } from '@/app/admin/actions';

export default function ExistingImageManager({ 
  productId, 
  images 
}: { 
  productId: string; 
  images: { id: string; storage_path: string }[];
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setBusy(true);
    try {
      const data = new FormData();
      data.append('product_id', productId);
      data.append('file', file);
      await uploadProductImage(data);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Delete this image?')) return;
    setBusy(true);
    try {
      await deleteProductImage(imageId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-card mt-5 overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-paper/60 px-5 py-3.5">
        <div>
          <h3 className="text-[13.5px] font-bold">Product Images</h3>
          <p className="mt-0.5 text-[11.5px] text-muted">Manage photos for this product</p>
        </div>
        <button 
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="pressable rounded-lg bg-volt px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-volt-deep disabled:opacity-50"
        >
          {busy ? 'Uploading...' : '+ Upload Photo'}
        </button>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileRef} 
          className="hidden" 
          onChange={handleUpload} 
        />
      </div>
      <div className="p-4 sm:p-5">
        {images.length === 0 ? (
          <p className="text-center text-[13px] text-muted py-4">No images uploaded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {images.map(img => (
              <div key={img.id} className="relative rounded-xl border border-line p-2">
                <div className="relative h-24 w-24">
                  <Image 
                    src={imageUrl(img.storage_path)} 
                    alt="Product photo" 
                    fill 
                    className="object-contain rounded-lg bg-white" 
                  />
                </div>
                <button 
                  onClick={() => handleDelete(img.id)}
                  disabled={busy}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
