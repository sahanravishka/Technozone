import QRCode from 'qrcode';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { formatLKR, SITE } from '@/lib/site';
import PrintButton from '@/components/admin/PrintButton';

export const dynamic = 'force-dynamic';

const PAY_LABEL: Record<string, string> = {
  cod: 'Cash on delivery', whatsapp: 'WhatsApp pay', payhere: 'Online payment', koko: 'Koko (3 installments)',
};

export default async function PrintSlips({ searchParams }:
  { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const idList = (ids ?? '').split(',').filter(Boolean).slice(0, 64);
  const supabase = (await getServerSupabase())!;

  const { data: orders } = await supabase.from('orders')
    .select('id, order_number, total, customer_phone, shipping_address, payment_method, order_items(product_name, variant_name, qty)')
    .in('id', idList);

  // QR encodes the order details as plain text — scanning with any phone
  // camera shows the order summary directly (no website link to open).
  const labels = await Promise.all((orders ?? []).map(async o => {
    const a = o.shipping_address as {
      name?: string; phone?: string; line1?: string; city?: string; postal_code?: string;
    };
    const itemLines = o.order_items
      .map(i => `- ${i.product_name}${i.variant_name && i.variant_name !== 'Default' ? ` (${i.variant_name})` : ''} x${i.qty}`)
      .join('\n');
    const text =
      `Techno Zone Lanka\n` +
      `Order ${o.order_number}\n` +
      `${PAY_LABEL[o.payment_method ?? ''] ?? o.payment_method ?? ''}\n` +
      `\nShip to:\n${a?.name ?? '-'}\n${a?.phone ?? o.customer_phone}\n` +
      `${[a?.line1, a?.city, a?.postal_code].filter(Boolean).join(', ')}\n` +
      `\nItems:\n${itemLines}\n` +
      `\nTotal: ${formatLKR(o.total)}`;
    return { ...o, qr: await QRCode.toDataURL(text, { margin: 0, width: 200 }) };
  }));

  const phone = SITE.whatsapp.replace(/^94/, '0').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <h1 className="text-xl font-bold">Packing slips</h1>
        <span className="text-[13px] text-muted">
          {labels.length} slip{labels.length === 1 ? '' : 's'} · A4, 2 per row
        </span>
        <span className="ml-auto"><PrintButton /></span>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          body { background: #fff !important; }
          aside, .print\\:hidden, [class*="fixed"] { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
          .sheet { gap: 4mm !important; }
          .slip { border: 1px dashed #ccc !important; border-radius: 4px !important; page-break-inside: avoid; }
        }
      `}</style>

      <div className="sheet grid grid-cols-2 gap-4">
        {labels.map(o => {
          const a = o.shipping_address as {
            name?: string; phone?: string; line1?: string; city?: string; postal_code?: string;
          };
          const payLabel = PAY_LABEL[o.payment_method ?? ''] ?? o.payment_method;
          const isCod = o.payment_method === 'cod';

          return (
            <div key={o.id} className="slip rounded-xl bg-white p-3.5" style={{ minHeight: '80mm', fontFamily: 'Arial, sans-serif' }}>

              {/* ── Shop header ── */}
              <div className="mb-2.5 flex items-center gap-2.5 border-b border-gray-200 pb-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.jpg" alt="Techno Zone Lanka" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                <div className="min-w-0 leading-tight">
                  <p className="text-[11px] font-black uppercase tracking-wide text-gray-800">Techno Zone Lanka</p>
                  <p className="text-[9.5px] text-gray-500">Sri Soratha Mawatha, Gangodawila</p>
                  <p className="text-[9.5px] text-gray-500">Nugegoda · {phone}</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.qr} alt={`QR ${o.order_number}`} className="ml-auto h-[60px] w-[60px] shrink-0" />
              </div>

              {/* ── Order info row ── */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-black text-gray-900">{o.order_number}</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-gray-600">{payLabel}</span>
              </div>

              {/* ── Ship to ── */}
              <div className="mb-2 rounded-lg bg-gray-50 p-2 text-[10.5px] leading-snug text-gray-800">
                <p className="font-bold text-[11.5px]">{a?.name ?? '—'}</p>
                {a?.phone && <p className="mt-0.5">{a.phone}</p>}
                {a?.line1 && <p className="mt-0.5">{a.line1}</p>}
                <p className="mt-0.5">
                  {[a?.city, a?.postal_code].filter(Boolean).join(' ')}
                  {!a?.city && !a?.postal_code && '—'}
                </p>
              </div>

              {/* ── Items ── */}
              <ul className="mb-2 space-y-0.5 text-[10px] text-gray-700">
                {o.order_items.slice(0, 5).map((i, n) => (
                  <li key={n} className="flex justify-between">
                    <span className="truncate pr-1">
                      {i.product_name}
                      {i.variant_name && i.variant_name !== 'Default' ? ` (${i.variant_name})` : ''}
                    </span>
                    <span className="shrink-0 font-semibold">×{i.qty}</span>
                  </li>
                ))}
                {o.order_items.length > 5 && (
                  <li className="text-gray-400">+{o.order_items.length - 5} more items</li>
                )}
              </ul>

              {/* ── Total + COD note ── */}
              <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                <span className="text-[12px] font-black text-gray-900">{formatLKR(o.total)}</span>
                {isCod && (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                    COLLECT CASH ON DELIVERY
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!labels.length && (
        <div className="rounded-2xl bg-card p-10 text-center">
          <p className="text-[15px] font-semibold text-muted">Select orders on the Orders board</p>
          <p className="mt-1 text-[13px] text-muted">Tick the checkbox on each order, then click "Print slips".</p>
        </div>
      )}
    </div>
  );
}
