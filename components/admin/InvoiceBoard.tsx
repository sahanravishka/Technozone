'use client';

import { useState } from 'react';
import PageHeader from './PageHeader';
import OrderDetailModal from './OrderDetailModal';
import OrderJourneyModal from './OrderJourneyModal';
import PackModal from './PackModal';
import type { AdminOrder } from './OrderCard';
import { formatLKR } from '@/lib/site';

export default function InvoiceBoard({
  invoices, waLinks,
}: { invoices: AdminOrder[]; waLinks: Record<string, string> }) {
  const [search, setSearch] = useState('');
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [packing, setPacking] = useState<AdminOrder | null>(null);

  const filtered = invoices.filter(i => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const addr = i.shipping_address as { name?: string; city?: string } | null;
    return (
      i.order_number.toLowerCase().includes(q) ||
      (addr?.name ?? '').toLowerCase().includes(q) ||
      (addr?.city ?? '').toLowerCase().includes(q) ||
      i.customer_phone.includes(q)
    );
  });

  const totalRev = invoices.reduce((sum, i) => sum + i.total, 0);

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} generated invoice${invoices.length !== 1 ? 's' : ''} (Dispatched orders)`}
      >
        <div className="flex items-center gap-2 rounded-2xl bg-card border border-line px-3 py-2 text-[13px] font-bold">
          <span>Total Invoiced:</span>
          <span className="text-volt-deep font-extrabold">{formatLKR(totalRev)}</span>
        </div>
      </PageHeader>

      {/* ── Search & Filter ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by order #, customer name, phone, city..."
          className="h-10 w-full max-w-md rounded-xl border border-line bg-card px-3.5 text-[13px] outline-none focus:ring-2 focus:ring-volt"
        />
        <span className="text-[12.5px] font-semibold text-muted">
          Showing {filtered.length} of {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Invoices List ── */}
      <div className="space-y-3">
        {filtered.map(inv => {
          const date = new Date(inv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const isCod = inv.payment_method === 'cod';
          const itemsText = inv.order_items
            .map(item => `${item.qty}× ${item.product_name ?? 'item'}`).join(', ');

          return (
            <div key={inv.id} className="admin-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 bg-paper/40">
                <div className="flex items-center gap-2.5">
                  <span className="text-[16px] font-black tracking-tight">{inv.order_number}</span>
                  <span className="rounded-lg bg-[#D1FAE5] px-2.5 py-1 text-[11.5px] font-bold text-[#065F46]">
                    Dispatched (Invoice Generated)
                  </span>
                  <span className="rounded-lg bg-paper px-2.5 py-1 text-[11.5px] font-semibold text-muted capitalize">
                    {isCod ? 'Cash on Delivery' : inv.payment_method}
                  </span>
                </div>
                <span className="text-[18px] font-black">{formatLKR(inv.total)}</span>
              </div>

              <div className="px-4 py-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-bold">{inv.shipping_address?.name ?? 'Customer'}</p>
                    <p className="text-[12.5px] text-muted">
                      {[inv.shipping_address?.city, inv.customer_phone, date].filter(Boolean).join(' · ')}
                    </p>
                    {itemsText && <p className="mt-1 text-[12.5px] text-muted">{itemsText}</p>}
                  </div>
                </div>
              </div>

              {/* ── Action Buttons ── */}
              <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/60 px-4 py-2.5">
                <a
                  href={`/admin/orders/${inv.id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pressable rounded-xl bg-volt px-4 py-2 text-[12.5px] font-bold text-white hover:bg-volt-deep"
                >
                  🧾 View / Print Invoice
                </a>

                <button
                  onClick={() => setJourneyId(inv.id)}
                  className="pressable rounded-xl border border-line bg-card px-4 py-2 text-[12.5px] font-bold text-ink hover:bg-paper"
                >
                  🗺️ Order Journey
                </button>

                <button
                  onClick={() => setDetailsId(inv.id)}
                  className="pressable rounded-xl border border-line bg-card px-4 py-2 text-[12.5px] font-bold text-muted hover:bg-paper hover:text-ink"
                >
                  👁 Details
                </button>

                {(inv.requiredSerials ?? 0) > 0 && (
                  <button
                    onClick={() => setPacking(inv)}
                    className="pressable rounded-xl border border-line bg-card px-4 py-2 text-[12.5px] font-bold text-muted hover:bg-paper hover:text-ink"
                  >
                    📷 Scan IMEI ({inv.scannedSerials ?? 0}/{inv.requiredSerials})
                  </button>
                )}

                <a
                  href={waLinks[inv.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pressable rounded-xl border border-line bg-card px-4 py-2 text-[12.5px] font-bold text-muted hover:bg-paper"
                >
                  💬 WhatsApp
                </a>
              </div>
            </div>
          );
        })}

        {!filtered.length && (
          <div className="admin-card p-14 text-center">
            <p className="text-[16px] font-semibold text-muted">No dispatched invoices found</p>
            <p className="mt-1 text-[13px] text-muted">When orders are marked dispatched, they will appear here as invoices.</p>
          </div>
        )}
      </div>

      {detailsId && <OrderDetailModal orderId={detailsId} onClose={() => setDetailsId(null)} />}
      {journeyId && <OrderJourneyModal orderId={journeyId} onClose={() => setJourneyId(null)} />}
      {packing && <PackModal order={packing} onClose={() => setPacking(null)} />}
    </div>
  );
}
