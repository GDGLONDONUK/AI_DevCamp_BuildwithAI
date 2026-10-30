/** Drop email/phone fields from owner-facing API payloads (legacy docs may still store them). */
export function omitContactPii<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  delete next.email;
  delete next.userEmail;
  delete next.phone;
  delete next.phoneNumber;
  return next;
}

export function looksLikeEmail(value: string): boolean {
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value);
}

/** Name shown on public/attendee cards — never an email address. */
export function publicDisplayName(raw: unknown, fallback = "Builder"): string {
  const name = String(raw ?? "").trim();
  if (!name || looksLikeEmail(name) || name.includes("<")) return fallback;
  return name.slice(0, 80);
}
