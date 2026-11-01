/**
 * Who may self-join which cohort. Registration stays open onto the enrolment
 * cohort; closed programmes reject joins (and check-in / submissions / votes).
 */

import {
  APRIL_2027_COHORT_ID,
  normalizeCohortLifecycle,
  type CohortLifecycle,
} from "@/lib/cohorts";

export function resolveSelfJoinCohortId(
  requested: string | undefined,
  enrolmentCohortId: string
): { ok: true; cohortId: string } | { ok: false; status: number; error: string } {
  const cohortId = requested?.trim() || enrolmentCohortId;
  if (!cohortId) {
    return { ok: false, status: 400, error: "No enrolment cohort configured" };
  }
  return { ok: true, cohortId };
}

export function assertCohortIsJoinable(opts: {
  cohortId: string;
  enrolmentCohortId: string;
  lifecycle: CohortLifecycle;
}): { ok: true } | { ok: false; status: number; error: string } {
  if (opts.lifecycle === "closed") {
    return {
      ok: false,
      status: 400,
      error:
        "That cohort is closed. New sign-ups join the next programme (April 2027).",
    };
  }
  if (opts.cohortId !== opts.enrolmentCohortId) {
    return { ok: false, status: 400, error: "That cohort is not open for self-join" };
  }
  return { ok: true };
}

export function waitlistCopyForCohort(cohortId: string): string {
  if (cohortId === APRIL_2027_COHORT_ID) {
    return "You're on the list for the next cohort (April 2027).";
  }
  return "You're on the list for the next cohort.";
}

export function lifecycleFromCohortDoc(data: {
  status?: unknown;
  isCurrent?: unknown;
}): CohortLifecycle {
  return normalizeCohortLifecycle(
    typeof data.status === "string" ? data.status : undefined,
    data.isCurrent === true
  );
}
