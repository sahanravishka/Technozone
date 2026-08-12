'use client';

import { useEffect, useState } from 'react';
import { getOrderJourney, type OrderJourneyData } from '@/app/admin/actions';
import { formatLKR } from '@/lib/site';

export default function OrderJourneyModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [journey, setJourney] = useState<OrderJourneyData | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    getOrderJourney(orderId)
      .then(d => { if (!cancelled) setJourney(d); })
      .catch(e => { if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load journey'); });
    return () => { cancelled = true; };
  }, [orderId]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-card p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <b className="text-[16px]">🗺️ Order Journey & Audit Log</b>
            {journey && <p className="text-[12px] font-bold text-volt-deep">{journey.order_number}</p>}
          </div>
          <button onClick={onClose} className="px-1 text-[18px] leading-none text-muted hover:text-ink" aria-label="Close">✕</button>
        </div>

        {err && <p className="mt-3 rounded-lg bg-sale/10 px-3 py-2 text-[12px] font-medium text-sale">{err}</p>}
        {!journey && !err && <p className="mt-4 text-[13px] text-muted">Loading journey report…</p>}

        {journey && (
          <div className="mt-4 space-y-4">
            {/* Meta Card */}
            <div className="rounded-2xl bg-paper p-3.5 text-[12.5px] space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Customer:</span>
                <span className="font-semibold">{journey.customer_name} ({journey.customer_phone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">City / Address:</span>
                <span className="font-semibold">{journey.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Total:</span>
                <span className="font-extrabold">{formatLKR(journey.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Current Status:</span>
                <span className="font-bold capitalize text-volt-deep">{journey.status}</span>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <p className="mb-3 text-[11.5px] font-bold uppercase tracking-wide text-muted">Event Timeline</p>
              <div className="relative border-l-2 border-volt/30 ml-3 space-y-5 pl-5">
                {journey.events.map((ev, idx) => {
                  const dateStr = new Date(ev.timestamp).toLocaleString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  });
                  const isCancel = ev.title.toLowerCase().includes('cancelled');
                  const isScan = ev.type === 'serial_scanned';
                  const isCreated = ev.type === 'created';

                  return (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[27px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                        isCancel ? 'bg-sale' : isScan ? 'bg-ok' : isCreated ? 'bg-volt' : 'bg-ink'
                      }`} />
                      
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className={`text-[13px] font-bold ${isCancel ? 'text-sale' : 'text-ink'}`}>{ev.title}</span>
                        <span className="text-[11px] text-muted">{dateStr}</span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-muted leading-snug">{ev.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {journey.events.length === 0 && (
              <p className="text-[12px] text-muted">No timeline events recorded yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
