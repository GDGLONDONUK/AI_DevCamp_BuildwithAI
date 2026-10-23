/**
 * Try the hackathon code review on any public GitHub repo, from the terminal.
 * Doesn't touch Firebase — nothing is saved.
 *
 * Usage:
 *   npm run code-review:try -- https://github.com/owner/repo
 *   npm run code-review:try -- https://github.com/owner/repo --checks-only
 *   npm run code-review:try -- https://github.com/owner/repo --start=2026-10-23T08:00:00Z --deadline=2026-10-23T15:00:00Z
 *   npm run code-review:try -- https://github.com/owner/repo --json > review.json
 *   npm run code-review:try -- --models      (lists the Gemini models your key can use, fastest first)
 *
 * Needs in .env.local: CODE_REVIEW_GEMINI_API_KEY (unless --checks-only) and GITHUB_TOKEN (recommended).
 */

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  getCodeReviewGeminiApiKey,
  getCodeReviewGeminiModelIds,
  getEventWindow,
  getGithubToken,
} from "../src/lib/code-review/config";
import { reviewProject } from "../src/lib/code-review/reviewProject";
import type { CodeReviewResult } from "../src/lib/code-review/schema";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

function printReport(r: CodeReviewResult) {
  const s = r.stats;
  const out: string[] = [];
  out.push("", `■ ${s.repo}  (commit ${s.commitSha}${s.lockedToDeadline ? ", locked to the deadline" : ""})`);
  out.push(
    `  ${s.codeFiles} code files · ${s.linesOfCode} lines · ${s.commits} commits · ${s.contributors} contributors · ` +
      s.languages.map((l) => `${l.name} ${l.percent}%`).join(", ")
  );
  const t = r.timings;
  out.push(
    `  Read ${s.filesRead} of ${s.filesConsidered} text files in ${Math.round(r.durationMs / 1000)}s` +
      (t ? ` (GitHub ${Math.round(t.githubMs / 1000)}s, writing ${Math.round(t.writeMs / 1000)}s)` : "")
  );

  out.push("", "CHECKS");
  for (const c of r.checks) {
    out.push(`  ${c.level === "ok" ? "✓" : "!"} ${c.title}: ${c.summary}`);
    for (const d of c.details) out.push(`      - ${d}`);
  }

  out.push("", "WHEN THE CODE WAS WRITTEN (lines added per hour)");
  const max = Math.max(1, ...s.hours.map((h) => h.lines));
  if (s.hoursDay) out.push(`  ${s.hoursDay}`);
  for (const h of s.hours) {
    out.push(`  ${h.label.padStart(4)} ${"█".repeat(Math.round((h.lines / max) * 30))} ${h.lines || ""}`);
  }

  const w = r.written;
  if (!w) {
    out.push("", r.writtenError ? `WRITTEN REVIEW FAILED: ${r.writtenError}` : "(checks only, no written review)");
    console.log(out.join("\n"));
    return;
  }
  out.push("", `Written by ${r.model}`, "", "IN SHORT", `  ${w.summary}`, `  For: ${w.whoItsFor}`);
  out.push("", `AGENT DESIGN: ${w.agent.kind} · ${w.agent.framework}${w.agent.model ? ` · ${w.agent.model}` : ""}`);
  out.push(`  ${w.agent.explanation}`);
  if (w.agent.rootAgent) out.push(`  ${w.agent.rootAgent} (${w.agent.rootType})`);
  for (const a of w.agent.agents) {
    out.push(`    → ${a.name} [${a.type}] ${a.does}${a.tools.length ? ` · tools: ${a.tools.join(", ")}` : ""}  ${a.where}`);
  }
  for (const f of w.agent.features) out.push(`  ${f.used ? "✓" : "–"} ${f.name}${f.where ? `  ${f.where}` : ""}`);
  out.push("", "COULD SOMEONE ELSE RUN IT?");
  for (const x of w.runnable) out.push(`  ${x.ok ? "✓" : "✕"} ${x.text}`);
  out.push("", "CODE QUALITY");
  for (const x of w.quality.strengths) out.push(`  + ${x.text}  ${x.where}`);
  for (const x of w.quality.issues) out.push(`  - ${x.text}  ${x.where}`);
  out.push("", "SECURITY");
  for (const x of w.security) out.push(`  ${x.level === "good" ? "✓" : "!"} ${x.text}  ${x.where}`);
  out.push("", "RESPONSIBLE AI");
  for (const x of w.responsibleAi) out.push(`  ${x.level === "good" ? "✓" : "!"} ${x.text}  ${x.where}`);
  out.push("", "FOR THE PITCH");
  for (const q of w.pitchQuestions.product) out.push(`  • ${q}`);
  for (const q of w.pitchQuestions.business) out.push(`  £ ${q}`);
  console.log(out.join("\n"));
}

