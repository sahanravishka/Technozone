'use client';
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { imageUrl } from '@/lib/supabase';
import { formatLKR } from '@/lib/site';
import { priceProduct } from '@/lib/pricing';
import type { Product, Discount } from '@/lib/types';
import type { Dict } from '@/lib/i18n/dictionaries';

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

interface Props {
  products: Product[];
  discounts: Discount[];
  locale: string;
  dict: Dict;
}

export default function FeaturedSpotlight({ products, discounts, locale, dict }: Props) {
  const [idx, setIdx] = useState(products.length > 1 ? 1 : 0);
  const [visible, setVisible] = useState(true);

  const goTo = useCallback((next: number) => {
    setVisible(false);
    setTimeout(() => {
      setIdx(next);
      setVisible(true);
    }, 320);
  }, []);

  // Reset 5-second timer after every transition (auto or manual)
  useEffect(() => {
    if (products.length <= 1) return;
    const t = setTimeout(() => goTo((idx + 1) % products.length), 5000);
    return () => clearTimeout(t);
  }, [idx, products.length, goTo]);

  const spot = products[idx];
  if (!spot) return null;
  const spotImg = spot.product_images?.[0];
  const spotPrice = priceProduct(spot, discounts);

  return (
    <div
      className="grid items-center overflow-hidden bg-deep text-white md:grid-cols-2"
      style={{ borderRadius: '36px' }}
    >
      {/* ── Info panel ── */}
      <div
        className="p-7 sm:p-9 md:p-14"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.32s ease' }}
      >
        <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-accent backdrop-blur-sm sm:mb-4 sm:text-[12px]">
          {dict.home.spotEyebrow}
        </span>

        <h2 className="text-[1.4rem] font-extrabold leading-[1.07] tracking-[-0.03em] sm:text-[1.8rem] md:text-[2.4rem] lg:text-[2.6rem]">
          {spot.name}
        </h2>

        {spot.brand && (
          <p className="mt-2 text-[13px] text-white/60 sm:mt-3 sm:text-[15px]">{spot.brand}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-6 sm:gap-4">
          {spotPrice && (
            <span className="text-[20px] font-extrabold tracking-[-0.02em] sm:text-[26px]">
              {formatLKR(spotPrice.price)}
            </span>
          )}
          <Link
            href={`/${locale}/product/${spot.slug}`}
            className="btn-skew pressable inline-flex h-10 items-center bg-volt px-5 text-[13px] font-bold text-white transition-colors hover:bg-volt-deep sm:h-12 sm:px-7 sm:text-[14.5px]"
          >
            <span className="inline-flex items-center gap-2">
              {dict.home.spotCta} <ArrowIcon />
            </span>
          </Link>
        </div>

        {/* Navigation dots — larger touch target on mobile */}
        {products.length > 1 && (
          <div className="mt-5 flex items-center gap-1 sm:mt-6">
            {products.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Show product ${i + 1}`}
                className="flex h-5 items-center justify-center px-0.5"
              >
                <span
                  className="block rounded-full transition-all duration-300"
                  style={{
                    height: '6px',
                    width: i === idx ? '20px' : '6px',
                    background: i === idx ? 'var(--volt)' : 'rgba(255,255,255,0.3)',
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Product image ── */}
      <div
        className="relative grid place-items-center md:self-stretch"
        style={{
          background: 'radial-gradient(circle at 60% 40%, rgba(83,183,232,.22), transparent 65%)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.32s ease',
        }}
      >
        {spotImg && (
          // Fixed square frame: every featured image fills the SAME box and is
          // contained — never cropped, never distorted, never resizes the layout,
          // whatever dimensions are uploaded.
          <div className="relative aspect-square w-full max-w-[280px] p-6 sm:max-w-[360px] sm:p-8">
            <Image
              src={imageUrl(spotImg.storage_path)}
              alt={spot.name}
              fill
              sizes="(max-width: 768px) 75vw, 360px"
              quality={85}
              className="object-contain transition-transform duration-500 hover:scale-105"
              style={{
                mixBlendMode: 'screen',
                filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
