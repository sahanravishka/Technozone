/**
 * Which orders belong on the admin screens.
 *
 * A Koko/PayHere checkout creates its order row BEFORE the customer is sent to
 * the gateway — the payment webhook matches on that row and its stock hold stops
 * the item being oversold while they're away. So every customer who opens Koko
 * and walks away leaves an unpaid (or failed) row behind. Nothing staff can do
 * with it: only the gateway's own webhook ever resolves it. Showing it just
 * buries real orders and makes the shop look busier than it is.
 *
 * COD and WhatsApp orders are final the moment they're placed, so they always
 * show. A gateway order shows only once money actually arrived — `paid`, or
 * `refunded` (it was paid, then returned; staff still need to see it).
 *
 * Pass to PostgREST's `.or()`. The rows still exist in the database, so a
 * late payment or a retried webhook still lands on the right order.
 */
export const REAL_ORDERS_FILTER =
  'payment_method.in.(cod,whatsapp),payment_status.in.(paid,refunded)';
