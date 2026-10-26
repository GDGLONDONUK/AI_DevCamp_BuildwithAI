import "server-only";

/**
 * Code review queue in Firestore (Admin SDK only — all three collections are server-only).
 *
 *   projectCodeReviews/{projectId}       status + last finished review
 *   projectCodeFingerprints/{projectId}  code fingerprints, to spot copying between projects
 *   codeReviewMeta/queue                 a few "slots" so only N reviews run at once site-wide
 *
 * Submitting a project never waits for a review. Work is picked up by `drainCodeReviewQueue()`,
 * which API routes run in `after()` — on submit, on "Review again", and whenever an admin
 * views the projects list. A review that dies mid-way (function timeout) frees its slot when
 * its lease runs out and is picked up again.
 */

import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { CODE_REVIEW_LIMITS, formatCodeReviewError, getEventWindow } from "./config";
import { GitHubReadError } from "./github";
import type { FingerprintPeer } from "./checks";
import { isCodeReviewBusyError, reviewProject } from "./reviewProject";
import type { CodeReviewListItem, ProjectCodeReview } from "./schema";

export const CODE_REVIEWS_COLLECTION = "projectCodeReviews";
export const CODE_FINGERPRINTS_COLLECTION = "projectCodeFingerprints";
const QUEUE_DOC = "codeReviewMeta/queue";
const SWEEP_DOC = "codeReviewMeta/sweep";
/** How often the admin list may look for projects that were never queued. */
const SWEEP_EVERY_MS = 2 * 60_000;

/** Wait before retrying a job after GitHub/Gemini said "busy". */
const RETRY_DELAY_MS = 60_000;
/** Don't start another review in this invocation unless this much time is left. */
const JOB_HEADROOM_MS = 150_000;

interface StoredReview extends ProjectCodeReview {
  queuedAtMs?: number;
  notBeforeMs?: number;
  leaseUntilMs?: number;
}

type Slots = Record<string, { projectId: string; until: number }>;

const reviews = () => adminDb().collection(CODE_REVIEWS_COLLECTION);

/** Firestore rejects `undefined`; a JSON round trip drops it. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ── Enqueue ──────────────────────────────────────────────────────────────────

export async function enqueueCodeReview(
  projectId: string,
  opts: { force?: boolean } = {}
): Promise<ProjectCodeReview["status"] | "no-project"> {
  const db = adminDb();
  const projectRef = db.collection("projects").doc(projectId);
  const reviewRef = reviews().doc(projectId);

  return db.runTransaction(async (tx) => {
    const [projectSnap, reviewSnap] = await Promise.all([tx.get(projectRef), tx.get(reviewRef)]);
    if (!projectSnap.exists) return "no-project";

    const repoUrl = String(projectSnap.data()?.githubUrl ?? "").trim();
    const existing = reviewSnap.exists ? (reviewSnap.data() as StoredReview) : null;
    const now = Date.now();

    if (!repoUrl) {
      tx.set(reviewRef, clean({ projectId, repoUrl: "", status: "failed", result: existing?.result ?? null, error: "No GitHub link in this submission.", attempts: 0, finishedAt: new Date(now).toISOString() }));
      return "failed";
    }

    if (existing && !opts.force) {
      const busy = existing.status === "queued" || existing.status === "running";
      if (busy || existing.status === "ready") return existing.status;
    }
    if (existing?.status === "running" && (existing.leaseUntilMs ?? 0) > now) {
      return "running"; // already being reviewed right now
    }

    tx.set(reviewRef, clean({
      projectId,
      repoUrl,
      status: "queued",
      result: existing?.result ?? null,
      attempts: 0,
      queuedAt: new Date(now).toISOString(),
      queuedAtMs: now,
      notBeforeMs: 0,
      startedAt: existing?.startedAt,
      finishedAt: existing?.finishedAt,
    } satisfies StoredReview));
    return "queued";
  });
}

/**
 * Queue projects submitted for the hackathon that have a GitHub link but no review yet.
 * Catches anything the submit page failed to queue (closed tab, network blip).
 */
export async function queueMissingCodeReviews(): Promise<number> {
  const db = adminDb();
  const since = new Date(getEventWindow().start.getTime() - 12 * 3_600_000);
  const projects = await db
    .collection("projects")
    .where("submittedAt", ">=", Timestamp.fromDate(since))
    .select("githubUrl")
    .get();
  const withRepo = projects.docs.filter((d) => String(d.get("githubUrl") ?? "").trim());
  if (withRepo.length === 0) return 0;

  const refs = withRepo.map((d) => reviews().doc(d.id));
  const existing = await db.getAll(...refs, { fieldMask: ["status"] });
  const missing = withRepo.filter((_, i) => !existing[i].exists);
  for (const d of missing) await enqueueCodeReview(d.id);
  return missing.length;
}

