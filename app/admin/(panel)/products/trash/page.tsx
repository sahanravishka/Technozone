import Image from 'next/image';
import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getStaff } from '@/lib/admin-auth';
import { imageUrl } from '@/lib/supabase';
import PageHeader from '@/components/admin/PageHeader';
import TrashRowActions from '@/components/admin/TrashRowActions';

export const dynamic = 'force-dynamic';

export default async function ProductTrash() {
  const supabase = (await getServerSupabase())!;
  const staff = await getStaff();
  const canPurge = staff?.role === 'owner';

  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, deleted_at, product_images(storage_path)')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(200);

  return (
    <div>
      <PageHeader title="Trash" subtitle="Deleted products — restore or remove permanently">
        <Link
          href="/admin/products"
          className="pressable admin-card px-3.5 py-2 text-[12.5px] font-semibold text-muted hover:bg-paper"
        >
          ← Back to products
        </Link>
      </PageHeader>

      <div className="admin-card overflow-hidden">
        {(products ?? []).map((p, i) => {
          const img = (p.product_images as { storage_path: string }[])[0];
          const when = p.deleted_at
            ? new Date(p.deleted_at as string).toLocaleDateString()
            : '';
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3.5 px-4 py-3 ${i ? 'border-t border-line/70' : ''}`}
            >
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#F0F3F8] grayscale">
                {img && (
                  <Image src={imageUrl(img.storage_path)} alt="" fill sizes="44px" className="object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13.5px]">{p.name}</b>
                <span className="text-[11.5px] text-muted">/{p.slug} · deleted {when}</span>
              </span>
              <TrashRowActions productId={p.id} canPurge={canPurge} />
            </div>
          );
        })}
        {!products?.length && (
          <p className="p-8 text-center text-muted">Trash is empty.</p>
        )}
      </div>

      {!canPurge && (
        <p className="mt-3 px-1 text-[12px] text-muted">
          Only the owner can permanently delete. Products with order history can never be
          permanently deleted — they stay here to keep your reports and warranties intact.
        </p>
      )}
    </div>
  );
}
