# New-order email setup (Resend)

Every new order (COD, WhatsApp, or PayHere) now emails **sahanravishka10@gmail.com**
with the order number, items, and total. Nothing sends until you add one env var.

## 1. Get a Resend API key
1. Sign up at https://resend.com (free tier: 3,000 emails/month, 100/day).
2. Dashboard → **API Keys** → Create API Key → copy it (starts with `re_`).

## 2. Add env vars
**Local (`.env.local`):**
```
RESEND_API_KEY=re_your_key_here
```

**Vercel:** Project → Settings → Environment Variables → add `RESEND_API_KEY` for
Production (and Preview if you want it there too), then redeploy.

## 3. (Optional but recommended) Verify your domain
Without domain verification, emails send from Resend's shared
`onboarding@resend.dev` address, which **only delivers to the email address on
your own Resend account** — fine for testing, not for production.

To send from `orders@technozonelanka.com` and deliver to any inbox:
1. Resend dashboard → **Domains** → Add `technozonelanka.com`.
2. Add the DNS records it gives you (in your domain registrar / Cloudflare).
3. Once verified, set in your env vars:
   ```
   RESEND_FROM_EMAIL=Techno Zone Lanka <orders@technozonelanka.com>
   ```

## Notes
- To send to a different address, set `ORDER_NOTIFY_EMAIL` in env vars.
- Email failures never block checkout — they're logged to the server console only.
- Code: `lib/email.ts` (sender), called from `app/[locale]/checkout/actions.ts`.
