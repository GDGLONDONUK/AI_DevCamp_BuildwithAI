import type { UserProfile } from "@/types";

export type CertifiedCompletionExportRow = {
  user: UserProfile;
  approvedAssignmentCount: number;
  projectTitle: string;
  projectStatus: string;
  sessionsAttended: string;
};

function escapeCsvCell(cell: string | number): string {
  return `"${String(cell).replace(/"/g, '""')}"`;
}

export function exportCertifiedCompletionCsv(rows: CertifiedCompletionExportRow[]): void {
  const headers = [
    "Display Name",
    "Handle",
    "Email",
    "User Status",
    "Approved Assignments",
    "Project Title",
    "Project Status",
    "Sessions Attended",
    "City",
    "Country",
    "LinkedIn",
    "GitHub",
    "Website",
    "Registered At",
  ];

  const csvRows = rows.map((r) => {
    const u = r.user;
    return [
      u.displayName || "",
      u.handle ? `@${u.handle}` : "",
      u.email || "",
      u.userStatus || "pending",
      r.approvedAssignmentCount,
      r.projectTitle,
      r.projectStatus,
      r.sessionsAttended,
      u.city || "",
      u.country || "",
      u.linkedinUrl || "",
      u.githubUrl || "",
      u.websiteUrl || "",
      u.createdAt ? new Date(String(u.createdAt)).toISOString().slice(0, 10) : "",
    ];
  });

  const csv = [headers, ...csvRows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ai-devcamp-certified-completion-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
