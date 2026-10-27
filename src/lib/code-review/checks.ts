/**
 * Fair-play checks. Plain code, no model, so results are predictable and explainable.
 * Safe to import from Node scripts (no `server-only`).
 *
 * A check never removes a team. "look" only tells a judge to look closer.
 */

import { createHash } from "node:crypto";
import type { CodeReviewCheck } from "./schema";
import type { EventWindow } from "./config";
import type { RepoFile, RepoSnapshot } from "./github";

const LATE_WINDOW_MS = 30 * 60_000;
const LATE_SHARE = 0.6;

export const CODE_EXTENSIONS = [
  ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".go", ".java", ".kt", ".rs", ".rb",
  ".php", ".cs", ".swift", ".dart", ".c", ".cc", ".cpp", ".h", ".hpp", ".scala", ".vue",
  ".svelte", ".ipynb", ".sh",
];

export function isCodeFile(path: string): boolean {
  const lower = path.toLowerCase();
  return CODE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

const londonTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const londonDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
});

/** "9:20 am" on the event day, "9:20 am, 28 Oct" otherwise. */
export function formatLondon(d: Date, eventDay?: Date): string {
  const time = londonTime.format(d).replace(/\s/g, " ").toLowerCase();
  if (eventDay && londonDay.format(d) === londonDay.format(eventDay)) return time;
  return `${time}, ${londonDay.format(d)}`;
}

function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

function check(
  key: CodeReviewCheck["key"],
  title: string,
  level: CodeReviewCheck["level"],
  summary: string,
  details: string[] = []
): CodeReviewCheck {
  return { key, title, level, summary, details };
}

// ── Repo history (information) / on time ─────────────────────────────────────

/**
 * When the repo was created and worked on. Always information, never a warning: DevCamp final
 * projects are built over several weeks, so an older repo is normal.
 */
export function checkBuildWindow(snap: RepoSnapshot, w: EventWindow): CodeReviewCheck[] {
  const fmt = (d: Date) => formatLondon(d, w.start);
  const times = snap.commits.map((c) => c.authoredAt.getTime());
  const first = new Date(Math.min(...times));
  const last = new Date(Math.max(...times));
  const span =
    snap.commits.length === 1
      ? `1 commit, ${fmt(first)}`
      : `${plural(snap.commits.length, "commit")}, ${fmt(first)} to ${fmt(last)}`;

  const details = [`Repo created ${fmt(snap.createdAt)}. ${span}.`];
  if (snap.pushes.length > 0) {
    const firstPush = snap.pushes[0].at;
    const lastPush = snap.pushes[snap.pushes.length - 1].at;
    details.push(
      snap.pushes.length === 1
        ? `GitHub received one recent push, at ${fmt(firstPush)}.`
        : `GitHub received ${snap.pushes.length} recent pushes, ${fmt(firstPush)} to ${fmt(lastPush)}.`
    );
  }
  const earlyCommits = snap.commits.filter((c) => c.authoredAt < snap.createdAt);
  if (earlyCommits.length > 0) {
    details.push(
      `${plural(earlyCommits.length, "commit")} dated before the repo existed — they were written elsewhere first or their dates were changed.`
    );
  }

  const results: CodeReviewCheck[] = [
    check(
      "built-on-day",
      "Repo history",
      "info",
      `created ${fmt(snap.createdAt)}, last commit ${fmt(last)}`,
      details
    ),
  ];

  const latePushes = snap.pushes.filter((p) => p.at > w.deadline);
  if (latePushes.length > 0) {
    const lastLate = latePushes[latePushes.length - 1];
    results.push(
      check("on-time", "Pushed after the deadline", "look", `Code pushed after the deadline, last at ${fmt(lastLate.at)}`, [
        snap.lockedToDeadline
          ? "This review uses the last version pushed before the deadline."
          : "We couldn't find the version from before the deadline, so this review uses the latest code.",
      ])
    );
  }
  return results;
}

// ── Steady progress (not all uploaded at the last minute) ────────────────────