/** `queueMissingCodeReviews()` at most every couple of minutes, however often admins poll. */
export async function maybeQueueMissingCodeReviews(): Promise<number> {
  const db = adminDb();
  const ref = db.doc(SWEEP_DOC);
  const due = await db.runTransaction(async (tx) => {
    const last = ((await tx.get(ref)).data()?.lastSweepMs as number | undefined) ?? 0;
    if (Date.now() - last < SWEEP_EVERY_MS) return false;
    tx.set(ref, { lastSweepMs: Date.now() });
    return true;
  });
  return due ? queueMissingCodeReviews() : 0;
}

// ── Claim / release a slot ───────────────────────────────────────────────────

interface Job {
  projectId: string;
  slot: string;
  attempts: number;
}

async function claimNextJob(): Promise<Job | null> {
  const db = adminDb();
  const now = Date.now();

  const [queued, running] = await Promise.all([
    reviews().where("status", "==", "queued").limit(50).get(),
    reviews().where("status", "==", "running").limit(50).get(),
  ]);
  const candidates = [
    ...queued.docs.filter((d) => ((d.data() as StoredReview).notBeforeMs ?? 0) <= now),
    ...running.docs.filter((d) => ((d.data() as StoredReview).leaseUntilMs ?? 0) < now),
  ].sort((a, b) => ((a.data() as StoredReview).queuedAtMs ?? 0) - ((b.data() as StoredReview).queuedAtMs ?? 0));

  for (const candidate of candidates) {
    const job = await db.runTransaction(async (tx): Promise<Job | null | "busy"> => {
      const queueRef = db.doc(QUEUE_DOC);
      const [queueSnap, snap] = await Promise.all([tx.get(queueRef), tx.get(candidate.ref)]);
      const slots: Slots = (queueSnap.data()?.slots as Slots) ?? {};
      const t = Date.now();

      let free: string | null = null;
      for (let i = 0; i < CODE_REVIEW_LIMITS.maxConcurrent; i++) {
        const s = slots[String(i)];
        if (!s || s.until < t) {
          free = String(i);
          break;
        }
      }
      if (free === null) return "busy";

      const data = snap.data() as StoredReview | undefined;
      if (!data) return null;
      const claimable =
        (data.status === "queued" && (data.notBeforeMs ?? 0) <= t) ||
        (data.status === "running" && (data.leaseUntilMs ?? 0) < t);
      if (!claimable) return null;

      if ((data.attempts ?? 0) >= CODE_REVIEW_LIMITS.maxAttempts) {
        tx.update(snap.ref, {
          status: "failed",
          error: data.error || "The review kept stopping part-way. Try again, or open the repo on GitHub.",
          finishedAt: new Date(t).toISOString(),
        });
        return null;
      }

      const until = t + CODE_REVIEW_LIMITS.leaseMs;
      tx.set(queueRef, { slots: { ...slots, [free]: { projectId: snap.id, until } } }, { merge: true });
      tx.update(snap.ref, {
        status: "running",
        startedAt: new Date(t).toISOString(),
        leaseUntilMs: until,
        attempts: (data.attempts ?? 0) + 1,
      });
      return { projectId: snap.id, slot: free, attempts: (data.attempts ?? 0) + 1 };
    });

    if (job === "busy") return null;
    if (job) return job;
  }
  return null;
}

async function releaseSlot(job: Job): Promise<void> {
  const db = adminDb();
  const queueRef = db.doc(QUEUE_DOC);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(queueRef);
    const slots: Slots = (snap.data()?.slots as Slots) ?? {};
    if (slots[job.slot]?.projectId !== job.projectId) return;
    delete slots[job.slot];
    tx.set(queueRef, { slots });
  });
}

// ── Run one job ──────────────────────────────────────────────────────────────

async function loadPeers(projectId: string): Promise<FingerprintPeer[]> {
  const snap = await adminDb().collection(CODE_FINGERPRINTS_COLLECTION).get();
  return snap.docs
    .filter((d) => d.id !== projectId)
    .map((d) => ({
      projectId: d.id,
      title: String(d.get("title") ?? ""),
      userName: String(d.get("userName") ?? ""),
      repoKey: String(d.get("repoKey") ?? ""),
      hashes: (d.get("hashes") as string[] | undefined) ?? [],
    }));
}

