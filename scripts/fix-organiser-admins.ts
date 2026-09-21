/**
 * Inspect / restore admin roles for known organisers.
 * Usage:
 *   npx tsx --env-file=.env.local scripts/fix-organiser-admins.ts
 *   npx tsx --env-file=.env.local scripts/fix-organiser-admins.ts --apply
 */

import { adminDb } from "../src/lib/firebase-admin";
import {
  ORGANISER_ADMIN_EMAILS,
  normalizeOrganiserEmail,
} from "../src/lib/organiserAdmins";

async function main() {
  const apply = process.argv.includes("--apply");
  const db = adminDb();
  const snap = await db.collection("users").get();
  const allow = new Set(ORGANISER_ADMIN_EMAILS.map(normalizeOrganiserEmail));

  const hits: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    uid: string;
  }> = [];

  for (const d of snap.docs) {
    const x = d.data();
    const email = normalizeOrganiserEmail(String(x.email || d.id));
    if (!allow.has(email)) continue;
    hits.push({
      id: d.id,
      email: String(x.email || ""),
      displayName: String(x.displayName || ""),
      role: String(x.role || "attendee"),
      uid: String(x.uid || ""),
    });
  }

  console.log(JSON.stringify({ apply, hitCount: hits.length, hits }, null, 2));

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to set role=admin on these docs.");
    return;
  }

  const batch = db.batch();
  let n = 0;
  for (const h of hits) {
    if (h.role === "admin") continue;
    batch.set(
      db.collection("users").doc(h.id),
      { role: "admin", updatedAt: new Date().toISOString() },
      { merge: true }
    );
    n += 1;
  }
  if (n > 0) await batch.commit();
  console.log(JSON.stringify({ ok: true, promoted: n }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
