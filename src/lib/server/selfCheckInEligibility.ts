/**
 * Whether an attendee may use live self check-in.
 * Aligns with sessions page access: anyone who is not pending/failed
 * (including missing status on older/partial profiles).
 */
export function canSelfCheckInStatus(userStatus: unknown): boolean {
  return userStatus !== "pending" && userStatus !== "failed";
}
