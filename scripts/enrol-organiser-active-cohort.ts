/**
 * Ensure an organiser email is admin + enrolled in the live programme cohort.
 *
 *   npx tsx --env-file=.env.local scripts/enrol-organiser-active-cohort.ts --email=you@example.com
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../src/lib/firebase-admin";
import { resolveActiveCohortIdFromDb } from "../src/lib/server/activeCohort";

const emailArg = process.argv.find((a) => a.startsWith("--email="))?.slice("--email=".length);
const email = (emailArg || "").trim().toLowerCase();

if (!email || !email.includes("@")) {
  console.error("Usage: --email=organiser@example.com");
  process.exit(1);
}

async function main() {
  const active = await resolveActiveCohortIdFromDb();
  const user = await adminAuth().getUserByEmail(email);
  const ref = adminDb().collection("users").doc(user.uid);
  const beforeSnap = await ref.get();
  const before = beforeSnap.data();
  const nowIso = new Date().toISOString();

  await ref.set(
    {
      role: "admin",
      activeCohortId: active,
      cohortIds: FieldValue.arrayUnion(active),
      cohortParticipation: {
        ...(before?.cohortParticipation && typeof before.cohortParticipation === "object"
          ? before.cohortParticipation
          : {}),
        [active]: {
          status: "participated",
          joinedAt:
            (before?.cohortParticipation as Record<string, { joinedAt?: string }> | undefined)?.[
              active
            ]?.joinedAt || nowIso,
          role: "admin",
        },
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const after = (await ref.get()).data();
  console.log(
    JSON.stringify(
      {
        ok: true,
        uid: user.uid,
        email,
        programmeActive: active,
        before: {
          activeCohortId: before?.activeCohortId ?? null,
          cohortIds: before?.cohortIds ?? null,
        },
        after: {
          activeCohortId: after?.activeCohortId ?? null,
          cohortIds: after?.cohortIds ?? null,
          role: after?.role ?? null,
        },
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
