'use client';

import { useEffect, useRef, useState } from 'react';

// BarcodeDetector is a browser API — not in TS lib yet, declare locally.
interface BarcodeDet {
  detect(src: HTMLVideoElement): Promise<{ rawValue: string; format: string }[]>;
}
interface BarcodeDector {
  new(opts: { formats: string[] }): BarcodeDet;
  getSupportedFormats(): Promise<string[]>;
}

declare const BarcodeDetector: BarcodeDector;

type Props = { onScan: (value: string) => void; onClose: () => void };

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const [err, setErr]           = useState('');
  const [supported, setSupported] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);

    let active = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const formats = await BarcodeDetector.getSupportedFormats();
        const detector = new BarcodeDetector({ formats });

        const tick = async () => {
          if (!active) return;
          try {
            const hits = await detector.detect(video);
            if (hits.length > 0 && hits[0].rawValue) {
              onScan(hits[0].rawValue.trim());
              return;
            }
          } catch { /* video not ready yet */ }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        if (active) setErr(e instanceof Error ? e.message : 'Camera error');
      }
    };

    start();

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [onScan]);

  // Loading state
  if (supported === null) {
    return <div className="flex h-32 items-center justify-center text-[12px] text-muted">Starting camera…</div>;
  }

  // Browser doesn't support BarcodeDetector (Safari/iOS)
  if (!supported) {
    return (
      <div className="rounded-xl bg-paper p-4 text-[12.5px] leading-relaxed text-muted">
        <p className="font-semibold text-ink">Camera scan not available on this browser.</p>
        <p className="mt-1">Use a Bluetooth barcode scanner, or type the IMEI/serial manually.</p>
        <button onClick={onClose} className="pressable mt-3 rounded-lg bg-volt px-4 py-2 text-[12.5px] font-semibold text-white">
          OK, I'll type it
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '4/3' }}>
      {/* Live camera feed */}
      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />

      {/* Targeting overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div className="h-28 w-56 rounded-xl border-2 border-volt shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
        <p className="text-[11px] font-semibold text-white/90 drop-shadow">
          Point at barcode or QR code
        </p>
      </div>

      {/* Close */}
      <button onClick={onClose}
        className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1.5 text-[11.5px] font-semibold text-white backdrop-blur-sm">
        ✕ Cancel
      </button>

      {err && (
        <p className="absolute bottom-2 w-full text-center text-[11px] font-semibold text-red-400 drop-shadow">{err}</p>
      )}
    </div>
  );
}
