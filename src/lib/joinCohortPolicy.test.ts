import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { APRIL_2027_COHORT_ID, SEPTEMBER_2026_COHORT_ID } from "./cohorts";
import {
  assertCohortIsJoinable,
  resolveSelfJoinCohortId,
  waitlistCopyForCohort,
} from "./joinCohortPolicy";
import { isCohortClosedLifecycle, pickEnrolmentCohortId } from "./cohortEnrolment";

describe("enrolment after September close", () => {
  it("picks April 2027 when September is closed and April is current/upcoming", () => {
    const id = pickEnrolmentCohortId(
      [
        { id: SEPTEMBER_2026_COHORT_ID, life: "closed", isCurrent: false },
        { id: APRIL_2027_COHORT_ID, life: "upcoming", isCurrent: true },
      ],
      SEPTEMBER_2026_COHORT_ID
    );
    assert.equal(id, APRIL_2027_COHORT_ID);
  });

  it("does not enrol into a closed isCurrent cohort", () => {
    const id = pickEnrolmentCohortId(
      [{ id: SEPTEMBER_2026_COHORT_ID, life: "closed", isCurrent: true }],
      SEPTEMBER_2026_COHORT_ID
    );
    assert.equal(id, APRIL_2027_COHORT_ID);
  });
});

describe("self-join policy", () => {
  it("assigns April when the client omits cohortId", () => {
    const r = resolveSelfJoinCohortId(undefined, APRIL_2027_COHORT_ID);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.cohortId, APRIL_2027_COHORT_ID);
  });

  it("rejects joining a closed September cohort", () => {
    const r = assertCohortIsJoinable({
      cohortId: SEPTEMBER_2026_COHORT_ID,
      enrolmentCohortId: APRIL_2027_COHORT_ID,
      lifecycle: "closed",
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 400);
  });

  it("allows joining the enrolment cohort", () => {
    const r = assertCohortIsJoinable({
      cohortId: APRIL_2027_COHORT_ID,
      enrolmentCohortId: APRIL_2027_COHORT_ID,
      lifecycle: "upcoming",
    });
    assert.equal(r.ok, true);
  });
});

describe("closed cohort gates", () => {
  it("treats closed as blocked for check-in/submissions/votes", () => {
    assert.equal(isCohortClosedLifecycle("closed"), true);
    assert.equal(isCohortClosedLifecycle("live"), false);
    assert.equal(isCohortClosedLifecycle("upcoming"), false);
  });

  it("keeps a waitlist message for April 2027", () => {
    assert.match(waitlistCopyForCohort(APRIL_2027_COHORT_ID), /April 2027/);
  });
});