/** Lists the Gemini models this key can use and times a tiny request on each, fastest first. */
async function listModels() {
  const key = getCodeReviewGeminiApiKey();
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
    headers: { "x-goog-api-key": key },
  });
  if (!res.ok) throw new Error(`Couldn't list models (${res.status}). Check CODE_REVIEW_GEMINI_API_KEY.`);
  const data = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  const ids = (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((id) => /gemini/.test(id) && /(flash|pro)/.test(id))
    .filter((id) => !/(image|tts|audio|live|embedding|vision|robotics|computer-use|native)/.test(id));

  console.log(`Your key can use ${ids.length} text models. Timing a tiny request on each (up to 45s)…\n`);
  const google = createGoogleGenerativeAI({ apiKey: key });
  const results = await Promise.all(
    ids.map(async (id) => {
      const t0 = Date.now();
      try {
        await generateText({
          model: google(id),
          prompt: "Reply with the word OK.",
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(45_000),
        });
        return { id, ms: Date.now() - t0, ok: true, note: "" };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { id, ms: Date.now() - t0, ok: false, note: /abort|timeout/i.test(msg) ? "no answer in 45s" : msg.slice(0, 90) };
      }
    })
  );
  results.sort((a, b) => Number(b.ok) - Number(a.ok) || a.ms - b.ms);
  for (const r of results) {
    console.log(`  ${(r.ms / 1000).toFixed(1).padStart(5)}s  ${r.ok ? "✓" : "✕"} ${r.id}${r.note ? `  ${r.note}` : ""}`);
  }
  const fast = results.filter((r) => r.ok && r.ms < 15_000 && /flash/.test(r.id)).slice(0, 2);
  if (fast.length > 0) {
    console.log(`\nSuggested line for .env.local:\n  CODE_REVIEW_GEMINI_MODEL=${fast.map((r) => r.id).join(",")}`);
  }
}

async function main() {
  if (process.argv.includes("--models") || process.argv.includes("--ping")) return listModels();
  const url = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!url) {
    console.error("Usage: npm run code-review:try -- https://github.com/owner/repo [--checks-only] [--json]");
    process.exit(1);
  }

  const base = getEventWindow();
  const window = {
    start: arg("start") ? new Date(arg("start")!) : base.start,
    deadline: arg("deadline") ? new Date(arg("deadline")!) : base.deadline,
  };
  const checksOnly = process.argv.includes("--checks-only");
  const json = process.argv.includes("--json");

  if (!json) {
    console.error(`Reviewing ${url}`);
    console.error(`Event window: ${window.start.toISOString()} → ${window.deadline.toISOString()}`);
    if (!getGithubToken()) console.error("No GITHUB_TOKEN: GitHub allows only 60 requests an hour without one.");
    if (!checksOnly) console.error(`Models (in order): ${getCodeReviewGeminiModelIds().join(" → ")}`);
    if (Date.now() < window.start.getTime()) {
      console.error("Note: before the event, every repo is flagged 'before the event'. Use --start/--deadline to pretend.");
    }
  }

  const { result } = await reviewProject(
    { repoUrl: url, title: "(terminal test)", description: "", techStack: [] },
    { window, checksOnly }
  );
  if (json) console.log(JSON.stringify(result, null, 2));
  else printReport(result);
}

main().catch((e) => {
  console.error(`\nReview failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
