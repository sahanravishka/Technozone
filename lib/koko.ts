import 'server-only';
import { createSign, createVerify } from 'crypto';
import { SITE } from './site';

// Koko sends PEM keys as env vars with literal \n escape sequences (same
// convention as most PEM-in-env-var setups) — turn them back into real
// newlines before handing to Node's crypto module.
const pem = (v: string | undefined) => v?.replace(/\\n/g, '\n');

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
 *  Koko's order-create spec — verified against their own sample PHP. */
function signWithMerchantKey(dataString: string): string {
  const key = pem(process.env.KOKO_PRIVATE_KEY);
  if (!key) throw new Error('KOKO_PRIVATE_KEY not set');
  const signer = createSign('RSA-SHA256');
  signer.update(dataString);
  signer.end();
  return signer.sign(key).toString('base64');
}

/** Verify a signature Koko sent us (response webhook) using Koko's own
 *  public key — the OTHER key pair from the merchant signing key above. */
export function verifyKokoSignature(dataString: string, signatureB64: string): boolean {
  const key = pem(process.env.KOKO_PUBLIC_KEY);
  if (!key) return false;
  try {
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
  email: string; description: string; reference: string; locale: string;
}): Record<string, string> {
  const mId = process.env.KOKO_MERCHANT_ID!;
  const apiKey = process.env.KOKO_API_KEY!;
  const pluginName = 'customapi';
  const pluginVersion = process.env.KOKO_PLUGIN_VERSION || '1.0.0';
  const amount = o.amount.toFixed(2);
  const currency = 'LKR';
  const returnUrl = `${SITE.url}/${o.locale}/order/${o.reference}`;
  const cancelUrl = `${SITE.url}/${o.locale}/checkout?cancelled=1`;
  const responseUrl = `${SITE.url}/api/koko/response`;

  // Exact concatenation order per Koko's spec — confirmed against their
  // own sample-koko-order-create.php, NOT alphabetical, do not reorder.
  const dataString =
    mId + amount + currency + pluginName + pluginVersion + returnUrl +
    cancelUrl + o.kokoOrderId + o.reference + o.firstName + o.lastName +
    o.email + o.description + apiKey + responseUrl;

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
    _description: o.description.slice(0, 250),
    _firstName: o.firstName,
    _lastName: o.lastName || '-',
    _email: o.email,
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
