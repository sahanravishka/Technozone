'use client';

import { useState } from 'react';

// How far from a perfect 1:1 we still accept (5% — tolerates minor crop rounding).
const TOLERANCE = 0.05;

/**
 * File input that strictly enforces square (1:1) product images on the client.
 * It measures the selected image's real pixel dimensions and uses native
 * constraint validation (setCustomValidity) so the form cannot be submitted
 * until a square image is chosen — keeping every product photo uniform.
 */
export default function SquareImageInput({ name = 'image', className = '' }:
  { name?: string; className?: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

    // Block submission until we've confirmed the dimensions (async read).
    input.setCustomValidity('Checking image…');

    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      const off = Math.abs(w - h) / Math.max(w, h);
      if (off > TOLERANCE) {
        const text = `Image must be square (1:1). This one is ${w}×${h}. Crop to a square (e.g. 1200×1200) and re-upload.`;
        input.setCustomValidity(text);
        setMsg({ ok: false, text });
      } else {
        input.setCustomValidity('');
        setMsg({ ok: true, text: `Square image ✓ (${w}×${h})` });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      input.setCustomValidity('Could not read this image — try another file.');
      setMsg({ ok: false, text: 'Could not read this image — try another file.' });
    };
    img.src = url;
  };

  return (
    <div>
      <input name={name} type="file" accept="image/*" onChange={onChange} className={className} />
      {msg && (
        <p className={`mt-1 text-[11.5px] font-medium ${msg.ok ? 'text-ok' : 'text-sale'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