async function runJob(job: Job): Promise<void> {
  const db = adminDb();
  const reviewRef = reviews().doc(job.projectId);
  try {
    const project = await db.collection("projects").doc(job.projectId).get();
    if (!project.exists) {
      await reviewRef.delete();
      return;
    }
    const p = project.data()!;
    const input = {
      repoUrl: String(p.githubUrl ?? ""),
      title: String(p.title ?? ""),
      description: String(p.description ?? ""),
      techStack: Array.isArray(p.techStack) ? (p.techStack as string[]) : [],
    };

    const outcome = await reviewProject(input, { peers: await loadPeers(job.projectId) });

    await db.collection(CODE_FINGERPRINTS_COLLECTION).doc(job.projectId).set({
      projectId: job.projectId,
      title: input.title,
      userName: String(p.userName ?? ""),
      repoKey: outcome.repoKey,
      hashes: outcome.fingerprint,
      updatedAt: new Date().toISOString(),
    });

    // If someone pressed "Review again" while this ran, keep it queued so the newest code is read.
    await db.runTransaction(async (tx) => {
      const current = (await tx.get(reviewRef)).data() as StoredReview | undefined;
      const requeued = current?.status === "queued";
      tx.set(reviewRef, clean({
        ...current,
        projectId: job.projectId,
        repoUrl: input.repoUrl,
        status: requeued ? "queued" : "ready",
        result: outcome.result,
        error: null,
        attempts: requeued ? 0 : job.attempts,
        finishedAt: new Date().toISOString(),
        leaseUntilMs: 0,
      }));
    });
  } catch (e) {
    const retryable = (e instanceof GitHubReadError && e.retryable) || isCodeReviewBusyError(e);
    const message = e instanceof GitHubReadError ? e.message : formatCodeReviewError(e);
    if (!(e instanceof GitHubReadError) || retryable) {
      logServerRouteException(`code-review ${job.projectId}`, e);
    }
    const giveUp = !retryable || job.attempts >= CODE_REVIEW_LIMITS.maxAttempts;
    await reviewRef.update({
      status: giveUp ? "failed" : "queued",
      error: message,
      notBeforeMs: giveUp ? 0 : Date.now() + RETRY_DELAY_MS,
      leaseUntilMs: 0,
      ...(giveUp && { finishedAt: new Date().toISOString() }),
    });
  } finally {
    await releaseSlot(job).catch(() => undefined);
  }
}

/** Review queued projects until the queue is empty, all slots are busy, or time runs out. */
export async function drainCodeReviewQueue(budgetMs = 280_000): Promise<number> {
  const started = Date.now();
  let done = 0;
  while (Date.now() - started < budgetMs - JOB_HEADROOM_MS) {
    const job = await claimNextJob();
    if (!job) break;
    await runJob(job);
    done++;
  }
  return done;
}

// ── Reads for the admin UI ───────────────────────────────────────────────────

export async function getCodeReview(projectId: string): Promise<ProjectCodeReview | null> {
  const snap = await reviews().doc(projectId).get();
  if (!snap.exists) return null;
  const data = { ...(snap.data() as StoredReview) };
  delete data.queuedAtMs;
  delete data.notBeforeMs;
  delete data.leaseUntilMs;
  return data;
}

export async function listCodeReviews(): Promise<{ items: CodeReviewListItem[]; needsWork: boolean }> {
  const snap = await reviews()
    .select("status", "notBeforeMs", "leaseUntilMs", new FieldPath("result", "checks"), new FieldPath("result", "written", "agent", "kind"))
    .get();
  const now = Date.now();
  let needsWork = false;
  const items = snap.docs.map((d) => {
    const status = d.get("status") as ProjectCodeReview["status"];
    if (status === "queued" && ((d.get("notBeforeMs") as number) ?? 0) <= now) needsWork = true;
    if (status === "running" && ((d.get("leaseUntilMs") as number) ?? 0) < now) needsWork = true;
    const checks = (d.get("result.checks") as { level: string; title: string }[] | undefined) ?? [];
    return {
      projectId: d.id,
      status,
      lookCloser: checks.filter((c) => c.level === "look").map((c) => c.title),
      agentKind: d.get("result.written.agent.kind") as CodeReviewListItem["agentKind"],
    };
  });
  return { items, needsWork };
}
