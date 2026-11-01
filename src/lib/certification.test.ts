import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  countedSessions,
  evaluateCertification,
  requiredAttendance,
} from "./certification";

const SEPT = [
  { id: "kickoff" },
  { id: "build-sat" },
  { id: "scale-thu" },
  { id: "scale-sat" },
  { id: "govern-thu" },
  { id: "govern-sat", cancelled: true },
  { id: "optimise-thu" },
  { id: "optimise-sat" },
  { id: "optimise-thu-22" },
  { id: "hackathon", isClosing: true },
];

describe("certification rule", () => {
  it("excludes cancelled and closing sessions (8 counted for September)", () => {
    const counted = countedSessions(SEPT);
    assert.equal(counted.length, 8);
    assert.ok(!counted.some((s) => s.id === "govern-sat"));
    assert.ok(!counted.some((s) => s.id === "hackathon"));
  });

  it("requires ceil(0.6 * 8) = 5", () => {
    assert.equal(requiredAttendance(8, 0.6), 5);
  });

  it("qualifies at exactly 5 of 8", () => {
    const r = evaluateCertification({
      sessions: SEPT,
      attended: ["kickoff", "build-sat", "scale-thu", "scale-sat", "govern-thu"],
    });
    assert.equal(r.attendedCount, 5);
    assert.equal(r.required, 5);
    assert.equal(r.qualifies, true);
    assert.equal(r.shortfall, 0);
  });

  it("does not qualify at 4 of 8", () => {
    const r = evaluateCertification({
      sessions: SEPT,
      attended: ["kickoff", "build-sat", "scale-thu", "scale-sat"],
    });
    assert.equal(r.qualifies, false);
    assert.equal(r.shortfall, 1);
  });

  it("ignores closing-day attendance when counting", () => {
    const r = evaluateCertification({
      sessions: SEPT,
      attended: ["kickoff", "build-sat", "scale-thu", "scale-sat", "hackathon"],
    });
    assert.equal(r.attendedCount, 4);
    assert.equal(r.qualifies, false);
  });

  it("ignores cancelled-session attendance when counting", () => {
    const r = evaluateCertification({
      sessions: SEPT,
      attended: ["kickoff", "build-sat", "scale-thu", "scale-sat", "govern-sat"],
    });
    assert.equal(r.attendedCount, 4);
    assert.equal(r.qualifies, false);
  });
});
