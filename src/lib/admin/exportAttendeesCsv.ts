import { UserProfile } from "@/types";
import { Session } from "@/types";
import { formatAdminDateTime } from "./format";

export function exportAttendeesCsv(
  list: UserProfile[],
  attendance: Record<string, Record<string, boolean>>,
  sessions: Session[]
): void {
  const headers = [
    "Display Name",
    "Handle",
    "Email",
    "Role",
    "Status",
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
    sessions.filter((s) => attendance[uid]?.[s.id]).length;

  const rows = list.map((u) => [
    u.displayName || "",
    u.handle ? `@${u.handle}` : "",
    u.email || "",
    u.role || "",
    u.userStatus || "pending",
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