export function checkSteadyProgress(snap: RepoSnapshot, w: EventWindow): CodeReviewCheck {
  const withStats = snap.commits.filter((c) => typeof c.additions === "number");
  const total = withStats.reduce((sum, c) => sum + (c.additions ?? 0), 0);
  const fmt = (d: Date) => formatLondon(d, w.start);

  if (total > 200) {
    const windowStart = w.deadline.getTime() - LATE_WINDOW_MS;
    const late = withStats
      .filter((c) => c.authoredAt.getTime() >= windowStart && c.authoredAt.getTime() <= w.deadline.getTime() + 5 * 60_000)
      .reduce((sum, c) => sum + (c.additions ?? 0), 0);
    const share = late / total;
    if (share >= LATE_SHARE) {
      const biggest = withStats.reduce((a, b) => ((b.additions ?? 0) > (a.additions ?? 0) ? b : a));
      return check(
        "steady-progress",
        "Steady progress",
        "look",
        `${Math.round(share * 100)}% of the code arrived in the last 30 minutes`,
        [`Biggest commit: ${biggest.additions} lines at ${fmt(biggest.authoredAt)}. Work may have been done elsewhere first.`]
      );
    }
  }
  if (snap.commits.length <= 2 && total > 500) {
    return check(
      "steady-progress",
      "Steady progress",
      "look",
      `Only ${plural(snap.commits.length, "commit")} for ${total} lines`,
      ["Most of the code arrived in one go. Work may have been done elsewhere first."]
    );
  }
  return check("steady-progress", "Steady progress", "ok", `Work spread across ${plural(snap.commits.length, "commit")}`);
}

// ── Hidden instructions aimed at the reviewer ────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above|earlier|other)\s+(instructions|prompts?|rules)/,
  /disregard\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above|earlier)/,
  /(you\s+are|act\s+as|pretend\s+to\s+be)\s+(now\s+)?(an?\s+)?(ai\s+)?(judge|evaluator|grader|reviewer)/,
  /(give|award|assign|rate|score)\s+(this|our|the)?\s*(project|submission|team|repo)?\s*(a\s+)?(10\s*\/\s*10|5\s*\/\s*5|100\s*\/\s*100|full\s+marks|top\s+(score|marks)|the\s+highest|maximum|first\s+place)/,
  /(note|message|instructions?)\s+(to|for)\s+(the\s+)?(ai|llm|language\s+model|judges?|judging\s+(agent|system|assistant))\b/,
  /this\s+(project|submission)\s+(must|should)\s+(win|be\s+ranked|rank)/,
];
const INJECTION_RE = new RegExp(INJECTION_PATTERNS.map((p) => `(?:${p.source})`).join("|"), "gi");
const HTML_COMMENT_RE = /<!--([\s\S]*?)-->/g;
/** Zero-width spaces, direction overrides and tag characters that can hide text. Emoji joiners (U+200C/D) are fine. */
const INVISIBLE_RE = /[\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\u{E0000}-\u{E007F}]/gu;

