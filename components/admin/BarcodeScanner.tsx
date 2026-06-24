'use client';

import { useRef, useState, useCallback } from 'react';

type Props = { onScan: (value: string) => void; onClose: () => void };

type DetectorLike = {
  detect(src: HTMLVideoElement): Promise<{ rawValue: string }[]>;
};

async function buildDetector(): Promise<DetectorLike> {
  if ('BarcodeDetector' in window) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Native = (window as any).BarcodeDetector;
    const formats = await Native.getSupportedFormats();
    return new Native({ formats });
  }
  // Polyfill for iOS / Safari — loaded lazily so Android users pay nothing
  const { BarcodeDetector: Poly } = await import('barcode-detector/pure');
  const formats = await Poly.getSupportedFormats();
  return new Poly({ formats }) as unknown as DetectorLike;
}

type Phase = 'permission' | 'loading' | 'scanning' | 'error';

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const [phase, setPhase]   = useState<Phase>('permission');
  const [errMsg, setErrMsg] = useState('');

  // Called directly from a button click so iOS grants permission
  const startCamera = useCallback(async () => {
    setPhase('loading');
    try {
      const [stream, detector] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }
        }),
        buildDetector(),
      ]);

      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setPhase('scanning');

      const tick = async () => {
        try {
          const hits = await detector.detect(video);
          if (hits.length > 0 && hits[0].rawValue) {
            // Stop stream before calling onScan so camera light turns off
            streamRef.current?.getTracks().forEach(t => t.stop());
            cancelAnimationFrame(rafRef.current);
            onScan(hits[0].rawValue.trim());
            return;
          }
        } catch { /* video not ready */ }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setPhase('error');
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setErrMsg('Camera access was denied. Please allow camera access in your browser settings and try again.');
      } else if (msg.includes('NotFound')) {
        setErrMsg('No camera found on this device.');
      } else {
        setErrMsg(msg || 'Could not start the camera.');
      }
    }
  }, [onScan]);

  // Clean up stream when modal closes
  const close = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    onClose();
  };

  return (
    <div className="overflow-hidden rounded-xl bg-[#111]" style={{ position: 'relative', aspectRatio: '4/3' }}>

      {/* Video element — always in DOM so stream can attach */}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        className="h-full w-full object-cover"
        style={{ display: phase === 'scanning' ? 'block' : 'none' }}
      />

      {/* ── Phase: ask for permission ── */}
      {phase === 'permission' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-3xl">📷</div>
          <div>
            <p className="text-[13.5px] font-bold text-white">Allow camera access</p>
            <p className="mt-1 text-[11.5px] text-white/60">
              Your browser will ask for permission to use the camera. Tap Allow to start scanning.
            </p>
          </div>
          <button onClick={startCamera}
            className="pressable rounded-xl bg-volt px-6 py-2.5 text-[13px] font-bold text-white">
            Allow &amp; start scanning
          </button>
        </div>
      )}

      {/* ── Phase: loading ── */}
      {phase === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
          <svg className="h-7 w-7 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
          <p className="text-[11.5px] font-semibold opacity-70">Starting camera…</p>
        </div>
      )}

      {/* ── Phase: error ── */}
      {phase === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
          <p className="text-[13px] font-bold text-white">Camera error</p>
          <p className="text-[11px] leading-relaxed text-white/70">{errMsg}</p>
          <div className="flex gap-2">
            <button onClick={() => setPhase('permission')}
              className="rounded-lg bg-volt px-4 py-2 text-[12px] font-semibold text-white">
              Try again
            </button>
            <button onClick={close}
              className="rounded-lg bg-white/15 px-4 py-2 text-[12px] font-semibold text-white">
              Type manually
            </button>
          </div>
        </div>
      )}

      {/* ── Phase: scanning — targeting overlay ── */}
      {phase === 'scanning' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="h-28 w-56 rounded-xl border-2 border-volt shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          <p className="text-[11px] font-semibold text-white/90 drop-shadow">
            Point at barcode or QR code
          </p>
        </div>
      )}

      {/* Close — always visible */}
      <button onClick={close}
        className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1.5 text-[11.5px] font-semibold text-white backdrop-blur-sm">
        ✕ Cancel
      </button>
    </div>
  );
}
