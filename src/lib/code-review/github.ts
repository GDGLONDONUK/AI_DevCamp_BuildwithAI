/**
 * Reads a public GitHub repo for review: metadata, commits, push times and files.
 * Safe to import from Node scripts (no `server-only`).
 *
 * We never clone or run participants' code. The repo is downloaded once as a .tar.gz
 * and read in memory, so a review costs a handful of GitHub requests, not one per file.
 */

import { gunzipSync } from "node:zlib";
import { CODE_REVIEW_LIMITS, SKIP_DIRS, SKIP_FILES, getGithubToken } from "./config";

const API = "https://api.github.com";

export class GitHubReadError extends Error {
  /** True when trying again later may work (rate limit, GitHub outage). */
  retryable: boolean;
  constructor(message: string, retryable = false) {
    super(message);
    this.name = "GitHubReadError";
    this.retryable = retryable;
  }
}

export interface RepoCommit {
  sha: string;
  message: string;
  authoredAt: Date;
  author: string;
  additions?: number;
}

export interface RepoFile {
  path: string;
  /** Text content; empty for binaries and very large files. */
  content: string;
  bytes: number;
  binary: boolean;
  /** Set when only the start of the file was sent for the written review. */
  truncated?: boolean;
}

export interface RepoPush {
  at: Date;
  head: string;
  branch: string;
}

export interface RepoSnapshot {
  owner: string;
  name: string;
  url: string;
  defaultBranch: string;
  createdAt: Date;
  isFork: boolean;
  forkParent?: string;
  languages: Record<string, number>;
  commits: RepoCommit[];
  pushes: RepoPush[];
  /** Commit the files were read from. */
  sha: string;
  lockedToDeadline: boolean;
  files: RepoFile[];
}

