import { UserProfile } from "@/types";
import { Session } from "@/types";
import { resolveKickoffJoinedAs } from "@/lib/inPersonCheckin";
import { formatAdminDateTime } from "./format";

function kickoffJoinedLabel(uid: string, attendance: Record<string, Record<string, boolean | string>>): string {
  const m = resolveKickoffJoinedAs(attendance[uid] as Record<string, unknown> | undefined);
  if (m === "in-person") return "In person";
  if (m === "online") return "Online";
  return "";
}

export function exportAttendeesCsv(
  list: UserProfile[],
  attendance: Record<string, Record<string, boolean | string>>,
  sessions: Session[]
): void {
  const headers = [
    "Display Name",
    "Handle",
    "Email",
    "Role",
    "Status",
    "Kickoff in-person RSVP",
    "Joining in person",
    "RSVP updated at",
    "RSVP set by (app or admin)",
    "RSVP set by admin email",
    "In person (admin confirmed)",
    "S1 Kick Off — joined as (in person / online)",
    "Experience",
    "City",
    "Country",
    "LinkedIn",
    "GitHub",
    "Website",
    "Sessions Attended",
    "Skills",
    "Expertise",
    "Want to Learn",
    "Can Offer",
    "Registered At",
    "Updated At",
  ];
  const attendanceCount = (uid: string) =>
    sessions.filter((s) => attendance[uid]?.[s.id] === true).length;

  const rows = list.map((u) => [
    u.displayName || "",
    u.handle ? `@${u.handle}` : "",
    u.email || "",
    u.role || "",
    u.userStatus || "pending",
    u.kickoffInPersonRsvp === true
      ? "Yes"
      : u.kickoffInPersonRsvp === false
        ? "No"
        : "",
    u.joiningInPerson || "",
    u.kickoffRsvpUpdatedAt
      ? formatAdminDateTime(u.kickoffRsvpUpdatedAt)
      : "",
    u.kickoffRsvpSetBy === "admin" ? "admin" : u.kickoffRsvpSetBy === "app" ? "app" : "",
    u.kickoffRsvpSetByAdminEmail || "",
    u.kickoffInPersonAdminConfirmed === true ? "Yes" : u.kickoffInPersonAdminConfirmed === false ? "No" : "",
    kickoffJoinedLabel(u.uid, attendance),
    u.experienceLevel || "",
    u.city || "",
    u.country || "",
    u.linkedinUrl || "",
    u.githubUrl || "",
    u.websiteUrl || "",
    `${attendanceCount(u.uid)}/${sessions.length}`,
    (u.skills || []).join("; "),
    (u.expertise || []).join("; "),
    (u.wantToLearn || []).join("; "),
    (u.canOffer || []).join("; "),
    formatAdminDateTime(u.createdAt),
    formatAdminDateTime(u.updatedAt),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ai-devcamp-attendees-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
