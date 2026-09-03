import 'server-only';
import { createHash } from 'crypto';
import { SITE } from './site';

const md5u = (s: string) => createHash('md5').update(s).digest('hex').toUpperCase();

export const payhereConfigured = () =>
  !!(process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET);

export const payhereGateway = () =>
  process.env.PAYHERE_MODE === 'live'
    ? 'https://www.payhere.lk/pay/checkout'
    : 'https://sandbox.payhere.lk/pay/checkout';

/** Fields for the browser form POST to PayHere (hash per PayHere docs). */
export function buildCheckoutFields(o: {
  orderId: string; orderNumber: string; amount: number; firstName: string; lastName: string;
  email: string; phone: string; address: string; city: string; items: string;
  locale: string;
}) {
  const merchantId = process.env.PAYHERE_MERCHANT_ID!;
  const secret = process.env.PAYHERE_MERCHANT_SECRET!;
  const amount = o.amount.toFixed(2);
  const currency = 'LKR';
  // order_id here is our order's real uuid — the notify webhook and
  // confirm_order_paid() match on it directly (`where id = p_order_id`), so
  // it can't be swapped for the customer-facing order_number. The browser
  // return_url is a different concern: /order/[id] looks orders up by
  // order_number, not uuid, so it needs the human-facing reference instead.
  const hash = md5u(merchantId + o.orderId + amount + currency + md5u(secret));
  return {
    merchant_id: merchantId,
    return_url: `${SITE.url}/${o.locale}/order/${o.orderNumber}`,
    cancel_url: `${SITE.url}/${o.locale}/checkout?cancelled=1`,
    notify_url: `${SITE.url}/api/payhere/notify`,
    order_id: o.orderId,
    items: o.items.slice(0, 250),
    currency, amount,
    first_name: o.firstName, last_name: o.lastName || '-',
    email: o.email, phone: o.phone,
    address: o.address, city: o.city, country: 'Sri Lanka',
    hash
  };
}

/** Verify the md5sig PayHere sends to the notify webhook. */
export function verifyNotifySignature(p: Record<string, string>) {
  const secret = process.env.PAYHERE_MERCHANT_SECRET!;
  const local = md5u(
    p.merchant_id + p.order_id + p.payhere_amount + p.payhere_currency +
    p.status_code + md5u(secret)
  );
  return local === (p.md5sig ?? '').toUpperCase();
}
