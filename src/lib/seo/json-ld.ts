/**
 * Serializes a JSON-LD block for a <script type="application/ld+json"> tag.
 *
 * JSON.stringify escapes quotes and backslashes but leaves "<", ">" and "&" alone, so a value
 * containing "</script>" would close the tag early and the remainder would run as HTML. The
 * three characters, plus the two line separators that break inline scripts, are emitted as
 * unicode escapes, which JSON parsers read back as the original characters.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
