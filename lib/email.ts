import { Resend } from 'resend';
import { SITE, formatLKR } from './site';

const ORDER_NOTIFY_EMAIL = process.env.ORDER_NOTIFY_EMAIL || 'sahanravishka10@gmail.com';
// Resend requires the FROM address's domain to be verified in your Resend
// account. Until technozonelanka.com is verified there, Resend's shared
// onboarding@resend.dev sender works but only delivers to the email address
// on your own Resend account. See RESEND_SETUP.md for the 5-minute setup.
const FROM = process.env.RESEND_FROM_EMAIL || `${SITE.name} <onboarding@resend.dev>`;

type NewOrderEmailInput = {
  orderNumber: string;
  total: number;
  paymentMethod: string;
  fulfillment: string;
  customerName: string;
  customerPhone: string;
  city?: string;
  items: { name: string; qty: number; line: number }[];
};

/**
 * Fire-and-forget email to the shop owner whenever a new order is placed.
 * Never throws — a failed notification must never block checkout.
 */
export async function sendNewOrderEmail(order: NewOrderEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping new-order email');
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const itemsHtml = order.items
      .map(i => `<tr><td style="padding:4px 8px">${i.qty}× ${escapeHtml(i.name)}</td><td style="padding:4px 8px;text-align:right">${formatLKR(i.line)}</td></tr>`)
      .join('');

    await resend.emails.send({
      from: FROM,
      to: ORDER_NOTIFY_EMAIL,
      subject: `🛒 New order ${order.orderNumber} — ${formatLKR(order.total)}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px">
          <h2 style="margin:0 0 8px">New order: ${escapeHtml(order.orderNumber)}</h2>
          <p style="margin:0 0 4px"><b>Customer:</b> ${escapeHtml(order.customerName)} (${escapeHtml(order.customerPhone)})</p>
          ${order.city ? `<p style="margin:0 0 4px"><b>City:</b> ${escapeHtml(order.city)}</p>` : ''}
          <p style="margin:0 0 4px"><b>Payment:</b> ${escapeHtml(order.paymentMethod)} &nbsp; <b>Fulfillment:</b> ${escapeHtml(order.fulfillment)}</p>
          <table style="width:100%;border-collapse:collapse;margin:12px 0">${itemsHtml}</table>
          <p style="font-size:16px"><b>Total: ${formatLKR(order.total)}</b></p>
          <p><a href="${SITE.url}/admin/orders" style="color:#1B6FD8">Open in admin →</a></p>
        </div>
      `
    });
  } catch (err) {
    // Log only — email delivery must never fail the checkout flow.
    console.error('[email] new-order notification failed', err);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
