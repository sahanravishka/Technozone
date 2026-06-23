import { SITE } from './site';

type OrderLike = {
  order_number: string; total: number; customer_phone: string;
  status: string;
};

const TEMPLATES: Record<string, (o: OrderLike) => string> = {
  paid:      o => `Hi! Your ${SITE.name} order ${o.order_number} is confirmed. We're getting it ready. 🙌`,
  packed:    o => `Your order ${o.order_number} is packed and will be handed to the courier shortly. 📦`,
  shipped:   o => `Good news! Order ${o.order_number} is on its way with the courier. 🚚`,
  delivered: o => `Order ${o.order_number} marked as delivered. Enjoy! Reply here if anything's wrong.`,
  cancelled: o => `Your order ${o.order_number} has been cancelled. If this is unexpected, reply here.`
};

export function statusMessage(order: OrderLike, status: string) {
  return (TEMPLATES[status] ?? (() => `Update on your order ${order.order_number}.`))(order);
}

/** Manual mode: returns a wa.me link the admin clicks.
 *  Cloud API mode (feature flag `whatsapp_cloud_api`): replace this function's
 *  body with a fetch to graph.facebook.com — nothing else changes. */
export function notifyLink(order: OrderLike, status: string) {
  const phone = order.customer_phone.replace(/\D/g, '').replace(/^0/, '94');
  return `https://wa.me/${phone}?text=${encodeURIComponent(statusMessage(order, status))}`;
}

// ---------------- Repair status WhatsApp templates ----------------
type JobLike = {
  job_number: string; customer_phone: string; status: string;
  device_brand?: string | null; device_model?: string | null;
  estimate?: number | null; service_category?: string | null;
};

const SERVICE_TEMPLATES: Record<string, (j: JobLike) => string> = {
  received:          j => `🛠 ${j.job_number} received — ${j.device_brand ?? ''} ${j.device_model ?? ''} (${j.service_category ?? 'repair'}). We'll diagnose and update you shortly.`,
  diagnosing:        j => `🔍 ${j.job_number}: we're diagnosing your ${j.device_model ?? 'device'} now. Estimate coming soon.`,
  awaiting_approval: j => `${j.job_number}: diagnosis done. Estimate is Rs ${j.estimate ?? '—'}. Reply OK to approve and we'll start.`,
  repairing:         j => `🔧 ${j.job_number}: approved — repair in progress. We'll message you when it's ready.`,
  ready:             j => `✅ ${j.job_number} is ready for pickup! ${j.estimate ? `Total: Rs ${j.estimate}. ` : ''}Open 9 AM–8 PM.`,
  collected:         j => `Thanks for collecting ${j.job_number}. Any issues, just reply here. 🙏`,
  cancelled:         j => `${j.job_number} has been cancelled. Reply here if you have questions.`
};

export function serviceMessage(job: JobLike, status: string) {
  return (SERVICE_TEMPLATES[status] ?? (() => `Update on ${job.job_number}.`))(job);
}

export function serviceNotifyLink(job: JobLike, status: string) {
  const phone = job.customer_phone.replace(/\D/g, '').replace(/^0/, '94');
  return `https://wa.me/${phone}?text=${encodeURIComponent(serviceMessage(job, status))}`;
}

// ---------------- Shipment + Return WhatsApp templates ----------------
export function shipmentMessage(orderNumber: string, status: string, courier?: string, trackUrl?: string | null) {
  const map: Record<string, string> = {
    label_created: `📦 ${orderNumber}: packed and ready for ${courier ?? 'courier'} pickup.`,
    picked_up: `🚚 ${orderNumber}: picked up by ${courier ?? 'the courier'} and on its way.`,
    in_transit: `🚚 ${orderNumber} is in transit${trackUrl ? `. Track: ${trackUrl}` : ''}.`,
    out_for_delivery: `🛵 ${orderNumber} is out for delivery today!`,
    delivered: `✅ ${orderNumber} delivered. Thank you for shopping with us!`,
    returned: `${orderNumber}: the parcel came back to us. We'll reach out to re-arrange.`,
    failed: `${orderNumber}: delivery attempt failed. We'll contact you to sort it out.`
  };
  return map[status] ?? `Update on ${orderNumber}.`;
}
export function shipmentNotifyLink(phone: string, msg: string) {
  return `https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '94')}?text=${encodeURIComponent(msg)}`;
}

export function returnMessage(rma: string, status: string) {
  const map: Record<string, string> = {
    requested: `${rma}: we've received your return request and will review it shortly.`,
    approved: `${rma} approved ✅. Please send/bring the item back and we'll process it.`,
    received: `${rma}: item received — we're processing your refund/replacement now.`,
    refunded: `${rma}: your refund has been processed. Thank you for your patience. 🙏`,
    rejected: `${rma}: unfortunately this return couldn't be approved. Reply here for details.`
  };
  return map[status] ?? `Update on ${rma}.`;
}
