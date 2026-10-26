/**
 * Code review for hackathon final projects — settings.
 * Safe to import from Node scripts (no `server-only`). Never import from client components:
 * it reads server-only keys.
 *
 * Env (server-only, never NEXT_PUBLIC_):
 *   CODE_REVIEW_GEMINI_API_KEY  — dedicated Gemini key (falls back to LEARNING_GEMINI_API_KEY)
 *   CODE_REVIEW_GEMINI_MODEL    — optional model id, or a comma-separated list to fall back through,
 *                                 e.g. "gemini-3.8-flash,gemini-3.5-flash" (find fast ones: npm run code-review:try -- --models)
 *   GITHUB_TOKEN                — read-only token; without it GitHub allows only 60 requests/hour
 *   CODE_REVIEW_THINKING        — optional Gemini 3 thinking level: minimal | low | medium (default low)
 *   CODE_REVIEW_DEBUG           — "1" logs each Gemini attempt (time, tokens, errors) to the server log
 *   CODE_REVIEW_EVENT_START     — optional ISO time, e.g. for a dry run before the day
 *   CODE_REVIEW_DEADLINE        — optional ISO time
 */

import { HACKATHON_EVENT } from "../hackathon";

/** 31 Oct 2026 is after the clocks go back, so London time = UTC. */
const DEFAULT_EVENT_START = `${HACKATHON_EVENT.cohortEndDateIso}T09:00:00Z`;
const DEFAULT_DEADLINE = `${HACKATHON_EVENT.cohortEndDateIso}T16:00:00Z`;

export const CODE_REVIEW_LIMITS = {
  /** Largest repo download we accept (compressed). */
  maxTarballBytes: 25 * 1024 * 1024,
  /** Text files larger than this are counted but not read. */
  maxFileBytes: 200 * 1024,
  /** Code sent for the written review, in priority order. */
  maxReviewFiles: 30,
  maxReviewFileChars: 15_000,
  maxReviewTotalChars: 100_000,
  maxCommits: 300,
  /** Commits whose line counts we fetch (one GitHub request each). */
  maxCommitStats: 40,
  /** Reviews running at the same time across the whole site. */
  maxConcurrent: 3,
  /** A running review is considered stuck after this long. */
  leaseMs: 5 * 60_000,
  maxAttempts: 3,
} as const;

/** Folders and files that are never read: dependencies, builds, lock files, media. */
export const SKIP_DIRS = [
  "node_modules/", ".venv/", "venv/", "env/", "__pycache__/", ".git/", "dist/", "build/",
  ".next/", "out/", "site-packages/", "vendor/", "target/", ".idea/", ".vscode/", "coverage/",
];
export const SKIP_FILES = [
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "uv.lock", "cargo.lock",
  "go.sum", "composer.lock", "gemfile.lock",
];

export function getCodeReviewGeminiApiKey(): string {
  const key =
    process.env.CODE_REVIEW_GEMINI_API_KEY?.trim() ||
    process.env.LEARNING_GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("CODE_REVIEW_GEMINI_API_KEY is not configured");
  }
  return key;
}

/** Models to try in order. If one is slow or busy, the review moves on to the next. */
export function getCodeReviewGeminiModelIds(): string[] {
  const raw =
    process.env.CODE_REVIEW_GEMINI_MODEL?.trim() ||
    process.env.LEARNING_GEMINI_MODEL?.trim() ||
    "gemini-3.8-flash";
  const ids = raw.split(",").map((m) => m.trim()).filter(Boolean);
  return ids.length > 0 ? ids : ["gemini-3.8-flash"];
}

export function getCodeReviewGeminiModelId(): string {
  return getCodeReviewGeminiModelIds()[0];
}

export function getCodeReviewThinkingLevel(): "minimal" | "low" | "medium" {
  const raw = process.env.CODE_REVIEW_THINKING?.trim().toLowerCase();
  return raw === "minimal" || raw === "medium" ? raw : "low";
}

export function isCodeReviewDebug(): boolean {
  return process.env.CODE_REVIEW_DEBUG?.trim() === "1";
}

export function getGithubToken(): string | undefined {
  return process.env.GITHUB_TOKEN?.trim() || undefined;
}

function parseIso(raw: string | undefined, fallback: string): Date {
  const d = new Date(raw?.trim() || fallback);
  return Number.isNaN(d.getTime()) ? new Date(fallback) : d;
}

export interface EventWindow {
  start: Date;
  deadline: Date;
}

export function getEventWindow(): EventWindow {
  return {
    start: parseIso(process.env.CODE_REVIEW_EVENT_START, DEFAULT_EVENT_START),
    deadline: parseIso(process.env.CODE_REVIEW_DEADLINE, DEFAULT_DEADLINE),
  };
}

/** Map review failures to safe admin-facing copy (no env var names or key details). */
export function formatCodeReviewError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (/quota|429|Quota exceeded|RESOURCE_EXHAUSTED/i.test(raw)) {
    return "The reviewer is busy right now. It will try again shortly.";
  }
  if (/CODE_REVIEW_GEMINI_API_KEY|LEARNING_GEMINI|API key|API_KEY|not configured|PERMISSION_DENIED/i.test(raw)) {
    return "The reviewer isn't set up on this site yet. Ask an organiser to add its key.";
  }
  if (/ENOENT|\.env|process\.env|private.?key|credential/i.test(raw)) {
    return "The review failed. Try again, or open the repo on GitHub.";
  }
  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}
