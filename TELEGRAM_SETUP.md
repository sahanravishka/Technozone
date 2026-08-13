# New-order Telegram alerts setup

Every new order (COD, WhatsApp, or PayHere) now also sends a Telegram
message alongside the email — completely free, no per-message cost, no
business account verification. Takes about 2 minutes to set up.

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
Place a test order on the live site. You should get a Telegram message
within a couple seconds, formatted like:

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
- Code: `lib/telegram.ts`, called from `app/[locale]/checkout/actions.ts`.
