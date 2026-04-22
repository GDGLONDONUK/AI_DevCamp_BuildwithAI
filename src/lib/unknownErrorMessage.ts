/**
 * Human-readable string from a thrown value (incl. Firestore/Auth with `code`, empty `message`).
 */
export function unknownErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err instanceof Error) {
    const m = err.message?.trim();
    if (m) return m;
    if (err.name && err.name !== "Error") return err.name;
  }
  if (err && typeof err === "object") {
    const o = err as { code?: string; message?: string; name?: string };
    const m = typeof o.message === "string" ? o.message.trim() : "";
    if (m) return m;
    if (o.code) return o.code;
  }
  return fallback;
}