const URL_RE =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?(?:(?:tree|blob)\/[^?#]*)?(?:[?#].*)?$/;

/** "https://github.com/owner/repo" (also /tree/main, .git) → { owner, name } */
export function parseRepoUrl(url: string): { owner: string; name: string } {
  const match = URL_RE.exec(url.trim());
  if (!match) {
    throw new GitHubReadError("This isn't a GitHub repo link. It should look like https://github.com/owner/repo.");
  }
  return { owner: match[1], name: match[2] };
}

/** Lower-case owner/name, used to spot teammates who submitted the same repo. */
export function normaliseRepoUrl(url: string): string {
  try {
    const { owner, name } = parseRepoUrl(url);
    return `${owner}/${name}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function headers(accept = "application/vnd.github+json"): Record<string, string> {
  const token = getGithubToken();
  return {
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "aidevcamp-code-review",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function gh(path: string, init?: { accept?: string }): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { headers: headers(init?.accept), cache: "no-store" });
  } catch {
    throw new GitHubReadError("We couldn't reach GitHub.", true);
  }
  if (res.ok) return res;
  if (res.status === 404) {
    throw new GitHubReadError("Repo not found. It may be private or the link may be wrong.");
  }
  if (res.status === 403 || res.status === 429) {
    if (res.headers.get("x-ratelimit-remaining") === "0" || res.status === 429) {
      throw new GitHubReadError("GitHub's request limit was reached. The review will try again shortly.", true);
    }
    throw new GitHubReadError("GitHub refused access to this repo. Check it's public.");
  }
  if (res.status === 409) {
    throw new GitHubReadError("This repo is empty.");
  }
  throw new GitHubReadError(`GitHub returned an error (${res.status}).`, res.status >= 500);
}

async function ghJson<T>(path: string): Promise<T> {
  return (await gh(path)).json() as Promise<T>;
}

/** Run `fn` over items with at most `limit` in flight. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

// ── GitHub API calls ─────────────────────────────────────────────────────────

interface GhRepo {
  default_branch?: string;
  created_at: string;
  fork?: boolean;
  private?: boolean;
  size?: number;
  parent?: { full_name?: string };
}

interface GhCommit {
  sha: string;
  commit: { message?: string; author?: { date?: string; name?: string; email?: string } };
  author?: { login?: string } | null;
}

interface GhEvent {
  type?: string;
  created_at: string;
  payload?: { ref?: string; head?: string };
}

async function listCommits(base: string, branch: string): Promise<RepoCommit[]> {
  const commits: RepoCommit[] = [];
  for (let page = 1; commits.length < CODE_REVIEW_LIMITS.maxCommits; page++) {
    const batch = await ghJson<GhCommit[]>(
      `${base}/commits?sha=${encodeURIComponent(branch)}&per_page=100&page=${page}`
    );
    for (const item of batch) {
      commits.push({
        sha: item.sha,
        message: (item.commit.message ?? "").split("\n")[0].slice(0, 200),
        authoredAt: new Date(item.commit.author?.date ?? 0),
        author: item.author?.login || item.commit.author?.email || item.commit.author?.name || "unknown",
      });
    }
    if (batch.length < 100) break;
  }
  return commits;
}

async function addCommitStats(base: string, commits: RepoCommit[]): Promise<void> {
  const subset = commits.slice(0, CODE_REVIEW_LIMITS.maxCommitStats);
  await mapLimit(subset, 6, async (c) => {
    try {
      const detail = await ghJson<{ stats?: { additions?: number } }>(`${base}/commits/${c.sha}`);
      c.additions = detail.stats?.additions;
    } catch (e) {
      if (e instanceof GitHubReadError && e.retryable) throw e;
    }
  });
}

/** When GitHub actually received pushes. Unlike commit dates, these can't be set on a laptop. */
async function listPushes(base: string): Promise<RepoPush[]> {
  try {
    const events = await ghJson<GhEvent[]>(`${base}/events?per_page=100`);
    return events
      .filter((e) => e.type === "PushEvent")
      .map((e) => ({
        at: new Date(e.created_at),
        head: e.payload?.head ?? "",
        branch: (e.payload?.ref ?? "").replace(/^refs\/heads\//, ""),
      }))
      .sort((a, b) => a.at.getTime() - b.at.getTime());
  } catch (e) {
    if (e instanceof GitHubReadError && e.retryable) throw e;
    return [];
  }
}

// ── Download + unpack ────────────────────────────────────────────────────────

async function downloadTarball(base: string, sha: string): Promise<Buffer> {
  const res = await gh(`${base}/tarball/${sha}`);
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > CODE_REVIEW_LIMITS.maxTarballBytes) {
    throw new GitHubReadError("This repo is too large to review automatically. Open it on GitHub instead.");
  }
  const reader = res.body?.getReader();
  if (!reader) throw new GitHubReadError("GitHub sent an empty download.", true);
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > CODE_REVIEW_LIMITS.maxTarballBytes) {
      await reader.cancel();
      throw new GitHubReadError("This repo is too large to review automatically. Open it on GitHub instead.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export function isSkippedPath(path: string): boolean {
  const lower = path.toLowerCase();
  const name = lower.split("/").pop() ?? lower;
  if (SKIP_FILES.includes(name)) return true;
  return SKIP_DIRS.some((dir) => lower.startsWith(dir) || lower.includes(`/${dir}`));
}

function octal(buf: Buffer, start: number, length: number): number {
  const text = buf.toString("latin1", start, start + length).replace(/\0.*$/, "").trim();
  return text ? parseInt(text, 8) : 0;
}

function cString(buf: Buffer, start: number, length: number): string {
  const end = buf.indexOf(0, start);
  return buf.toString("utf8", start, end === -1 || end > start + length ? start + length : end);
}

/** Minimal tar reader (ustar + pax long names), enough for GitHub's tarballs. */
export function readTar(tar: Buffer): RepoFile[] {
  const files: RepoFile[] = [];
  let offset = 0;
  let paxPath: string | null = null;

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;

    const size = octal(header, 124, 12);
    const type = String.fromCharCode(header[156] || 48);
    const prefix = cString(header, 345, 155);
    const name = cString(header, 0, 100);
    const bodyStart = offset + 512;
    const body = tar.subarray(bodyStart, bodyStart + size);
    offset = bodyStart + Math.ceil(size / 512) * 512;

    if (type === "x") {
      const match = /\d+ path=([^\n]*)\n/.exec(body.toString("utf8"));
      paxPath = match ? match[1] : null;
      continue;
    }
    if (type === "g") continue;

    const fullPath = paxPath ?? (prefix ? `${prefix}/${name}` : name);
    paxPath = null;
    if (type !== "0" && type !== "\0") continue;

    // GitHub wraps everything in "owner-repo-sha/".
    const path = fullPath.split("/").slice(1).join("/");
    if (!path || isSkippedPath(path)) continue;

    const binary = body.subarray(0, 8000).includes(0);
    const tooBig = size > CODE_REVIEW_LIMITS.maxFileBytes;
    files.push({
      path,
      bytes: size,
      binary,
      content: binary || tooBig ? "" : body.toString("utf8"),
    });
  }
  return files;
}

/** The commit to judge: after the deadline, the last version pushed before it. */
function pickSha(headSha: string, pushes: RepoPush[], branch: string, deadline: Date) {
  const late = pushes.some((p) => p.at > deadline && (!p.branch || p.branch === branch));
  if (!late) return { sha: headSha, locked: false };
  const before = pushes.filter((p) => p.at <= deadline && p.head && (!p.branch || p.branch === branch));
  const last = before[before.length - 1];
  return last ? { sha: last.head, locked: true } : { sha: headSha, locked: false };
}

// ── Snapshot ─────────────────────────────────────────────────────────────────

export async function fetchRepoSnapshot(repoUrl: string, opts: { deadline: Date }): Promise<RepoSnapshot> {
  const { owner, name } = parseRepoUrl(repoUrl);
  const base = `/repos/${owner}/${name}`;
  const meta = await ghJson<GhRepo>(base);
  if (meta.private) throw new GitHubReadError("This repo is private. Ask the team to make it public.");
  const branch = meta.default_branch || "main";

  const [commits, pushes, languages] = await Promise.all([
    listCommits(base, branch),
    listPushes(base),
    ghJson<Record<string, number>>(`${base}/languages`).catch(() => ({})),
  ]);
  if (commits.length === 0) throw new GitHubReadError("This repo has no commits yet.");

  const { sha, locked } = pickSha(commits[0].sha, pushes, branch, opts.deadline);
  const [tarball] = await Promise.all([downloadTarball(base, sha), addCommitStats(base, commits)]);

  let files: RepoFile[];
  try {
    files = readTar(gunzipSync(tarball));
  } catch {
    throw new GitHubReadError("We couldn't open the repo download.", true);
  }

  return {
    owner,
    name,
    url: `https://github.com/${owner}/${name}`,
    defaultBranch: branch,
    createdAt: new Date(meta.created_at),
    isFork: Boolean(meta.fork),
    forkParent: meta.parent?.full_name,
    languages,
    commits,
    pushes,
    sha,
    lockedToDeadline: locked,
    files,
  };
}
