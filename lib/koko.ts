import 'server-only';
import { createSign, createVerify, createPrivateKey, createPublicKey } from 'crypto';
import { SITE } from './site';

// Robust PEM normalization — handles all the ways a PEM key might be
// stored in an environment variable on Vercel / other hosts:
//   • literal \n (backslash + n)  — most common in single-line env vars
//   • \\n (double-escaped)        — some dashboards double-escape
//   • actual newlines             — multi-line env var support
//   • \r\n / \r                   — Windows / old Mac line endings
function normalizePem(v: string | undefined): string | undefined {
  if (!v) return v;
  return v
    .replace(/\\\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

export const kokoConfigured = () =>
  !!(process.env.KOKO_MERCHANT_ID && process.env.KOKO_API_KEY &&
     process.env.KOKO_PRIVATE_KEY && process.env.KOKO_PUBLIC_KEY);

export const kokoBaseUrl = () => {
  switch (process.env.KOKO_MODE) {
    case 'live': return 'https://prodapi.paykoko.com';
    case 'qa':   return 'https://qaapi.paykoko.com';
    default:     return 'https://devapi.paykoko.com';
  }
};

/** Sign a dataString with our merchant private key (RSA-SHA256), per
 *  Koko's order-create spec — verified against their own sample PHP.
 *
 *  Uses createPrivateKey() for explicit PEM parsing — Vercel runs Node 18+
 *  with OpenSSL 3.x, which rejects PKCS#1 keys (BEGIN RSA PRIVATE KEY)
 *  when passed as raw PEM strings to sign(). Parsing through
 *  createPrivateKey handles both PKCS#1 and PKCS#8 reliably. */
function signWithMerchantKey(dataString: string): string {
  const keyPem = normalizePem(process.env.KOKO_PRIVATE_KEY);
  if (!keyPem) throw new Error('KOKO_PRIVATE_KEY not set');
  const key = createPrivateKey({ key: keyPem, format: 'pem' });
  const signer = createSign('RSA-SHA256');
  signer.update(dataString);
  signer.end();
  return signer.sign(key).toString('base64');
}

/** Verify a signature Koko sent us (response webhook) using Koko's own
 *  public key — the OTHER key pair from the merchant signing key above.
 *  Same createPublicKey() approach for OpenSSL 3.x compatibility. */
export function verifyKokoSignature(dataString: string, signatureB64: string): boolean {
  const keyPem = normalizePem(process.env.KOKO_PUBLIC_KEY);
  if (!keyPem) return false;
  try {
    const key = createPublicKey({ key: keyPem, format: 'pem' });
    const verifier = createVerify('RSA-SHA256');
    verifier.update(dataString);
    verifier.end();
    return verifier.verify(key, Buffer.from(signatureB64, 'base64'));
  } catch {
    return false;
  }
}

/** Builds a unique-per-attempt Koko order id. Koko's docs explicitly warn
 *  that a new payment attempt needs a new orderId (retrying with the same
 *  one risks conflicts) — prefixed with our own order number so it stays
 *  human-traceable in the Koko merchant dashboard. */
export function newKokoOrderId(orderNumber: string): string {
  return `${orderNumber}-${Date.now().toString(36)}`;
}

/** Fields for the browser form POST to Koko's orderCreate endpoint — same
 *  shape/usage pattern as lib/payhere.ts's buildCheckoutFields. */
export function buildKokoOrderFields(o: {
  kokoOrderId: string; amount: number; firstName: string; lastName: string;
  email: string; phone: string; description: string; reference: string; locale: string;
}): Record<string, string> {
  const mId = process.env.KOKO_MERCHANT_ID!.trim();
  const apiKey = process.env.KOKO_API_KEY!.trim();
  const pluginName = 'customapi';
  const pluginVersion = process.env.KOKO_PLUGIN_VERSION?.trim() || '1';
  const amount = o.amount.toFixed(2);
  const currency = 'LKR';
  const returnUrl = `${SITE.url}/${o.locale}/order/${o.reference}`;
  const cancelUrl = `${SITE.url}/${o.locale}/checkout?cancelled=1`;
  const responseUrl = `${SITE.url}/api/koko/response`;

  // Smart quotes/dashes -> ASCII equivalents. Every signed field needs this,
  // not just description: Koko re-computes the signature on their end from
  // the raw POSTed values, so anything we sign must be byte-for-byte
  // identical to what their Java backend reconstructs. A curly apostrophe or
  // em dash (iOS/Android autocorrect loves both, and they're common in real
  // customer names, e.g. "O'Brien") is exactly the kind of character that
  // silently differs across a Node.js utf8 <-> Java charset boundary and
  // would make a legitimate customer's payment fail signature verification
  // on Koko's side for no visible reason.
  const asciiSafe = (s: string) => s.replace(/[–—]/g, '-').replace(/[‘’“”]/g, "'");

  // Description is our own store-generated text (product names), always
  // plain ASCII already, so stripping any stray non-ASCII byte here is safe.
  // firstName/lastName are real customer names — Sri Lankan customers may
  // enter these in Sinhala/Tamil script, so we normalize punctuation only
  // and never strip non-ASCII there (that would silently blank out a
  // genuine name instead of just risking a signature mismatch).
  const description = asciiSafe(o.description)
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, 250);
  const firstName = asciiSafe(o.firstName);
  const lastName = asciiSafe(o.lastName);

  // Exact concatenation order per Koko's spec — confirmed against their
  // own sample-koko-order-create.php, NOT alphabetical, do not reorder.
  const dataString =
    mId + amount + currency + pluginName + pluginVersion + returnUrl +
    cancelUrl + o.kokoOrderId + o.reference + firstName + lastName +
    o.email + description + apiKey + responseUrl;

  return {
    _mId: mId,
    api_key: apiKey,
    _returnUrl: returnUrl,
    _cancelUrl: cancelUrl,
    _responseUrl: responseUrl,
    _amount: amount,
    _currency: currency,
    _reference: o.reference,
    _orderId: o.kokoOrderId,
    _pluginName: pluginName,
    _pluginVersion: pluginVersion,
    _description: description,
    _firstName: firstName,
    _lastName: lastName,
    _email: o.email,
    _mobileNo: o.phone,
    dataString,
    signature: signWithMerchantKey(dataString),
  };
}

/** Verifies the signature on Koko's response-webhook payload. dataString
 *  order confirmed against their sample_koko_decrypt.php:
 *  orderId + trnId + status + desc (desc is usually empty string). */
export function verifyKokoResponsePayload(p: { orderId: string; trnId: string; status: string; desc?: string; signature: string }): boolean {
  const dataString = p.orderId + p.trnId + p.status + (p.desc ?? '');
  return verifyKokoSignature(dataString, p.signature);
}

export type KokoOrderStatus = { orderId: string; trnId: string; status: 'PENDING' | 'SUCCESS' | 'FAILED' | string; desc: string };

/** Actively asks Koko for an order's real status (Merchant Order View API,
 *  v1.0 — POST /api/merchants/orderView), instead of only ever waiting on
 *  their response webhook. Koko's own webhook doc admits the limitation
 *  directly: without a working _responseUrl "eCommerce will not have any
 *  way to verify if the payment has been successfully done or not from the
 *  backend" — this is the pull-based fallback for exactly that case (their
 *  webhook POST to us never arriving, for whatever reason).
 *
 *  dataString here is a DIFFERENT concatenation than order-create's — per
 *  the Merchant Order View spec: mId + pluginName + pluginVersion +
 *  orderId + apiKey (no amount/currency/urls/names involved at all). */
export async function queryKokoOrderStatus(kokoOrderId: string): Promise<KokoOrderStatus | null> {
  if (!kokoConfigured()) return null;
  const mId = process.env.KOKO_MERCHANT_ID!.trim();
  const apiKey = process.env.KOKO_API_KEY!.trim();
  const pluginName = 'customapi';
  const pluginVersion = process.env.KOKO_PLUGIN_VERSION?.trim() || '1';
  const dataString = mId + pluginName + pluginVersion + kokoOrderId + apiKey;
  const fields = {
    _mId: mId, api_key: apiKey, _orderId: kokoOrderId,
    _pluginName: pluginName, _pluginVersion: pluginVersion,
    signature: signWithMerchantKey(dataString)
  };

  try {
    const res = await fetch(`${kokoBaseUrl()}/api/merchants/orderView`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
      cache: 'no-store'
    });
    if (!res.ok) return null;

    // The spec's response table doesn't nail down a content-type for what
    // Koko sends BACK to us (only that our request must be form-urlencoded)
    // — handle either a JSON or a form-urlencoded body rather than guess.
    const raw = await res.text();
    let p: Record<string, string>;
    try {
      p = JSON.parse(raw);
    } catch {
      p = Object.fromEntries(new URLSearchParams(raw));
    }

    const payload = {
      orderId: p.orderId ?? '', trnId: p.trnId ?? '',
      status: p.status ?? '', desc: p.desc ?? '', signature: p.signature ?? ''
    };
    // Same signed dataString shape as the response webhook (orderId+trnId+
    // status+desc) — never trust this response unless it verifies against
    // Koko's public key, exactly like the webhook.
    if (!verifyKokoResponsePayload(payload)) return null;
    return { orderId: payload.orderId, trnId: payload.trnId, status: payload.status, desc: payload.desc };
  } catch {
    return null;
  }
}
