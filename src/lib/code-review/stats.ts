/**
 * Repo facts for the review panel: languages, size, structure, when code was written.
 * Safe to import from Node scripts (no `server-only`).
 */

import type { CodeReviewStats } from "./schema";
import type { EventWindow } from "./config";
import type { RepoSnapshot } from "./github";
import { isCodeFile } from "./checks";

const londonHour = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric", hour12: true });

function hourLabel(d: Date): string {
  return londonHour.format(d).replace(/\s/g, "").toLowerCase();
}

/** Top-level folders and files, with up to 4 children each. */
function buildTree(paths: string[]): string[] {
  const top = new Map<string, Set<string>>();
  for (const p of paths) {
    const [head, child] = p.split("/");
    if (!top.has(head)) top.set(head, new Set());
    if (child !== undefined && p.includes("/")) top.get(head)!.add(child);
  }
  const lines: string[] = [];
  const entries = [...top.entries()].sort(([a, ac], [b, bc]) => Number(bc.size > 0) - Number(ac.size > 0) || a.localeCompare(b));
  for (const [head, children] of entries.slice(0, 25)) {
    if (children.size === 0) {
      lines.push(head);
      continue;
    }
    lines.push(`${head}/`);
    const kids = [...children].sort();
    for (const kid of kids.slice(0, 4)) lines.push(`  ${kid}`);
    if (kids.length > 4) lines.push(`  … ${kids.length - 4} more`);
  }
  if (entries.length > 25) lines.push(`… ${entries.length - 25} more`);
  return lines;
}

const HOUR_MS = 3_600_000;
const londonDayLabel = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" });

function bucketCommits(snap: RepoSnapshot, startHour: number, endHour: number): CodeReviewStats["hours"] {
  const buckets: CodeReviewStats["hours"] = [];
  for (let t = startHour; t < endHour; t += HOUR_MS) {
    buckets.push({ label: hourLabel(new Date(t)), lines: 0, commits: 0 });
  }
  for (const c of snap.commits) {
    const i = Math.floor((c.authoredAt.getTime() - startHour) / HOUR_MS);
    if (i < 0 || i >= buckets.length) continue;
    buckets[i].commits += 1;
    buckets[i].lines += c.additions ?? 0;
  }
  return buckets;
}

/**
 * Lines added per hour. Normally the event day (an hour before the start to the deadline).
 * If no code was written then, shows the hours around the latest commits instead, labelled
 * with their day, so judges see when the work really happened rather than an empty chart.
 */
function buildHours(snap: RepoSnapshot, w: EventWindow): Pick<CodeReviewStats, "hours" | "hoursDay"> {
  const startHour = Math.floor(w.start.getTime() / HOUR_MS) * HOUR_MS - HOUR_MS;
  const endHour = Math.ceil(w.deadline.getTime() / HOUR_MS) * HOUR_MS;
  const eventDay = bucketCommits(snap, startHour, endHour);
  if (eventDay.some((h) => h.commits > 0) || snap.commits.length === 0) {
    return { hours: eventDay, hoursDay: `${londonDayLabel.format(w.start)}, the event day` };
  }

  // Up to 12 hours ending with the latest commit.
  const latest = Math.max(...snap.commits.map((c) => c.authoredAt.getTime()));
  const recent = snap.commits.map((c) => c.authoredAt.getTime()).filter((t) => t > latest - 12 * HOUR_MS);
  const lastHour = Math.floor(latest / HOUR_MS) * HOUR_MS + HOUR_MS;
  const firstHour = Math.min(Math.floor(Math.min(...recent) / HOUR_MS) * HOUR_MS, lastHour - 8 * HOUR_MS);
  return {
    hours: bucketCommits(snap, firstHour, lastHour),
    hoursDay: `${londonDayLabel.format(new Date(latest))}, not the event day`,
  };
}

export function buildStats(
  snap: RepoSnapshot,
  w: EventWindow,
  read: { filesRead: number; filesConsidered: number }
): CodeReviewStats {
  const totalBytes = Object.values(snap.languages).reduce((a, b) => a + b, 0);
  const languages = Object.entries(snap.languages)
    .map(([name, bytes]) => ({ name, percent: totalBytes ? Math.round((bytes / totalBytes) * 100) : 0 }))
    .filter((l) => l.percent > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5);

  const code = snap.files.filter((f) => isCodeFile(f.path));
  const linesOfCode = code.reduce(
    (sum, f) => sum + f.content.split("\n").filter((l) => l.trim().length > 0).length,
    0
  );

  return {
    repo: `${snap.owner}/${snap.name}`,
    url: snap.url,
    defaultBranch: snap.defaultBranch,
    commitSha: snap.sha.slice(0, 7),
    lockedToDeadline: snap.lockedToDeadline,
    createdAt: snap.createdAt.toISOString(),
    languages,
    files: snap.files.length,
    codeFiles: code.length,
    linesOfCode,
    commits: snap.commits.length,
    contributors: new Set(snap.commits.map((c) => c.author)).size,
    tree: buildTree(snap.files.map((f) => f.path)),
    ...buildHours(snap, w),
    filesRead: read.filesRead,
    filesConsidered: read.filesConsidered,
  };
}
