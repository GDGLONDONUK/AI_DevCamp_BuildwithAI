/** Soft rate limit for ballot POSTs (per serverless isolate; still stops rapid spam). */

const WINDOW_MS = 60_000;
const MAX_CASTS = 12;

const casts = new Map<string, number[]>();

function prune(uid: string): number[] {
  const now = Date.now();
  return (casts.get(uid) || []).filter((t) => now - t < WINDOW_MS);
}

export function isHackathonVoteRateLimited(uid: string): boolean {
  return prune(uid).length >= MAX_CASTS;
}

export function recordHackathonVoteCast(uid: string): void {
  const arr = prune(uid);
  arr.push(Date.now());
  casts.set(uid, arr);
}
