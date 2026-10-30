/**
 * Code review queue in Firestore. All three collections are server-only (Admin SDK).
 *
 *   projectCodeReviews/{projectId}       status + last finished review
 *   projectCodeFingerprints/{projectId}  code fingerprints, to spot copying between projects
 *   codeReviewMeta/queue                 a few "slots" so only N reviews run at once
 *
 * The work runs in the background agent (`functions/`), never in the website:
 *   - a team ships a project            → `enqueueCodeReview()` (Firestore trigger on projects)
 *   - a review is queued                → `drainCodeReviewQueue()` (Firestore trigger on reviews)
 *   - every few minutes                 → `queueMissingCodeReviews()` + drain (scheduled sweep)
 * The admin API only reads reviews and queues "Review again".
 *
 * Shared with Node scripts and the website, so it takes the Firestore instance as an argument
 * and has no `server-only` or Next.js imports.
 */

import { FieldPath, type Firestore } from "firebase-admin/firestore";
import { CODE_REVIEW_LIMITS, formatCodeReviewError } from "./config";
import { GitHubReadError } from "./github";
import type { FingerprintPeer } from "./checks";
import { isCodeReviewBusyError, reviewProject } from "./reviewProject";
import type { CodeReviewListItem, ProjectCodeReview } from "./schema";

export const CODE_REVIEWS_COLLECTION = "projectCodeReviews";
export const CODE_FINGERPRINTS_COLLECTION = "projectCodeFingerprints";
const QUEUE_DOC = "codeReviewMeta/queue";

/** Wait before retrying a job after GitHub/Gemini said "busy". */
const RETRY_DELAY_MS = 60_000;
/** Don't start another review in this run unless this much time is left. */
const JOB_HEADROOM_MS = 150_000;

/** Statuses that mean the team has shipped their project (drafts are never reviewed). */
const SHIPPED_STATUSES = new Set(["submitted", "reviewed", "shortlisted", "winner", "passed"]);

export interface StoredReview extends ProjectCodeReview {
  queuedAtMs?: number;
  notBeforeMs?: number;
  leaseUntilMs?: number;
  /** Set when the team re-ships while a review is running: review again when it finishes. */
  rerunRequested?: boolean;
}

export type QueueLogger = (context: string, error: unknown) => void;

type Slots = Record<string, { projectId: string; until: number }>;

const reviews = (db: Firestore) => db.collection(CODE_REVIEWS_COLLECTION);

/** Firestore rejects `undefined`; a JSON round trip drops it. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ── When a project should be reviewed ────────────────────────────────────────

type ProjectData = Record<string, unknown> | undefined;

function millis(v: unknown): number {
  const t = v as { toMillis?: () => number } | undefined;
  return typeof t?.toMillis === "function" ? t.toMillis() : 0;
}

/**
 * True when this write to `projects/{id}` needs a (new) review: the project was just shipped,
 * its GitHub link changed, or it was shipped again. Votes and status changes by admins don't count.
 */
export function projectNeedsReview(before: ProjectData, after: ProjectData): boolean {
  if (!after) return false;
  const repo = String(after.githubUrl ?? "").trim();
  if (!repo || !SHIPPED_STATUSES.has(String(after.status ?? ""))) return false;
  if (!before || !SHIPPED_STATUSES.has(String(before.status ?? ""))) return true;
  if (String(before.githubUrl ?? "").trim() !== repo) return true;
  return millis(before.submittedAt) !== millis(after.submittedAt);
}

// ── Enqueue ──────────────────────────────────────────────────────────────────

export async function enqueueCodeReview(
  db: Firestore,
  projectId: string,
  opts: { force?: boolean } = {}
): Promise<ProjectCodeReview["status"] | "no-project"> {
  const projectRef = db.collection("projects").doc(projectId);
  const reviewRef = reviews(db).doc(projectId);

  return db.runTransaction(async (tx) => {
    const [projectSnap, reviewSnap] = await Promise.all([tx.get(projectRef), tx.get(reviewRef)]);
    if (!projectSnap.exists) return "no-project";

    const repoUrl = String(projectSnap.data()?.githubUrl ?? "").trim();
    const existing = reviewSnap.exists ? (reviewSnap.data() as StoredReview) : null;
    const now = Date.now();

    if (!repoUrl) {
      tx.set(reviewRef, clean({
        projectId,
        repoUrl: "",
        status: "failed",
        result: existing?.result ?? null,
        error: "No GitHub link in this submission.",
        attempts: 0,
        finishedAt: new Date(now).toISOString(),
      }));
      return "failed";
    }

    if (existing && !opts.force) {
      if (existing.status === "queued" || existing.status === "running" || existing.status === "ready") {
        return existing.status;
      }
    }
    if (existing?.status === "running" && (existing.leaseUntilMs ?? 0) > now) {
      // Already reading the code: read it again once this review finishes.
      tx.update(reviewRef, { rerunRequested: true });
      return "running";
    }
    if (existing?.status === "queued" && (existing.notBeforeMs ?? 0) <= now) {
      return "queued";
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
      rerunRequested: false,
      startedAt: existing?.startedAt,
      finishedAt: existing?.finishedAt,
    } satisfies StoredReview));
    return "queued";
  });
}

/**
 * Queue shipped hackathon projects that have a GitHub link but no review yet.
 * Catches anything a trigger missed (deploy during the event, a dropped event).
 */
