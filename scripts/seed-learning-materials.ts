/**
 * Seed sessionLearningMaterials from Firestore sessions (summaries + concepts).
 * Usage: npx tsx --env-file=.env.local scripts/seed-learning-materials.ts
 * Optional: --cohort=cohort-september-2026
 */

import { adminDb } from "../src/lib/firebase-admin";
import {
  getActiveCohortId,
  SPRING_2026_COHORT_ID,
} from "../src/lib/cohorts";
import { SESSION_LEARNING_MATERIALS_COLLECTION } from "../src/lib/learning-chat/constants";
import type { Session, SessionLearningMaterial } from "../src/types";

function parseArgs() {
  const cohortArg = process.argv.find((a) => a.startsWith("--cohort="));
  return {
    cohortId: cohortArg?.slice("--cohort=".length) || getActiveCohortId(),
  };
}

function buildFromSession(session: Session): SessionLearningMaterial[] {
  const baseId = `${session.id}_summary`;
  const concepts = [
    session.topic,
    ...(session.whatYouWillLearn || []).slice(0, 8),
    ...(session.tags || []),
  ].filter(Boolean);

  const summaryText = [
    `# ${session.title}`,
    `Date: ${session.date} ${session.time}`,
    `Week ${session.week} · Topic: ${session.topic}`,
    "",
    session.description,
    "",
    session.whatYouWillLearn?.length
      ? `## What you'll learn\n${session.whatYouWillLearn.map((x) => `- ${x}`).join("\n")}`
      : "",
    session.buildIdeas?.length
      ? `## Build ideas\n${session.buildIdeas.map((x) => `- ${x}`).join("\n")}`
      : "",
    session.resources?.length
      ? `## Resources\n${session.resources.map((r) => `- ${r.title}: ${r.url}`).join("\n")}`
      : "",
    session.videoUrl ? `## Video\n${session.videoUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const rows: SessionLearningMaterial[] = [
    {
      id: baseId,
      sessionId: session.id,
      cohortId: session.cohortId || SPRING_2026_COHORT_ID,
      title: `${session.title} — session summary`,
      kind: "session_summary",
      textContent: summaryText,
      url: session.videoUrl,
      concepts,
      week: session.week,
      sessionTitle: session.title,
      sessionTopic: session.topic,
    },
  ];

  if (session.whatYouWillLearn?.length) {
    rows.push({
      id: `${session.id}_concepts`,
      sessionId: session.id,
      cohortId: session.cohortId || SPRING_2026_COHORT_ID,
      title: `${session.title} — key concepts`,
      kind: "concept",
      textContent: [
        `Key concepts for ${session.title} (${session.topic}):`,
        ...session.whatYouWillLearn.map((c) => `- ${c}`),
        session.buildIdeas?.length
          ? `\nPractice / build:\n${session.buildIdeas.map((b) => `- ${b}`).join("\n")}`
          : "",
      ].join("\n"),
      concepts,
      week: session.week,
      sessionTitle: session.title,
      sessionTopic: session.topic,
    });
  }

  if (session.videoUrl) {
    rows.push({
      id: `${session.id}_video`,
      sessionId: session.id,
      cohortId: session.cohortId || SPRING_2026_COHORT_ID,
      title: `${session.title} — recording`,
      kind: "video",
      textContent: `Session recording for ${session.title}. Watch: ${session.videoUrl}`,
      url: session.videoUrl,
      concepts,
      week: session.week,
      sessionTitle: session.title,
      sessionTopic: session.topic,
    });
  }

  return rows;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

async function main() {
  const { cohortId } = parseArgs();
  const snap = await adminDb().collection("sessions").get();
  const sessions = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Session, "id">) }))
    .filter((s) => (s.cohortId || SPRING_2026_COHORT_ID) === cohortId);

  const now = new Date().toISOString();
  const batch = adminDb().batch();
  let n = 0;

  for (const session of sessions) {
    for (const material of buildFromSession(session)) {
      const ref = adminDb()
        .collection(SESSION_LEARNING_MATERIALS_COLLECTION)
        .doc(material.id);
      batch.set(
        ref,
        stripUndefined({
          ...material,
          updatedAt: now,
          updatedByUid: "seed-learning-materials",
        } as Record<string, unknown>),
        { merge: true }
      );
      n += 1;
    }
  }

  await batch.commit();
  console.log(
    JSON.stringify({ ok: true, cohortId, sessions: sessions.length, materials: n }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
