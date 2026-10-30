/**
 * Reviews one repo end to end: download → checks → facts → written review.
 * Safe to import from Node scripts (no `server-only`); Firestore lives in `queue.ts`.
 *
 * Checks run first and never need the model, so judges always get them even if
 * the written review fails.
 */

import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  formatCodeReviewError,
  getCodeReviewGeminiApiKey,
  getCodeReviewGeminiModelIds,
  getCodeReviewThinkingLevel,
  getEventWindow,
  isCodeReviewDebug,
  type EventWindow,
} from "./config";
import { fetchRepoSnapshot, normaliseRepoUrl, type RepoSnapshot } from "./github";
import {
  checkBuildWindow,
  checkHasCode,
  checkHiddenInstructions,
  checkOriginal,
  checkSecrets,
  checkSteadyProgress,
  fingerprint,
  type FingerprintPeer,
} from "./checks";
import { buildStats } from "./stats";
import { buildReviewPrompt, CODE_REVIEW_SYSTEM_PROMPT, selectReviewFiles } from "./prompt";
import { codeReviewWrittenSchema, type CodeReviewResult, type CodeReviewWritten } from "./schema";

let providerSingleton: ReturnType<typeof createGoogleGenerativeAI> | null = null;

function getProvider() {
  if (!providerSingleton) {
    providerSingleton = createGoogleGenerativeAI({ apiKey: getCodeReviewGeminiApiKey() });
  }
  return providerSingleton;
}

export interface ReviewInput {
  repoUrl: string;
  title: string;
  description: string;
  techStack: string[];
  demoUrl?: string;
}

export interface ReviewOptions {
  /** Other projects' fingerprints, to spot copied code. */
  peers?: FingerprintPeer[];
  window?: EventWindow;
  /** Skip the model (checks and facts only). */
  checksOnly?: boolean;
  /** Replace the model call, e.g. in a local dry run. */
  writeReview?: (prompt: string) => Promise<CodeReviewWritten>;
}

export interface ReviewOutcome {
  result: CodeReviewResult;
  repoKey: string;
  fingerprint: string[];
}

function isBusyError(e: unknown): boolean {
  const raw = e instanceof Error ? `${e.message} ${(e as { statusCode?: number }).statusCode ?? ""}` : String(e);
  return /429|quota|RESOURCE_EXHAUSTED|503|overloaded|UNAVAILABLE/i.test(raw);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The written review must finish well inside the queue's 5-minute lease. */
const WRITE_TIMEOUT_MS = 150_000;

/** Gemini 3 models think at different levels by default across SDK versions; pin it. */
function thinkingOptions(modelId: string) {
  return modelId.startsWith("gemini-3")
    ? { google: { thinkingConfig: { thinkingLevel: getCodeReviewThinkingLevel() } } }
    : undefined;
}

function debug(message: string) {
  if (isCodeReviewDebug()) console.error(`[code-review] ${message}`);
}

/** Each model gets this long before we move on to the next one in the list. */
const PER_MODEL_TIMEOUT_MS = 75_000;

function isTimeout(e: unknown): boolean {
  return e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
}

/**
 * Writes the review with the first model that answers in time. A slow, busy or unavailable
 * model never blocks the review: we move on to the next model in CODE_REVIEW_GEMINI_MODEL.
 */
async function writeWithGemini(prompt: string): Promise<{ written: CodeReviewWritten; model: string }> {
  const models = getCodeReviewGeminiModelIds();
  const deadline = Date.now() + WRITE_TIMEOUT_MS;
  debug(`models ${models.join(" → ")}, thinking ${getCodeReviewThinkingLevel()}, prompt ${prompt.length} chars`);

  let lastError: unknown = null;
  for (const modelId of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < 10_000) break;
      const t0 = Date.now();
      debug(`${modelId} attempt ${attempt + 1}: sending…`);
      try {
        const result = await generateText({
          model: getProvider()(modelId),
          providerOptions: thinkingOptions(modelId),
          abortSignal: AbortSignal.timeout(Math.min(PER_MODEL_TIMEOUT_MS, remaining)),
          system: CODE_REVIEW_SYSTEM_PROMPT,
          prompt,
          output: Output.object({ schema: codeReviewWrittenSchema, name: "code_review" }),
          temperature: 0.2,
          maxRetries: 0,
        });
        const u = result.usage;
        debug(
          `${modelId} attempt ${attempt + 1}: done in ${Math.round((Date.now() - t0) / 1000)}s · in ${u.inputTokens ?? "?"} tokens, ` +
            `out ${u.outputTokens ?? "?"} (thinking ${u.outputTokenDetails?.reasoningTokens ?? "?"})`
        );
        return { written: result.output, model: modelId };
      } catch (e) {
        lastError = e;
        debug(
          `${modelId} attempt ${attempt + 1}: failed after ${Math.round((Date.now() - t0) / 1000)}s · ` +
            `${e instanceof Error ? `${e.name}: ${e.message.slice(0, 300)}` : String(e)}`
        );
        // A quick "busy" is worth one short retry on the same model; anything else, try the next model.
        if (isBusyError(e) && !isTimeout(e) && attempt === 0 && Date.now() - t0 < 10_000) {
          await sleep(5_000);
          continue;
        }
        break;
      }
    }
  }

  if (lastError === null || isTimeout(lastError)) {
    throw new Error("Writing the summary took too long.");
  }
  throw lastError;
}

