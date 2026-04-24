const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 24;

const failTimestamps = new Map<string, number[]>();

function prune(uid: string): number[] {
  const now = Date.now();
  return (failTimestamps.get(uid) || []).filter((t) => now - t < WINDOW_MS);
}

export function isSelfCheckInRateLimited(uid: string): boolean {
  return prune(uid).length >= MAX_ATTEMPTS;
}

export function recordSelfCheckInFailure(uid: string): void {
  const now = Date.now();
  const arr = prune(uid);
  arr.push(now);
  failTimestamps.set(uid, arr);
}
