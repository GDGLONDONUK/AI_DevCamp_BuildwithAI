/**
 * Redact mailbox addresses for logs (scripts, support). Domain part kept for context.
 */

export function redactEmail(email: string): string {
  const t = email.trim().toLowerCase();
  const at = t.lastIndexOf("@");
  if (at <= 0 || at === t.length - 1) return "[invalid]";
  const local = t.slice(0, at);
  const domain = t.slice(at + 1);
  if (!local.length) return `[redacted]@${domain}`;
  const show = local.length <= 2 ? `${local[0] ?? "*"}*` : `${local[0]}…${local.slice(-1)}`;
  return `${show}@${domain}`;
}
