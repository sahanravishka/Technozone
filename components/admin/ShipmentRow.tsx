'use client';
import { useState, useTransition } from 'react';
import { assignShipment, advanceShipment } from '@/app/admin/actions';
import { SHIPMENT_FLOW, SHIPMENT_LABEL, trackUrl } from '@/lib/courier';
import { shipmentMessage, shipmentNotifyLink } from '@/lib/whatsapp';
import DispatchScan from './DispatchScan';
import type { Courier, ShipmentStatus } from '@/lib/types';

type Ship = { id: string; courier_code: string | null; tracking_number: string | null; status: ShipmentStatus };
type Item = { variant_id: string | null; product_name: string; variant_name: string | null };
type Order = { id: string; order_number: string; customer_phone: string;
  shipping_address: { name?: string; city?: string }; shipments: Ship[]; order_items?: Item[] };

export default function ShipmentRow({ order, couriers }: { order: Order; couriers: Courier[] }) {
  const ship = order.shipments?.[0];
  const [pending, start] = useTransition();
  const [code, setCode] = useState(ship?.courier_code ?? couriers[0]?.code ?? '');
  const [tracking, setTracking] = useState(ship?.tracking_number ?? '');

  const courier = couriers.find(c => c.code === (ship?.courier_code ?? code));
  const url = trackUrl(courier, ship?.tracking_number ?? tracking);
  const nextIdx = ship ? SHIPMENT_FLOW.indexOf(ship.status) + 1 : -1;
  const next = nextIdx > 0 && nextIdx < SHIPMENT_FLOW.length ? SHIPMENT_FLOW[nextIdx] : null;
  const waMsg = shipmentMessage(order.order_number, ship?.status ?? 'label_created', courier?.name, url);

  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-[13.5px]">{order.order_number}</b>
        <span className="text-[12px] text-muted">{order.shipping_address?.name} · {order.shipping_address?.city}</span>
        {ship && <span className="ml-auto rounded-md bg-volt-soft px-2 py-0.5 text-[11px] font-semibold text-volt">{SHIPMENT_LABEL[ship.status]}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={code} onChange={e => setCode(e.target.value)} className="h-9 rounded-lg bg-paper px-2.5 text-[12.5px] outline-none">
          {couriers.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Tracking #"
          className="h-9 w-36 rounded-lg bg-paper px-2.5 text-[12.5px] outline-none" />
        <button onClick={() => start(async () => { await assignShipment(order.id, code, tracking); })} disabled={pending || !tracking}
          className="pressable rounded-lg bg-ink px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">
          {ship ? 'Update' : 'Assign'}
        </button>
        {next && (
          <button onClick={() => start(async () => { await advanceShipment(ship!.id, next); })} disabled={pending}
            className="pressable rounded-lg bg-volt px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">
            → {SHIPMENT_LABEL[next]}
          </button>
        )}
        <a href={shipmentNotifyLink(order.customer_phone, waMsg)} target="_blank" rel="noopener"
          className="pressable rounded-lg bg-[#E8F7EE] px-3 py-1.5 text-[12px] font-semibold text-ok">WhatsApp</a>
        {url && <a href={url} target="_blank" rel="noopener" className="text-[12px] font-semibold text-volt hover:underline">Track ↗</a>}
      </div>
      {!!order.order_items?.length && <DispatchScan orderId={order.id} items={order.order_items} />}
    </div>
  );
}
