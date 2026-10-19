/**
 * Patch September 2026 cohort end date + closing hackathon metadata in Firestore.
 * Does not change registration status or re-seed the full agenda.
 *
 *   npx tsx --env-file=.env.local scripts/update-september-cohort-closing.ts
 */

import { SEPTEMBER_2026_COHORT_ID } from "../src/lib/cohorts";
import { HACKATHON_EVENT, HACKATHON_LUMA_URL } from "../src/lib/hackathon";
import { adminDb } from "../src/lib/firebase-admin";

async function main() {
  const db = adminDb();
  const now = new Date().toISOString();
  const ref = db.collection("cohorts").doc(SEPTEMBER_2026_COHORT_ID);

  await ref.set(
    {
      endDate: new Date("2026-10-31"),
      numberOfSessions: 9,
      description:
        "Build, Scale, Govern, Optimise — the production-ready agent lifecycle. Kickoff 23 Sept 2026. Cohort finishes 31 Oct 2026 with the Agentic Hackathon, show-and-tell, pitching, and certificate / award ceremony (Encode Hub + online). Luma: " +
        HACKATHON_LUMA_URL,
      format: "4 weeks + closing hackathon (31 Oct), virtual + hybrid kickoff/closing",
      closingEvent: {
        title: HACKATHON_EVENT.title,
        shortTitle: HACKATHON_EVENT.shortTitle,
        date: HACKATHON_EVENT.cohortEndDateIso,
        dateLabel: HACKATHON_EVENT.dateLabel,
        timeLabel: HACKATHON_EVENT.timeLabel,
        venueName: HACKATHON_EVENT.venueName,
        venueAddress: HACKATHON_EVENT.venueAddress,
        lumaUrl: HACKATHON_LUMA_URL,
        sitePath: "/hackathon",
        sessionId: HACKATHON_EVENT.sessionId,
      },
      updatedAt: now,
    },
    { merge: true }
  );

  const snap = await ref.get();
  console.log(
    JSON.stringify(
      {
        ok: true,
        cohortId: SEPTEMBER_2026_COHORT_ID,
        endDate: snap.data()?.endDate?.toDate?.()?.toISOString?.() || snap.data()?.endDate,
        closingEvent: snap.data()?.closingEvent,
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
