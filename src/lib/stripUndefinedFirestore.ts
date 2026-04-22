/**
 * Firestore client rejects `undefined` field values (unless ignoreUndefinedProperties
 * is guaranteed). Use before updateDoc / setDoc with dynamic objects.
 * Strips top-level `undefined` and filters `undefined` from array field values.
 */
export function stripUndefinedForFirestoreClient(
  data: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      out[k] = v.filter((x) => x !== undefined);
    } else {
      out[k] = v;
    }
  }
  return out;
}