function squash(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Short quotes of anything that looks like an attempt to instruct the reviewer. */
export function findHiddenInstructions(text: string): string[] {
  const spans: [number, number][] = [];
  for (const m of text.matchAll(INJECTION_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const lastSpan = spans[spans.length - 1];
    if (lastSpan && start - lastSpan[1] < 80) lastSpan[1] = end;
    else spans.push([start, end]);
  }
  return spans.map(([s, e]) => squash(text.slice(Math.max(0, s - 40), Math.min(text.length, e + 40))));
}

/**
 * Text that tries to sway the result. Agent prompts, guardrail tests and docs legitimately say
 * "ignore previous instructions" or "you are a reviewer", so outside the README, form and
 * commits we only flag text like this.
 */
const SWAY_RE =
  /(give|award|assign|rate|score|rank)\s+(this|our)\s+(project|submission|team|repo|entry)|(10\s*\/\s*10|full\s+marks|top\s+marks|first\s+place|the\s+highest\s+score)[^\n]{0,60}\b(judges?|reviewers?|evaluators?|graders?|this\s+(project|submission))|(judges?|reviewers?|evaluators?|graders?)\b[^\n]{0,60}(10\s*\/\s*10|full\s+marks|top\s+marks|first\s+place|the\s+highest\s+score)|this\s+(project|submission)\s+(must|should)\s+(win|be\s+ranked)/i;

/** Where participants talk to judges: anything instruction-like here is worth a look. */
function isPitchText(where: string): boolean {
  return /(^|\/)readme(\.\w+)?$/i.test(where) || where === "commit messages" || where === "submission form";
}

export function checkHiddenInstructions(
  snap: RepoSnapshot,
  form: { title: string; description: string }
): CodeReviewCheck {
  const details: string[] = [];
  const sources: { where: string; text: string }[] = [
    ...snap.files.filter((f) => f.content && !f.binary).map((f) => ({ where: f.path, text: f.content })),
    { where: "commit messages", text: snap.commits.map((c) => c.message).join("\n") },
    { where: "submission form", text: `${form.title}\n${form.description}` },
  ];

  for (const { where, text } of sources) {
    let body = text;
    if (/\.(md|mdx|html?)$/i.test(where)) {
      for (const m of text.matchAll(HTML_COMMENT_RE)) {
        const comment = m[1];
        const aimedAtReviewer =
          /\b(ai|llm|judges?|reviewers?|graders?|evaluators?)\b/i.test(comment) &&
          /\b(score|marks|rank|win|ignore|disregard|10\s*\/\s*10|highest)\b/i.test(comment);
        if (findHiddenInstructions(comment).length > 0 || SWAY_RE.test(comment) || aimedAtReviewer) {
          details.push(`Hidden comment in ${where}: "${squash(comment).slice(0, 160)}"`);
        }
      }
      body = text.replace(HTML_COMMENT_RE, " ");
    }
    const quotes = isPitchText(where)
      ? findHiddenInstructions(body)
      : findHiddenInstructions(body).filter((q) => SWAY_RE.test(q));
    const sway = SWAY_RE.exec(body);
    if (quotes.length === 0 && sway) {
      quotes.push(squash(body.slice(Math.max(0, sway.index - 40), sway.index + sway[0].length + 40)));
    }
    for (const quote of quotes.slice(0, 3)) details.push(`In ${where}: "${quote}"`);

    const invisible = TEST_PATH_RE.test(where) ? 0 : (body.match(INVISIBLE_RE)?.length ?? 0);
    if (invisible >= 3) details.push(`${where} contains ${invisible} invisible characters. Text may be hidden.`);
  }

  if (details.length === 0) {
    return check("hidden-instructions", "No hidden instructions", "ok", "Nothing aimed at reviewers in the README, code, commits or form");
  }
  return check(
    "hidden-instructions",
    "Hidden instructions",
    "look",
    `${plural(details.length, "piece")} of text aimed at reviewers`,
    details.slice(0, 8)
  );
}

// ── Keys and passwords in the code ───────────────────────────────────────────

const SECRET_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "Google API key", re: /AIza[0-9A-Za-z_-]{35}/ },
  { label: "OpenAI key", re: /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/ },
  { label: "Anthropic key", re: /sk-ant-[A-Za-z0-9_-]{32,}/ },
  { label: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { label: "AWS key", re: /AKIA[0-9A-Z]{16}/ },
  { label: "Slack token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { label: "Stripe key", re: /sk_live_[0-9A-Za-z]{24,}/ },
  { label: "Private key", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

/** Fake keys in tests and docs ("AKIA…EXAMPLE", "your-api-key") aren't real leaks. */
const TEST_PATH_RE = /(^|\/)(tests?|__tests__|spec|specs|fixtures?|mocks?|testdata)\/|(^|\/)test_[^/]*$|[._-](test|spec)\.[a-z]+$/i;
const PLACEHOLDER_RE = /example|dummy|fake|placeholder|your[_-]?(api[_-]?)?key|redacted|<[^>]*key[^>]*>/i;

function lineAt(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  const end = text.indexOf("\n", index);
  return text.slice(start, end === -1 ? text.length : end);
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

export function checkSecrets(files: RepoFile[]): CodeReviewCheck {
  const details: string[] = [];
  for (const f of files) {
    const name = f.path.split("/").pop() ?? f.path;
    if (/^\.env(\.(local|production|development|dev|prod))?$/i.test(name)) {
      details.push(`A settings file (${f.path}) is committed. It usually holds keys.`);
    }
    if (!f.content || TEST_PATH_RE.test(f.path)) continue;
    for (const { label, re } of SECRET_PATTERNS) {
      const m = re.exec(f.content);
      if (m && !PLACEHOLDER_RE.test(lineAt(f.content, m.index))) {
        details.push(`${label} written in ${f.path}:${lineOf(f.content, m.index)}.`);
      }
    }
  }
  if (details.length === 0) {
    return check("secrets", "No keys in the code", "ok", "No API keys or passwords found in the files");
  }
  return check("secrets", "Keys in the code", "look", `${plural(details.length, "key or settings file")} found`, [
    ...details.slice(0, 8),
    "The team should revoke these keys after the event.",
  ]);
}

// ── Has code ─────────────────────────────────────────────────────────────────

export function checkHasCode(files: RepoFile[]): CodeReviewCheck | null {
  const code = files.filter((f) => isCodeFile(f.path) && f.content.trim().length > 0);
  if (code.length === 0) {
    return check("has-code", "Has code", "look", "No code files found, only docs or config");
  }
  return null;
}

// ── Copied code: fingerprints ────────────────────────────────────────────────

const FINGERPRINT_CAP = 3000;

/**
 * Hashes of every run of three meaningful code lines. Keeps the smallest hashes so two
 * repos are always sampled the same way. Two projects sharing many hashes share code.
 */
export function fingerprint(files: RepoFile[]): string[] {
  const hashes = new Set<string>();
  for (const f of files) {
    if (!isCodeFile(f.path) || !f.content) continue;
    const lines = f.content
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim().toLowerCase())
      .filter((l) => l.length >= 12 && !/^(import |from |#|\/\/|\/\*|\*|"""|''')/.test(l));
    for (let i = 0; i + 3 <= lines.length; i++) {
      hashes.add(createHash("sha1").update(lines.slice(i, i + 3).join("\n")).digest("hex").slice(0, 12));
    }
  }
  return [...hashes].sort().slice(0, FINGERPRINT_CAP);
}

/** Share of the smaller project's code that also appears in the other. 0–1. */
export function overlap(a: string[], b: string[]): number {
  if (a.length < 5 || b.length < 5) return 0;
  const small = a.length <= b.length ? a : b;
  const large = new Set(a.length <= b.length ? b : a);
  let shared = 0;
  for (const h of small) if (large.has(h)) shared++;
  return shared / small.length;
}

export interface FingerprintPeer {
  projectId: string;
  title: string;
  userName: string;
  repoKey: string;
  hashes: string[];
}

const COPY_THRESHOLD = 0.5;

export function checkOriginal(
  snap: RepoSnapshot,
  repoKey: string,
  hashes: string[],
  peers: FingerprintPeer[]
): CodeReviewCheck {
  const details: string[] = [];
  let level: CodeReviewCheck["level"] = "ok";
  let summary = "No close match with other projects";

  if (snap.isFork) {
    level = "look";
    summary = `Fork of ${snap.forkParent ?? "another repo"}`;
    details.push(`This repo is a fork of ${snap.forkParent ?? "another project"}. Check what the team added.`);
  }

  const sameRepo = peers.filter((p) => p.repoKey === repoKey);
  for (const p of sameRepo) {
    details.push(`${p.userName || "Another person"} submitted the same repo ("${p.title}"), probably a teammate.`);
  }

  const matches = peers
    .filter((p) => p.repoKey !== repoKey)
    .map((p) => ({ p, share: overlap(hashes, p.hashes) }))
    .filter((m) => m.share >= 0.15)
    .sort((x, y) => y.share - x.share);

  for (const { p, share } of matches.slice(0, 3)) {
    const pct = Math.round(share * 100);
    details.push(`${pct}% of the code matches "${p.title}" (${p.userName || "another person"}).`);
    if (share >= COPY_THRESHOLD) {
      level = "look";
      summary = `${pct}% matches "${p.title}"`;
    }
  }

  if (level === "ok") {
    const peerCount = peers.filter((p) => p.repoKey !== repoKey).length;
    if (matches.length === 0) {
      details.push(
        peerCount === 0
          ? "No other projects reviewed yet to compare with."
          : `Compared with ${plural(peerCount, "other project")}. No shared code found.`
      );
    } else {
      summary = `Highest match ${Math.round(matches[0].share * 100)}%, likely shared setup code`;
    }
  }
  return check("original", level === "ok" ? "Original code" : "Possible copied code", level, summary, details);
}
