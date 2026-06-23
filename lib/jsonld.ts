/**
 * Safely serialize data for an inline <script type="application/ld+json">.
 *
 * JSON.stringify does NOT escape `<`, so any field containing `</script>`
 * (e.g. a product name/description) would close the tag early and allow
 * arbitrary markup to execute — a stored XSS sink. We replace the characters
 * the HTML parser treats specially (and the JS line separators U+2028/U+2029)
 * with their JSON unicode escapes. Output is still valid, equivalent JSON-LD.
 */
export function safeJsonLd(data: unknown): string {
  const bs = String.fromCharCode(92); // a backslash, built at runtime
  const re = new RegExp('[<>&' + String.fromCharCode(0x2028, 0x2029) + ']', 'g');
  return JSON.stringify(data).replace(
    re,
    (c) => bs + 'u' + c.charCodeAt(0).toString(16).padStart(4, '0')
  );
}
