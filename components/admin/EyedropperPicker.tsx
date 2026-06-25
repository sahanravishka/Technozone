'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * EyedropperPicker
 * ----------------
 * Pick an exact colour off a photo by dragging a finger (mobile) or moving the
 * mouse (desktop) across the image. A magnifier loupe follows the pointer so the
 * finger never hides the target, and the sampled colour is the AVERAGE of a 5x5
 * pixel block (kills glare / single-pixel noise). Works fully client-side.
 *
 * Usage:
 *   <EyedropperPicker src={objectUrl} value={hex} onChange={setHex} />
 *
 * - `src`     : image URL (object URL or remote)
 * - `value`   : current hex (e.g. '#1b2a6b') or null
 * - `onChange`: called with the hex on every pick (drag = live, release = final)
 */

const SAMPLE = 2; // radius in px around the point -> 5x5 block (2*2+1)

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export default function EyedropperPicker({
  src,
  value,
  onChange,
  className = '',
}: {
  src: string;
  value: string | null;
  onChange: (hex: string) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  // Loupe state: shown while pointer is down/hovering; null hides it.
  const [loupe, setLoupe] = useState<
    { x: number; y: number; hex: string } | null
  >(null);

  // Draw the image onto an offscreen-sized canvas at natural resolution so
  // getImageData reads true pixels regardless of CSS display size.
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      setReady(true);
    };
    img.onerror = () => setReady(false);
    img.src = src;
  }, [src]);

  // Map a client (screen) coordinate to a canvas pixel + sample averaged colour.
  const sampleAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return null;

      const rect = wrap.getBoundingClientRect();
      // Position within the displayed image (0..1), clamped to edges.
      const px = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      const py = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);

      const cx = Math.floor(px * canvas.width);
      const cy = Math.floor(py * canvas.height);

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      // Average a 5x5 block around (cx, cy), clamped to canvas bounds.
      const x0 = Math.max(0, cx - SAMPLE);
      const y0 = Math.max(0, cy - SAMPLE);
      const w = Math.min(canvas.width - x0, SAMPLE * 2 + 1);
      const h = Math.min(canvas.height - y0, SAMPLE * 2 + 1);
      const { data } = ctx.getImageData(x0, y0, w, h);

      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        // Skip fully transparent pixels.
        if (data[i + 3] === 0) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      if (!count) return null;
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      return { hex: toHex(r, g, b), px, py };
    },
    []
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number, commit: boolean) => {
      const s = sampleAt(clientX, clientY);
      if (!s) return;
      setLoupe({ x: s.px, y: s.py, hex: s.hex });
      // Live update while dragging; the latest value is always the chosen one.
      onChange(s.hex);
      if (commit) {
        // keep loupe briefly so the user sees the locked colour
        window.setTimeout(() => setLoupe(null), 600);
      }
    },
    [sampleAt, onChange]
  );

  // ---- Pointer events (covers mouse + touch + pen uniformly) ----
  const draggingRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!ready) return;
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handleMove(e.clientX, e.clientY, false);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    handleMove(e.clientX, e.clientY, false);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    handleMove(e.clientX, e.clientY, true);
  };

  return (
    <div className={className}>
      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative w-full overflow-hidden rounded-xl border border-line touch-none select-none cursor-crosshair bg-[#0b1526]"
        style={{ aspectRatio: '1 / 1' }}
      >
        {/* The visible image (canvas is hidden, used only for pixel reads). */}
        {imgRef.current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Pick colour"
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Crosshair marker at the pick point */}
        {loupe && (
          <div
            className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,.6)]"
            style={{
              left: `${loupe.x * 100}%`,
              top: `${loupe.y * 100}%`,
              background: loupe.hex,
            }}
          />
        )}

        {/* Magnifier loupe — sits above the finger so the target stays visible */}
        {loupe && (
          <div
            className="pointer-events-none absolute z-10 flex flex-col items-center gap-1 -translate-x-1/2"
            style={{
              left: `${loupe.x * 100}%`,
              top: `calc(${loupe.y * 100}% - 92px)`,
            }}
          >
            <div
              className="h-16 w-16 rounded-full border-4 border-white shadow-lg"
              style={{ background: loupe.hex }}
            />
            <span className="rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
              {loupe.hex}
            </span>
          </div>
        )}

        {!ready && (
          <div className="absolute inset-0 grid place-items-center text-xs text-white/70">
            Loading image…
          </div>
        )}
      </div>

      {/* Current value + manual fallback (desktop nicety, also a11y) */}
      <div className="mt-2 flex items-center gap-2">
        <span
          className="h-7 w-7 shrink-0 rounded-full border border-line"
          style={{ background: value || 'transparent' }}
        />
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase());
            else onChange(v); // keep typing; validation on blur/save
          }}
          placeholder="#1b2a6b"
          className="w-28 rounded-lg border border-line bg-transparent px-2 py-1 text-sm"
          aria-label="Colour hex"
        />
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value ?? '') ? (value as string) : '#000000'}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-8 w-8 cursor-pointer rounded border border-line bg-transparent p-0"
          aria-label="Colour picker fallback"
          title="Or pick manually"
        />
        <span className="text-[11px] text-muted">
          Drag on the photo to pick
        </span>
      </div>
    </div>
  );
}
