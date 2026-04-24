/**
 * Email identity for admin lists, deduplication, and one-off import scripts.
 * Not a substitute for server-side auth; use Firebase Auth for proof of mailbox.
 */

/** Same mailbox for duplicate detection (gmail ↔ googlemail). */
export function canonicalPreRegEmail(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  let e = raw.toLowerCase().trim();
  if (e.endsWith("@googlemail.com")) e = e.replace("@googlemail.com", "@gmail.com");
  return e;
}

/** Aliases treated as the same mailbox for lookup (Gmail / Googlemail). */
export function mailboxAliases(raw: string): string[] {
  const norm = raw.trim().toLowerCase();
  const out = new Set<string>([norm]);
  if (norm.includes("@googlemail.com")) {
    out.add(norm.replace("@googlemail.com", "@gmail.com"));
  }
  if (norm.includes("@gmail.com")) {
    out.add(norm.replace("@gmail.com", "@googlemail.com"));
  }
  return [...out];
}

export function mailboxInNormalizedSet(rawEmail: string, normalizedLowercaseSet: Set<string>): boolean {
  return mailboxAliases(rawEmail).some((v) => normalizedLowercaseSet.has(v));
}
