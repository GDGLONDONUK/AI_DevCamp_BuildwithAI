/**
 * Normalise location strings from CSV / forms (whitespace, separators, empty placeholders).
 */

const PLACEHOLDER_RE = /^(n\/a|n\.a\.|na|none|null|undefined|—|–|−|-+|\.+|\s*)$/i;

/** Trim, collapse spaces, strip BOM, strip stray punctuation at edges. */
export function cleanGeoText(input: string): string {
  if (!input) return "";
  let s = input
    .replace(/\uFEFF/g, "")
    .replace(/[\s\u00A0\u2000-\u200B\u202F\u205F\u3000]+/g, " ")
    .trim();
  s = s.replace(/^[,;\/\s|]+|[,;\/\s|]+$/g, "").trim();
  s = s.replace(/,\s*,+/g, ",").replace(/\s{2,}/g, " ");
  return s;
}

export function isEmptyLocationPlaceholder(s: string): boolean {
  if (!s) return true;
  return PLACEHOLDER_RE.test(cleanGeoText(s));
}

/**
 * Split "City / Country", "City, Country", "City | Region | Country" into cleaned fields.
 * `location` is a display string: "City, Country" when both exist, else city or cleaned raw.
 */
export function parseLocationFields(raw: string): { location: string; city: string; country: string } {
  const cleaned = cleanGeoText(raw);
  if (!cleaned || isEmptyLocationPlaceholder(cleaned)) {
    return { location: "", city: "", country: "" };
  }

  const parts = cleaned
    .split(/[,/|]/)
    .map((p) => cleanGeoText(p))
    .filter((p) => p && !isEmptyLocationPlaceholder(p));

  if (parts.length === 0) return { location: "", city: "", country: "" };
  if (parts.length === 1) {
    const only = parts[0];
    return { location: only, city: only, country: "" };
  }

  const city = parts[0];
  const country = parts[parts.length - 1];
  const location = city === country ? city : [city, country].join(", ");
  return { location, city, country };
}
