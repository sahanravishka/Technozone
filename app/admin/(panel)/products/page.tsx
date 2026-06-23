import Image from 'next/image';
import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { imageUrl } from '@/lib/supabase';
import { formatLKR } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function AdminProducts() {
  const supabase = (await getServerSupabase())!;
  const { data: products } = await supabase.from('products')
    .select('id, name, slug, is_active, product_variants(price, stock_qty), product_images(storage_path)')
    .order('created_at', { ascending: false }).limit(200);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Products</h1>
        <Link href="/admin/products/new"
          className="pressable rounded-btn bg-volt px-4 py-2.5 text-[12.5px] font-semibold text-white hover:bg-volt-deep">
          + New product
        </Link>
      </div>
      <div className="overflow-hidden rounded-2xl bg-card">
        {(products ?? []).map((p, i) => {
          const stock = p.product_variants.reduce((n, v) => n + v.stock_qty, 0);
          const prices = p.product_variants.map(v => Number(v.price));
          const img = p.product_images[0];
          return (
            <Link key={p.id} href={`/admin/products/${p.id}`}
              className={`flex items-center gap-3.5 px-4 py-3 hover:bg-paper ${i ? 'border-t border-[#EEF1F6]' : ''}`}>
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#F0F3F8]">
                {img && <Image src={imageUrl(img.storage_path)} alt="" fill sizes="44px" className="object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13.5px]">{p.name}</b>
                <span className="text-[11.5px] text-muted">/{p.slug} · {p.product_variants.length} variant{p.product_variants.length === 1 ? '' : 's'}</span>
              </span>
              <span className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${stock <= 3 ? 'bg-warn-soft text-warn' : 'bg-paper text-muted'}`}>
                {stock} in stock
              </span>
              <span className="w-28 text-right text-[13px] font-bold">
                {prices.length ? formatLKR(Math.min(...prices)) : '—'}
              </span>
              <span className={`h-2 w-2 rounded-full ${p.is_active ? 'bg-ok' : 'bg-line'}`} title={p.is_active ? 'Active' : 'Hidden'} />
            </Link>
          );
        })}
        {!products?.length && <p className="p-8 text-center text-muted">No products yet — add your first one.</p>}
      </div>
    </div>
  );
}
