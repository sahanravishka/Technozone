'use client';

import { useState } from 'react';
import { SITE } from '@/lib/site';

/**
 * Per-product SEO editor with a live Google-result preview.
 * Leave both fields blank and the storefront auto-generates
 * "<Name> Price in Sri Lanka" — the pattern local buyers actually type.
 */
export default function SeoPanel({ productName, slug, metaTitle, metaDescription }:
  { productName: string; slug: string; metaTitle: string; metaDescription: string }) {
  const [title, setTitle] = useState(metaTitle);
  const [desc, setDesc] = useState(metaDescription);

  const previewTitle = (title.trim() || `${productName || 'Product name'} Price in Sri Lanka`) + ` · ${SITE.name}`;
  const previewDesc = desc.trim() ||
    `${productName || 'This product'} at ${SITE.name}. Genuine stock, official warranty and islandwide cash on delivery.`;
  const previewUrl = `${SITE.url.replace(/^https?:\/\//, '')} › product › ${slug || 'product-slug'}`;

  const lbl = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-muted';
  const inp = 'w-full rounded-xl bg-paper p-3.5 text-[13.5px] font-medium outline-none focus:ring-2 focus:ring-volt';
  const counter = (len: number, max: number) =>
    `ml-2 text-[10.5px] font-semibold ${len > max ? 'text-warn' : 'text-muted'}`;

  return (
    <div className="p-5 space-y-4">
      {/* Live Google preview */}
      <div className="rounded-xl border border-line bg-card p-4">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted">Google preview</p>
        <p className="truncate text-[12px] text-[#202124] dark:text-white/60">{previewUrl}</p>
        <p className="mt-0.5 truncate text-[17px] leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{previewTitle}</p>
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#4d5156] dark:text-white/50">{previewDesc}</p>
      </div>

      <div>
        <label className={lbl}>
          SEO title
          <span className={counter(title.length, 60)}>{title.length}/60</span>
          <span className="ml-2 font-normal normal-case tracking-normal text-muted">blank = auto &ldquo;…Price in Sri Lanka&rdquo;</span>
        </label>
        <input name="meta_title" value={title} onChange={e => setTitle(e.target.value)}
          placeholder={`${productName || 'Product'} Price in Sri Lanka`} maxLength={120} className={inp} />
      </div>

      <div>
        <label className={lbl}>
          SEO description
          <span className={counter(desc.length, 160)}>{desc.length}/160</span>
          <span className="ml-2 font-normal normal-case tracking-normal text-muted">blank = auto-generated</span>
        </label>
        <textarea name="meta_description" rows={2} value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="One or two sentences with the product name, price angle and why to buy from us."
          maxLength={300} className={`${inp} resize-y`} />
      </div>
    </div>
  );
}
