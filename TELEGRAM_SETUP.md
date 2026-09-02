# New-order Telegram alerts setup

Every new order sends a Telegram message alongside the email —
completely free, no per-message cost, no business account verification.
Takes about 2 minutes to set up.

Timing differs by payment method, since an online payment isn't real
until the gateway actually confirms it:
- **COD / WhatsApp** — sent immediately at order creation (nothing to wait on).
- **PayHere / Koko** — sent only once the gateway's payment webhook
  confirms the charge actually succeeded, never at order creation. For
  Koko specifically, this fires from `app/api/koko/response/route.ts`
  (their signed response webhook) and, as a fallback if that webhook is
  ever late/missed, from `lib/koko-reconcile.ts` (the self-healing check
  on the order confirmation page and the admin "Check Koko status" button).

## 1. Create your bot
1. Open Telegram, search for **@BotFather** (the official bot-creation bot).
2. Send `/newbot`.
3. Give it a name (e.g. "Techno Zone Orders") and a username ending in `bot`
   (e.g. `technozone_orders_bot`).
4. BotFather replies with a token that looks like:
   `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   — copy this, it's your `TELEGRAM_BOT_TOKEN`.

## 2. Get your chat ID
1. Search for your new bot by its username and open a chat with it.
2. Send it any message (e.g. "hi") — bots can't message you first.
3. In your browser, visit:
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   (replace `<YOUR_TOKEN>` with the token from step 1)
4. Look for `"chat":{"id":123456789,...}` in the response — that number is
   your `TELEGRAM_CHAT_ID`.

   If it's a group chat instead of a DM: add the bot to the group first,
   send a message in the group, then check the same URL — group chat IDs
   are negative numbers (e.g. `-1001234567890`), which is normal.

## 3. Add env vars in Vercel
Project → Settings → Environment Variables → add both:
```
TELEGRAM_BOT_TOKEN=123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID=123456789
```
Redeploy after saving (env var changes need a redeploy to take effect).

## 4. Test it
Place a test COD order on the live site first — it notifies immediately,
so it's the fastest way to confirm the bot token/chat ID themselves are
right, independent of any payment gateway. If that doesn't arrive, the
issue is these env vars (wrong value, or not redeployed after saving) —
check the Vercel Function Logs for a line starting `[telegram]`, which
says exactly why it skipped or failed.

Once COD alerts work, a Koko order confirms the rest of the chain: place
one, complete payment, and the alert should land within a couple seconds
of Koko's webhook hitting `/api/koko/response` (check Vercel Function
Logs for that route if it doesn't — look for `[koko]` or
`[koko-reconcile]` lines).

A COD alert should look like this:

> 🛒 **New order TZ-00123**
>
> 👤 Kasun Perera (0771234567)
> 📍 Colombo
> 💳 Cash on delivery · delivery
>
> • 1× Nokia 105 — Rs 5,990
>
> **Total: Rs 5,990**
>
> [Open in admin](https://technozonelanka.com/admin/orders)

## Notes
- Works independently of the email setup — you can use one, both, or neither.
- Delivery failures are logged server-side only and never block checkout.
- Code: `lib/telegram.ts` (the send function), called from
  `app/[locale]/checkout/actions.ts` (COD/WhatsApp, at order creation),
  `app/api/koko/response/route.ts` (Koko, on webhook SUCCESS), and
  `lib/koko-reconcile.ts` (Koko, on the reconciliation fallback).
  PayHere's own webhook (`app/api/payhere/notify/route.ts`) does not
  send one yet — same gap Koko had until this was added.
