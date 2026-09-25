/**
 * Upsert September (+ archived spring) learning-task templates from seed data.
 * Usage: npx tsx --env-file=.env.local scripts/seed-learning-task-templates-cohort.ts
 */
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../src/lib/firebase-admin";
import { LEARNING_TASK_TEMPLATES_SEED } from "../src/data/learningTaskTemplatesSeed";
import { SPRING_2026_COHORT_ID } from "../src/lib/cohorts";

async function main() {
  const db = adminDb();
  const now = FieldValue.serverTimestamp();

  let batch = db.batch();
  let n = 0;
  const flush = async () => {
    if (n === 0) return;
    await batch.commit();
    batch = db.batch();
    n = 0;
  };

  for (const row of LEARNING_TASK_TEMPLATES_SEED) {
    batch.set(
      db.collection("learningTaskTemplates").doc(row.id),
      {
        cohortId: row.cohortId,
        sessionKey: row.sessionKey,
        sessionLabel: row.sessionLabel,
        sessionOrder: row.sessionOrder,
        title: row.title,
        category: row.category,
        sortOrder: row.sortOrder,
        notes: row.notes ?? "",
        active: row.active !== false,
        updatedAt: now,
        updatedByUid: "seed-learning-task-templates-cohort",
        createdAt: now,
      },
      { merge: true }
    );
    n++;
    if (n >= 400) await flush();
  }
  await flush();

  // Deactivate any leftover untagged / session-* templates not in seed
  const all = await db.collection("learningTaskTemplates").get();
  const seedIds = new Set(LEARNING_TASK_TEMPLATES_SEED.map((r) => r.id));
  let deactivated = 0;
  batch = db.batch();
  n = 0;
  for (const d of all.docs) {
    const data = d.data();
    const isSpringKey =
      typeof data.sessionKey === "string" && /^session-\d+$/i.test(data.sessionKey);
    const missingSept =
      data.cohortId !== undefined && data.cohortId !== SPRING_2026_COHORT_ID
        ? false
        : isSpringKey && !seedIds.has(d.id);
    if (
      (isSpringKey && data.active !== false && !String(data.cohortId || "").includes("september")) ||
      missingSept
    ) {
      // Keep seeded spring rows as written; deactivate unknown spring leftovers
      if (!seedIds.has(d.id) && isSpringKey) {
        batch.set(d.ref, { active: false, cohortId: SPRING_2026_COHORT_ID, updatedAt: now }, { merge: true });
        deactivated++;
        n++;
        if (n >= 400) await flush();
      }
    }
  }
  await flush();

  const sept = LEARNING_TASK_TEMPLATES_SEED.filter((r) => r.cohortId.includes("september"));
  console.log(
    JSON.stringify(
      {
        seeded: LEARNING_TASK_TEMPLATES_SEED.length,
        septemberActive: sept.length,
        deactivatedExtras: deactivated,
        sampleSept: sept.slice(0, 3).map((r) => ({ id: r.id, notes: r.notes })),
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
