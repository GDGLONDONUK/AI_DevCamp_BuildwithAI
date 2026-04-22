import { isValid, parse } from "date-fns";

/**
 * Parse Google Form–style "M/D/YYYY H:mm:ss" (or 1-digit hour) into ISO 8601.
 * Used for `formSubmittedAt` / `registeredAt` on `users` import rows.
 */
export function formTimestampToIso(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  // Luma / Google Events: "2026-04-09 18:17:38+00:00" or with "T"
  if (/^\d{4}-\d{2}-\d{2}[\sT]\d{1,2}:\d{2}:\d{2}/.test(t)) {
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const formats = ["M/d/yyyy H:mm:ss", "M/d/yyyy H:mm", "MM/d/yyyy H:mm:ss", "M/dd/yyyy H:mm:ss"];
  for (const fmt of formats) {
    const d = parse(t, fmt, new Date(0));
    if (isValid(d)) return d.toISOString();
  }
  return null;
}

/** Compare two ISO strings; returns positive if a > b, 0 if equal, negative if a < b. */
export function compareIso(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a.localeCompare(b);
}
