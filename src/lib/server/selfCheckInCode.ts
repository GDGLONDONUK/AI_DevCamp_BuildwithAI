import { randomInt } from "node:crypto";

/** Uniform 6-digit string, including leading zeros. */
export function generateSixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function normalizeAttendanceCode(input: string): string {
  return input.replace(/\D/g, "").padStart(6, "0").slice(-6);
}
