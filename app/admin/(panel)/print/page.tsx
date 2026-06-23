import QRCode from 'qrcode';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { formatLKR, SITE } from '@/lib/site';
import PrintButton from '@/components/admin/PrintButton';

export const dynamic = 'force-dynamic';

// Bulk A4 packing slips: 8 labels per sheet (2 × 4), each with a QR that
// opens the order in admin when scanned with any phone camera.
export default async function PrintSlips({ searchParams }:
  { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const idList = (ids ?? '').split(',').filter(Boolean).slice(0, 64);
  const supabase = (await getServerSupabase())!;

  const { data: orders } = await supabase.from('orders')
    .select('id, order_number, total, customer_phone, shipping_address, order_items(product_name, variant_name, qty)')
    .in('id', idList);

  const labels = await Promise.all((orders ?? []).map(async o => ({
    ...o,
    qr: await QRCode.toDataURL(`${SITE.url}/admin/orders?focus=${o.id}`, { margin: 0, width: 180 })
  })));

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 print:hidden">
        <h1 className="text-xl font-bold">Packing slips</h1>
        <span className="text-[13px] text-muted">{labels.length} label{labels.length === 1 ? '' : 's'} · A4, 8 per sheet</span>
        <span className="ml-auto"><PrintButton /></span>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          body { background: #fff !important; }
          aside, .print\\:hidden, [class*="fixed"] { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
          .sheet { gap: 0 !important; }
          .slip { border: 1px dashed #bbb !important; border-radius: 0 !important; page-break-inside: avoid; }
        }
      `}</style>

      <div className="sheet grid grid-cols-2 gap-3">
        {labels.map(o => {
          const a = o.shipping_address as { name?: string; phone?: string; line1?: string; city?: string };
          return (
            <div key={o.id} className="slip flex gap-3 rounded-xl bg-white p-3.5" style={{ minHeight: '64mm' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={o.qr} alt={`QR ${o.order_number}`} className="h-[88px] w-[88px] shrink-0" />
              <div className="min-w-0 text-[11.5px] leading-snug">
                <p className="text-[13px] font-bold">{o.order_number}</p>
                <p className="mt-1 font-semibold">{a?.name}</p>
                <p>{a?.line1}, {a?.city}</p>
                <p>{o.customer_phone}</p>
                <ul className="mt-1.5 text-[10.5px] text-[#444]">
                  {o.order_items.slice(0, 4).map((i, n) => (
                    <li key={n}>• {i.product_name}{i.variant_name && i.variant_name !== 'Default' ? ` (${i.variant_name})` : ''} ×{i.qty}</li>
                  ))}
                  {o.order_items.length > 4 && <li>… +{o.order_items.length - 4} more</li>}
                </ul>
                <p className="mt-1.5 text-[12px] font-bold">{formatLKR(o.total)}</p>
              </div>
            </div>
          );
        })}
      </div>
      {!labels.length && (
        <p className="rounded-2xl bg-card p-8 text-center text-muted">
          Select orders on the Orders board, then click "Print packing slips".
        </p>
      )}
    </div>
  );
}
