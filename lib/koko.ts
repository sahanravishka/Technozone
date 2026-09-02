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

  // Truncate description BEFORE building dataString — Koko re-computes the
  // signature on their end using the _description value they receive, so the
  // value signed here must be byte-for-byte identical to what gets posted.
  // We also replace smart quotes/dashes with ASCII and strip non-ASCII to
  // prevent encoding mismatches between Node.js utf8 and Koko's Java backend.
  const description = o.description
    .replace(/[–—]/g, '-')
    .replace(/[‘’“”]/g, "'")
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, 250);

  // Exact concatenation order per Koko's spec — confirmed against their
  // own sample-koko-order-create.php, NOT alphabetical, do not reorder.
  const dataString =
    mId + amount + currency + pluginName + pluginVersion + returnUrl +
    cancelUrl + o.kokoOrderId + o.reference + o.firstName + o.lastName +
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
    _firstName: o.firstName,
    _lastName: o.lastName,
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
