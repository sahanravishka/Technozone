'use client';

import { useRef, useState } from 'react';

// How far from a perfect 1:1 we still accept (5% — tolerates minor crop rounding).
const TOLERANCE = 0.05;

// Optimization settings — tuned for sharp, clear product photos.
const MAX_DIM = 1600;        // ceiling on the longest side; never upscale below this
const WEBP_QUALITY = 0.9;    // 0.9 = visually lossless, still much smaller than source

/**
 * File input that enforces square (1:1) product images AND optimizes them
 * client-side before upload: downscales to at most MAX_DIM, converts to WebP
 * at high quality. Images are never upscaled, so small sources stay crisp.
 * The compressed file is written back into the input so the existing form
 * submission (field name `image`) uploads it with no server changes.
 */
export default function SquareImageInput({ name = 'image', className = '' }:
  { name?: string; className?: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Draw the image to a canvas at a capped size and export as WebP.
  // Returns the original file untouched if compression wouldn't help.
  const compress = (file: File, img: HTMLImageElement): Promise<File> =>
    new Promise((resolve) => {
      const { naturalWidth: w, naturalHeight: h } = img;
      // Never upscale — only shrink if larger than the ceiling.
      const scale = Math.min(1, MAX_DIM / Math.max(w, h));
      const tw = Math.round(w * scale);
      const th = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);

      // High-quality scaling to avoid blur/aliasing.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, tw, th);

      canvas.toBlob(
        (blob) => {
          // Fall back to original if conversion failed or didn't save space.
          if (!blob || blob.size >= file.size) return resolve(file);
          const base = file.name.replace(/\.[^.]+$/, '');
          resolve(new File([blob], `${base}.webp`, { type: 'image/webp' }));
        },
        'image/webp',
        WEBP_QUALITY
      );
    });

  // Replace the input's file list with the optimized file so the form submits it.
  const setInputFile = (newFile: File) => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(newFile);
    inputRef.current.files = dt.files;
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    input.setCustomValidity('');
    setMsg(null);

    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      input.setCustomValidity('Please choose an image file.');
      setMsg({ ok: false, text: 'Please choose an image file.' });
      return;
    }

    // Block submission until validation + compression finish.
    input.setCustomValidity('Processing image…');
    setBusy(true);

    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = async () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const off = Math.abs(w - h) / Math.max(w, h);

      if (off > TOLERANCE) {
        URL.revokeObjectURL(url);
        setBusy(false);
        const text = `Image must be square (1:1). This one is ${w}×${h}. Crop to a square (e.g. 1600×1600) and re-upload.`;
        input.setCustomValidity(text);
        setMsg({ ok: false, text });
        return;
      }

      try {
        const optimized = await compress(file, img);
        setInputFile(optimized);
        input.setCustomValidity('');
        const before = (file.size / 1024).toFixed(0);
        const after = (optimized.size / 1024).toFixed(0);
        const outW = Math.min(w, MAX_DIM);
        setMsg({
          ok: true,
          text: optimized === file
            ? `Image ready ✓ (${w}×${h}, ${before} KB)`
            : `Optimized ✓ ${outW}×${outW} · ${before} KB → ${after} KB`,
        });
      } catch {
        // If anything fails, keep the original valid file.
        input.setCustomValidity('');
        setMsg({ ok: true, text: 'Image ready ✓ (original)' });
      } finally {
        URL.revokeObjectURL(url);
        setBusy(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setBusy(false);
      input.setCustomValidity('Could not read this image — try another file.');
      setMsg({ ok: false, text: 'Could not read this image — try another file.' });
    };
    img.src = url;
  };

  return (
    <div>
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept="image/*"
        onChange={onChange}
        className={className}
      />
      {busy && <p className="mt-1 text-[11.5px] font-medium text-muted">Optimizing…</p>}
      {msg && (
        <p className={`mt-1 text-[11.5px] font-medium ${msg.ok ? 'text-ok' : 'text-sale'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