export async function queueMissingCodeReviews(db: Firestore, hackathonId: string): Promise<number> {
  const projects = await db
    .collection("projects")
    .where("hackathonId", "==", hackathonId)
    .select("githubUrl", "status")
    .get();
  const shipped = projects.docs.filter(
    (d) => String(d.get("githubUrl") ?? "").trim() && SHIPPED_STATUSES.has(String(d.get("status") ?? ""))
  );
  if (shipped.length === 0) return 0;

  const existing = await db.getAll(...shipped.map((d) => reviews(db).doc(d.id)), { fieldMask: ["status"] });
  const missing = shipped.filter((_, i) => !existing[i].exists);
  for (const d of missing) await enqueueCodeReview(db, d.id);
  return missing.length;
}

// ── Claim / release a slot ───────────────────────────────────────────────────

interface Job {
  projectId: string;
  slot: string;
  attempts: number;
}

async function claimNextJob(db: Firestore): Promise<Job | null> {
  const now = Date.now();
  const [queued, running] = await Promise.all([
    reviews(db).where("status", "==", "queued").limit(50).get(),
    reviews(db).where("status", "==", "running").limit(50).get(),
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
        rerunRequested: false,
      });
      return { projectId: snap.id, slot: free, attempts: (data.attempts ?? 0) + 1 };
    });

    if (job === "busy") return null;
    if (job) return job;
  }
  return null;
}

async function releaseSlot(db: Firestore, job: Job): Promise<void> {
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

async function loadPeers(db: Firestore, projectId: string): Promise<FingerprintPeer[]> {
  const snap = await db.collection(CODE_FINGERPRINTS_COLLECTION).get();
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

async function runJob(db: Firestore, job: Job, log: QueueLogger): Promise<void> {
  const reviewRef = reviews(db).doc(job.projectId);
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
      demoUrl: String(p.demoUrl ?? ""),
    };

    const outcome = await reviewProject(input, { peers: await loadPeers(db, job.projectId) });

    await db.collection(CODE_FINGERPRINTS_COLLECTION).doc(job.projectId).set({
      projectId: job.projectId,
      title: input.title,
      userName: String(p.userName ?? ""),
      repoKey: outcome.repoKey,
      hashes: outcome.fingerprint,
      updatedAt: new Date().toISOString(),
    });

    // If the team re-shipped (or an admin pressed "Review again") meanwhile, queue it again.
    await db.runTransaction(async (tx) => {
      const current = (await tx.get(reviewRef)).data() as StoredReview | undefined;
      const again = current?.rerunRequested === true || current?.status === "queued";
      const now = Date.now();
      tx.set(reviewRef, clean({
        ...current,
        projectId: job.projectId,
        repoUrl: input.repoUrl,
        status: again ? "queued" : "ready",
        result: outcome.result,
        error: null,
        attempts: again ? 0 : job.attempts,
        finishedAt: new Date(now).toISOString(),
        leaseUntilMs: 0,
        rerunRequested: false,
        ...(again && { queuedAt: new Date(now).toISOString(), queuedAtMs: now, notBeforeMs: 0 }),
      }));
    });
  } catch (e) {
    const retryable = (e instanceof GitHubReadError && e.retryable) || isCodeReviewBusyError(e);
    const message = e instanceof GitHubReadError ? e.message : formatCodeReviewError(e);
    if (!(e instanceof GitHubReadError) || retryable) log(`code-review ${job.projectId}`, e);
    const giveUp = !retryable || job.attempts >= CODE_REVIEW_LIMITS.maxAttempts;
    await reviewRef.update({
      status: giveUp ? "failed" : "queued",
      error: message,
      notBeforeMs: giveUp ? 0 : Date.now() + RETRY_DELAY_MS,
      leaseUntilMs: 0,
      ...(giveUp && { finishedAt: new Date().toISOString() }),
    });
  } finally {
    await releaseSlot(db, job).catch(() => undefined);
  }
}

/** Review queued projects until the queue is empty, all slots are busy, or time runs out. */
export async function drainCodeReviewQueue(
  db: Firestore,
  opts: { budgetMs: number; log?: QueueLogger }
): Promise<number> {
  const log = opts.log ?? ((context, e) => console.error(context, e));
  const started = Date.now();
  let done = 0;
  while (Date.now() - started < opts.budgetMs - JOB_HEADROOM_MS) {
    const job = await claimNextJob(db);
    if (!job) break;
    await runJob(db, job, log);
    done++;
  }
  return done;
}

// ── Reads for the admin UI ───────────────────────────────────────────────────

export async function getCodeReview(db: Firestore, projectId: string): Promise<ProjectCodeReview | null> {
  const snap = await reviews(db).doc(projectId).get();
  if (!snap.exists) return null;
  const data = { ...(snap.data() as StoredReview) };
  delete data.queuedAtMs;
  delete data.notBeforeMs;
  delete data.leaseUntilMs;
  delete data.rerunRequested;
  return data;
}

export async function listCodeReviews(db: Firestore): Promise<CodeReviewListItem[]> {
  const snap = await reviews(db)
    .select("status", new FieldPath("result", "checks"), new FieldPath("result", "written", "agentKind"))
    .get();
  return snap.docs.map((d) => {
    const checks = (d.get("result.checks") as { level: string; title: string }[] | undefined) ?? [];
    return {
      projectId: d.id,
      status: d.get("status") as ProjectCodeReview["status"],
      lookCloser: checks.filter((c) => c.level === "look").map((c) => c.title),
      agentKind: d.get("result.written.agentKind") as CodeReviewListItem["agentKind"],
    };
  });
}
