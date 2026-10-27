/**
 * AIDevCamp code review agent — runs in the background on Firebase, never in the website.
 *
 *   onProjectShipped   projects/{id} written      → a team shipped (or re-shipped / changed the repo):
 *                                                   queue a review. Drafts and votes are ignored.
 *   runCodeReviews     projectCodeReviews/{id}    → a review was queued: the agent reads the repo,
 *                                                   runs the fair-play checks, writes the summary.
 *   sweepCodeReviews   every 3 minutes            → retries busy/stuck reviews and queues anything
 *                                                   a trigger missed.
 *
 * The review logic lives in `src/lib/code-review/` (shared with the admin API) and is bundled in
 * by esbuild — see `npm run build`. Results appear in Admin → Projects.
 *
 * Region: REGION below must match the Firestore database location.
 * Models: defaults in src/lib/code-review/config.ts (override with CODE_REVIEW_GEMINI_MODEL).
 * Secrets (Secret Manager; for the emulator: functions/.secret.local):
 *   CODE_REVIEW_GEMINI_API_KEY, GITHUB_TOKEN
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import {
  CODE_REVIEWS_COLLECTION,
  drainCodeReviewQueue,
  enqueueCodeReview,
  projectNeedsReview,
  queueMissingCodeReviews,
  type QueueLogger,
  type StoredReview,
} from "@/lib/code-review/queue";

initializeApp();

/** Must match the Firestore location (Firebase console → Firestore). London = europe-west2. */
const REGION = "europe-west2";

const geminiKey = defineSecret("CODE_REVIEW_GEMINI_API_KEY");
const githubToken = defineSecret("GITHUB_TOKEN");

setGlobalOptions({ region: REGION });

/** Each review runner may take this long; it stops starting new reviews ~2.5 minutes before. */
const RUN_TIMEOUT_SECONDS = 540;

const log: QueueLogger = (context, error) =>
  logger.error(context, error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) });

/** A team shipped, re-shipped or changed their repo → queue a review. */
export const onProjectShipped = onDocumentWritten({ document: "projects/{projectId}", retry: false }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!projectNeedsReview(before, after)) return;

  const status = await enqueueCodeReview(getFirestore(), event.params.projectId, { force: true });
  logger.info("code review requested", { projectId: event.params.projectId, status });
});

/** A review was queued → read the repo and write the review. At most 3 run at once. */
export const runCodeReviews = onDocumentWritten(
  {
    document: `${CODE_REVIEWS_COLLECTION}/{projectId}`,
    secrets: [geminiKey, githubToken],
    timeoutSeconds: RUN_TIMEOUT_SECONDS,
    memory: "1GiB",
    maxInstances: 3,
    concurrency: 1,
    retry: false,
  },
  async (event) => {
    const before = event.data?.before.data() as StoredReview | undefined;
    const after = event.data?.after.data() as StoredReview | undefined;
    // Only react to a review becoming queued; the review's own progress writes are ignored.
    if (after?.status !== "queued") return;
    if (before?.status === "queued" && before.queuedAtMs === after.queuedAtMs) return;

    const done = await drainCodeReviewQueue(getFirestore(), { budgetMs: RUN_TIMEOUT_SECONDS * 1000, log });
    if (done > 0) logger.info("code reviews finished", { count: done });
  }
);

/** Safety net: retry reviews that were busy or stuck, and queue shipped projects that were missed. */
export const sweepCodeReviews = onSchedule(
  {
    schedule: "every 3 minutes",
    timeZone: "Europe/London",
    secrets: [geminiKey, githubToken],
    timeoutSeconds: RUN_TIMEOUT_SECONDS,
    memory: "1GiB",
    maxInstances: 1,
  },
  async () => {
    const db = getFirestore();
    const queued = await queueMissingCodeReviews(db, DEVCAMP_HACKATHON_ID);
    const done = await drainCodeReviewQueue(db, { budgetMs: RUN_TIMEOUT_SECONDS * 1000, log });
    if (queued > 0 || done > 0) logger.info("code review sweep", { queued, done });
  }
);
