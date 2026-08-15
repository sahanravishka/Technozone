import { SITE, formatLKR } from './site';

// Free Telegram Bot API — no per-message cost, no business verification.
// Setup: message @BotFather on Telegram, create a bot, get the token,
// then message your own bot once and fetch the chat_id (see TELEGRAM_SETUP.md).

type NewOrderTelegramInput = {
  orderNumber: string;
  total: number;
  paymentMethod: string;
  fulfillment: string;
  customerName: string;
  customerPhone: string;
  city?: string;
  items: { name: string; qty: number; line: number }[];
};

const PAY_LABEL: Record<string, string> = {
  cod: 'Cash on delivery', whatsapp: 'WhatsApp pay', payhere: 'Online payment',
};

/**
 * Sends a new-order alert to Telegram. Fire-and-forget: never throws —
 * a failed notification must never block checkout.
 */
export async function sendNewOrderTelegram(order: NewOrderTelegramInput) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping new-order alert');
    return;
  }

  try {
    const itemLines = order.items
      .map(i => `• ${i.qty}× ${escapeMd(i.name)} — ${escapeMd(formatLKR(i.line))}`)
      .join('\n');
    const text = [
      `🛒 *New order ${escapeMd(order.orderNumber)}*`,
      ``,
      `👤 ${escapeMd(order.customerName)} \\(${escapeMd(order.customerPhone)}\\)`,
      order.city ? `📍 ${escapeMd(order.city)}` : null,
      `💳 ${escapeMd(PAY_LABEL[order.paymentMethod] ?? order.paymentMethod)} · ${escapeMd(order.fulfillment)}`,
      ``,
      itemLines,
      ``,
      `*Total: ${escapeMd(formatLKR(order.total))}*`,
      ``,
      `[Open in admin](${SITE.url}/admin/orders)`,
    ].filter(Boolean).join('\n');

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      console.error('[telegram] new-order alert failed', res.status, await res.text());
    }
  } catch (err) {
    console.error('[telegram] new-order alert failed', err);
  }
}

// Telegram's MarkdownV2 requires escaping these characters in plain text runs.
function escapeMd(s: string) {
  return s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
