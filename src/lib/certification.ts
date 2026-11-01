/**
 * Per-cohort certification rule (single source of truth).
 *
 * countedSessions = !cancelled && !isClosing
 * required = ceil(threshold * counted)
 * qualifies = attendedCount(counted) >= required
 */

export const DEFAULT_CERTIFICATION_THRESHOLD = 0.6;
export const SEPTEMBER_2026_CERTIFICATION_RULE = "attendance>=60%";

export type CountableSession = {
  id: string;
  cancelled?: boolean;
  isClosing?: boolean;
};

export type CertificationEval = {
  countedSessionIds: string[];
  countedSessionCount: number;
  required: number;
  attendedCount: number;
  attendedSessionIds: string[];
  qualifies: boolean;
  shortfall: number;
};

export function countedSessions<T extends CountableSession>(sessions: T[]): T[] {
  return sessions.filter((s) => !s.cancelled && !s.isClosing);
}

export function requiredAttendance(
  counted: number,
  threshold = DEFAULT_CERTIFICATION_THRESHOLD
): number {
  if (counted <= 0) return 0;
  return Math.ceil(threshold * counted);
}

export function evaluateCertification(opts: {
  sessions: CountableSession[];
  attended: Iterable<string>;
  threshold?: number;
}): CertificationEval {
  const counted = countedSessions(opts.sessions);
  const countedSessionIds = counted.map((s) => s.id);
  const required = requiredAttendance(
    counted.length,
    opts.threshold ?? DEFAULT_CERTIFICATION_THRESHOLD
  );
  const attendedSet = new Set(
    [...opts.attended].map(String).filter((id) => id.length > 0)
  );
  const attendedSessionIds = countedSessionIds.filter((id) => attendedSet.has(id));
  const attendedCount = attendedSessionIds.length;
  const qualifies = attendedCount >= required && required > 0;
  return {
    countedSessionIds,
    countedSessionCount: counted.length,
    required,
    attendedCount,
    attendedSessionIds,
    qualifies,
    shortfall: Math.max(0, required - attendedCount),
  };
}

/** True session flags used by attendance maps (ignore audit objects). */
export function attendedSessionIdsFromRecord(
  attendance: Record<string, unknown> | undefined | null
): string[] {
  if (!attendance) return [];
  const ids: string[] = [];
  for (const [key, value] of Object.entries(attendance)) {
    if (key === "id" || key === "userId" || key === "sessionAttendanceAudit" || key === "updatedAt") {
      continue;
    }
    if (value === true) ids.push(key);
  }
  return ids;
}
