/**
 * Open September 2026 cohort: upsert cohort metadata, tag spring sessions/users,
 * sync Sonika + new agenda sessions into Firestore.
 *
 * Usage (from repo root, with .env.local):
 *   npm run open-september-2026-cohort
 */

import { FieldValue, type WriteBatch } from "firebase-admin/firestore";
import { SPEAKERS } from "../src/data/speakers";
import { SESSIONS } from "../src/data/sessions";
import { adminDb } from "../src/lib/firebase-admin";
import {
  SPRING_2026_COHORT_ID,
  SEPTEMBER_2026_COHORT_ID,
} from "../src/lib/cohorts";

const BATCH_SIZE = 400;

async function commitBatches(ops: Array<(batch: WriteBatch) => void>) {
  const db = adminDb();
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const slice = ops.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const op of slice) op(batch);
    await batch.commit();
  }
}

async function main() {
  const db = adminDb();
  const now = new Date().toISOString();

  console.log("Writing cohort metadata…");
  await db.collection("cohorts").doc(SPRING_2026_COHORT_ID).set(
    {
      cohortId: SPRING_2026_COHORT_ID,
      name: "Spring 2026 Cohort",
      displayName: "AI DevCamp Spring 2026",
      status: "completed",
      startDate: new Date("2026-04-23"),
      endDate: new Date("2026-05-19"),
      numberOfSessions: 7,
      description:
        "Spring 2026 cohort (April–May). AI agents, MCP, Google ADK, and certification.",
      theme: "Build with AI — spring programme",
      updatedAt: now,
    },
    { merge: true }
  );

  await db.collection("cohorts").doc(SEPTEMBER_2026_COHORT_ID).set(
    {
      cohortId: SEPTEMBER_2026_COHORT_ID,
      name: "September 2026 Cohort",
      displayName: "AI DevCamp September 2026",
      status: "registration",
      startDate: new Date("2026-09-23"),
      endDate: new Date("2026-10-17"),
      numberOfSessions: 9,
      description:
        "Build, Scale, Govern, Optimise — the production-ready agent lifecycle (Google Cloud Next 2026). Four weeks: Thursday theory + Saturday workshop. Kickoff Wed 23 Sept hybrid at Skyscanner.",
      theme: "Build, Scale, Govern, Optimise: the production-ready agent lifecycle",
      registrationOpen: true,
      format: "4 weeks, virtual (kickoff hybrid), Thursday 1hr + Saturday 2hr",
      updatedAt: now,
    },
    { merge: true }
  );

  console.log("Upserting speakers…");
  for (const s of SPEAKERS) {
    const speakerFields: Record<string, unknown> = { ...s };
    delete speakerFields.photo;
    const ref = db.collection("speakers").doc(s.id);
    const existing = await ref.get();
    const existingPhoto = existing.data()?.photo;
    await ref.set(
      {
        ...speakerFields,
        ...(existingPhoto ? {} : s.photo ? { photo: s.photo } : {}),
        updatedAt: now,
      },
      { merge: true }
    );
  }

  console.log("Upserting sessions…");
  const sessionOps: Array<(batch: WriteBatch) => void> = SESSIONS.map(
    (sess) => (batch) => {
      const { id, ...rest } = sess;
      batch.set(
        db.collection("sessions").doc(id),
        { ...rest, id, updatedAt: now },
        { merge: true }
      );
    }
  );
  await commitBatches(sessionOps);

  console.log("Tagging legacy sessions missing cohortId…");
  const sessionsSnap = await db.collection("sessions").get();
  const tagSessionOps: Array<(batch: WriteBatch) => void> = [];
  for (const doc of sessionsSnap.docs) {
    if (!doc.data().cohortId) {
      tagSessionOps.push((batch) =>
        batch.set(
          doc.ref,
          { cohortId: SPRING_2026_COHORT_ID, updatedAt: now },
          { merge: true }
        )
      );
    }
  }
  await commitBatches(tagSessionOps);

  console.log("Tagging users without cohortIds as spring…");
  const usersSnap = await db.collection("users").get();
  const userOps: Array<(batch: WriteBatch) => void> = [];
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const cohortIds: string[] = Array.isArray(data.cohortIds)
      ? data.cohortIds.map(String)
      : [];
    if (cohortIds.length > 0) continue;

    const status = String(data.userStatus || "participated");
    const joinedAt =
      typeof data.createdAt === "string"
        ? data.createdAt
        : data.createdAt?.toDate?.()?.toISOString?.() || now;

    userOps.push((batch) =>
      batch.set(
        doc.ref,
        {
          cohortIds: [SPRING_2026_COHORT_ID],
          activeCohortId: data.activeCohortId || SPRING_2026_COHORT_ID,
          cohortParticipation: {
            ...(typeof data.cohortParticipation === "object" && data.cohortParticipation
              ? data.cohortParticipation
              : {}),
            [SPRING_2026_COHORT_ID]: {
              status,
              joinedAt,
              role: data.role || "attendee",
            },
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    );
  }
  await commitBatches(userOps);

  console.log(
    JSON.stringify(
      {
        ok: true,
        cohorts: [SPRING_2026_COHORT_ID, SEPTEMBER_2026_COHORT_ID],
        speakersWritten: SPEAKERS.length,
        sessionsWritten: SESSIONS.length,
        legacySessionsTaggedSpring: tagSessionOps.length,
        usersTaggedSpring: userOps.length,
        note: "NEXT_PUBLIC_REGISTRATION_OPEN=true and NEXT_PUBLIC_ACTIVE_COHORT_ID=cohort-september-2026. Deploy firestore.rules. Existing users Join September via banner.",
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
