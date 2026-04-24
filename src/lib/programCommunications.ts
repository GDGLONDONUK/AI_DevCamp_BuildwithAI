import type { UserProfile } from "@/types";

/** False when the person should not receive cohort / programme bulk email. */
export function receivesProgramCommunications(
  u: Pick<UserProfile, "accountDisabled" | "programOptOut">
): boolean {
  if (u.accountDisabled === true) return false;
  if (u.programOptOut === true) return false;
  return true;
}