export async function reviewProject(input: ReviewInput, opts: ReviewOptions = {}): Promise<ReviewOutcome> {
  const started = Date.now();
  const window = opts.window ?? getEventWindow();
  const snap: RepoSnapshot = await fetchRepoSnapshot(input.repoUrl, { deadline: window.deadline });
  const githubMs = Date.now() - started;

  const repoKey = normaliseRepoUrl(snap.url);
  const hashes = fingerprint(snap.files);
  const chosen = selectReviewFiles(snap.files);

  const checks = [
    ...checkBuildWindow(snap, window),
    checkSteadyProgress(snap, window),
    checkOriginal(snap, repoKey, hashes, opts.peers ?? []),
    checkHiddenInstructions(snap, input),
    checkSecrets(snap.files),
  ];
  const hasCode = checkHasCode(snap.files);
  if (hasCode) checks.unshift(hasCode);

  const stats = buildStats(snap, window, {
    filesRead: chosen.length,
    filesConsidered: snap.files.filter((f) => f.content && !f.binary).length,
  });

  let written: CodeReviewWritten | null = null;
  let writtenError: string | undefined;
  let model = "";
  const writeStarted = Date.now();
  if (!opts.checksOnly) {
    const prompt = buildReviewPrompt(snap, chosen, input);
    try {
      if (opts.writeReview) {
        model = "local";
        written = await opts.writeReview(prompt);
      } else {
        const out = await writeWithGemini(prompt);
        written = out.written;
        model = out.model;
      }
    } catch (e) {
      // Busy errors bubble up so the queue can retry the whole job later.
      if (isBusyError(e)) throw e;
      writtenError = formatCodeReviewError(e);
    }
  }

  // Anything the model noticed counts as hidden instructions too.
  const suspicious = written?.suspiciousContent.filter((q) => q.trim()) ?? [];
  if (suspicious.length > 0) {
    const hidden = checks.find((c) => c.key === "hidden-instructions")!;
    hidden.level = "look";
    hidden.title = "Hidden instructions";
    hidden.details.push(...suspicious.slice(0, 3).map((q) => `Noticed during the review: "${q.slice(0, 160)}"`));
    if (hidden.summary.startsWith("Nothing")) hidden.summary = "Text that tries to influence the review";
  }

  return {
    repoKey,
    fingerprint: hashes,
    result: {
      stats,
      checks,
      written,
      ...(writtenError && { writtenError }),
      model,
      reviewedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      timings: { githubMs, writeMs: opts.checksOnly ? 0 : Date.now() - writeStarted },
    },
  };
}

export { isBusyError as isCodeReviewBusyError };
