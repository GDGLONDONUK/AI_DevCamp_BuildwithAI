/**
 * POST /api/dev/code-review — LOCAL PREVIEW ONLY (`npm run dev`). Returns 404 in production.
 *
 * Runs a full code review on a public GitHub repo and returns it directly, without Firebase,
 * so the review panel can be tried on a laptop. Nothing is saved; copied-code checks compare
 * against repos reviewed earlier in the same dev session.
 *
 * POST body:
 *   { repoUrl, title?, description?, techStack?[] }
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, err } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { GitHubReadError, normaliseRepoUrl } from "@/lib/code-review/github";
import type { FingerprintPeer } from "@/lib/code-review/checks";
import { reviewProject } from "@/lib/code-review/reviewProject";
import type { ProjectCodeReview } from "@/lib/code-review/schema";

const bodySchema = z
  .object({
    repoUrl: z.string().trim().min(1).max(300),
    title: z.string().trim().max(200).optional().default(""),
    description: z.string().trim().max(5000).optional().default(""),
    techStack: z.array(z.string().max(60)).max(30).optional().default([]),
  })
  .strict();

/** Fingerprints of repos reviewed in this dev session, to try the copied-code check. */
const sessionPeers = new Map<string, FingerprintPeer>();

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") return err("Not found", 404);

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const { repoUrl, title, description, techStack } = parsed.data;

  try {
    const outcome = await reviewProject(
      { repoUrl, title: title || "(preview)", description, techStack },
      { peers: [...sessionPeers.values()].filter((p) => p.repoKey !== normaliseRepoUrl(repoUrl)) }
    );
    sessionPeers.set(outcome.repoKey, {
      projectId: outcome.repoKey,
      title: title || outcome.result.stats.repo,
      userName: "Preview",
      repoKey: outcome.repoKey,
      hashes: outcome.fingerprint,
    });

    const review: ProjectCodeReview = {
      projectId: outcome.repoKey,
      repoUrl,
      status: "ready",
      result: outcome.result,
      attempts: 1,
      finishedAt: outcome.result.reviewedAt,
    };
    return ok(review);
  } catch (e) {
    const message =
      e instanceof GitHubReadError ? e.message : e instanceof Error ? e.message.slice(0, 300) : "The review failed.";
    const review: ProjectCodeReview = { projectId: repoUrl, repoUrl, status: "failed", result: null, error: message, attempts: 1 };
    return ok(review);
  }
}
