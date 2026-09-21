/**
 * Known programme organisers who must always retain `role: "admin"`.
 * Used by ensure-profile and the fix-organiser-admins script.
 */
export const ORGANISER_ADMIN_EMAILS: readonly string[] = [
  "sumithpd@gmail.com",
  "renuvkelkar@googlemail.com",
  "meet.bhorania@gmail.com",
  "manannsuthar@gmail.com",
] as const;

export function normalizeOrganiserEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isOrganiserAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const n = normalizeOrganiserEmail(email);
  return ORGANISER_ADMIN_EMAILS.some((e) => e === n);
}
