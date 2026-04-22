import { parseLocationFields } from "@/lib/locationCleanup";
import { formTimestampToIso, compareIso } from "@/lib/formTimestamp";
import type { UserProfile, UserRole, UserStatus } from "@/types";

const ZW_RE = /[\u200B-\u200D\uFEFF\u2060]/g;

/** Collapse whitespace and strip zero-width / BOM for Firestore and publishing. */
function cleanTextField(s: string, maxLength = 20000): string {
  let t = s.replace(ZW_RE, "");
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t.replace(/[\s\u00A0\u2000-\u200B\u202F\u205F\u3000]+/g, " ");
  t = t.trim();
  if (t.length > maxLength) t = t.slice(0, maxLength).trim() + "…";
  return t;
}

/** RFC-4180-style CSV parse (quoted fields). */
export function parseCSVText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nx = text[i + 1];
    if (inQ) {
      if (ch === '"' && nx === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      row.push(field.trim());
      field = "";
    } else if (ch === "\n" || (ch === "\r" && nx === "\n")) {
      if (ch === "\r") i++;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}

/**
 * Payload written to `users/{email}` for pending imports (not yet signed in).
 * Index map: 0=Timestamp,1=Name,2=Email,3=Role,4=Years,5=Prior AI,6=Areas,7=Why,8=Programming,9=In person,10=Location,11=Commitment
 */
export function rowToPreRegistered(
  r: string[]
): (Partial<UserProfile> & {
  email: string;
  formRole: string;
  yearsOfExperience: string;
  knowsProgramming: boolean;
  commitment: boolean;
}) | null {
  if (r.length < 8) return null;
  const email = (r[2] || "").toLowerCase().trim();
  if (!email || !email.includes("@")) return null;

  const rawTs = (r[0] || "").trim();
  const tsIso = formTimestampToIso(rawTs);
  const formAt = tsIso ?? rawTs;

  const { location, city, country } = parseLocationFields(r[10] || "");

  const at = formAt;
  return {
    email,
    displayName: cleanTextField(r[1] || "", 500),
    importSource: "google-form" as const,
    uid: "",
    role: "attendee" as UserRole,
    userStatus: "participated" as UserStatus,
    registeredSessions: [],
    photoURL: "",
    formSubmittedAt: at,
    registeredAt: tsIso ?? at,
    importCreatedAt: tsIso ?? at,
    createdAt: at,
    updatedAt: at,
    formRole: cleanTextField(r[3] || "", 200),
    yearsOfExperience: cleanTextField(r[4] || "", 200),
    priorAIKnowledge: cleanTextField(r[5] || "", 12000),
    areasOfInterest: cleanTextField(r[6] || "", 8000),
    whyJoin: cleanTextField(r[7] || "", 12000),
    knowsProgramming: (r[8] || "").toLowerCase().includes("know"),
    joiningInPerson: cleanTextField(r[9] || "", 500),
    location,
    city,
    country,
    commitment: (r[11] || "").toLowerCase().includes("understand"),
    preRegistered: true,
    registered: false,
    signedIn: false,
  };
}

type ImportRow = NonNullable<ReturnType<typeof rowToPreRegistered>>;

function pickNewerByTimestamp(a: ImportRow, b: ImportRow): ImportRow {
  const aAt = a.registeredAt ?? a.formSubmittedAt;
  const bAt = b.registeredAt ?? b.formSubmittedAt;
  return compareIso(
    typeof aAt === "string" ? aAt : null,
    typeof bAt === "string" ? bAt : null
  ) >= 0
    ? a
    : b;
}

/**
 * Dedupe by email: keep the row with the latest form timestamp (for resubmits / duplicates).
 * Skips header row [0].
 */
export function buildPreRegisteredUsersFromRows(rows: string[][]): {
  unique: ImportRow[];
  duplicateCount: number;
} {
  const raw: ImportRow[] = [];
  const byEmail = new Map<string, ImportRow>();
  for (let i = 1; i < rows.length; i++) {
    const u = rowToPreRegistered(rows[i]);
    if (!u) continue;
    raw.push(u);
    const prev = byEmail.get(u.email);
    if (!prev) {
      byEmail.set(u.email, u);
    } else {
      byEmail.set(u.email, pickNewerByTimestamp(u, prev));
    }
  }
  const unique = [...byEmail.values()];
  const duplicateCount = raw.length - unique.length;
  return { unique, duplicateCount };
}

/** Emails that appeared more than once in the CSV (for admin UI), with per-email count. */
export function duplicateMetaFromRows(rows: string[][]): { email: string; count: number }[] {
  const counts = new Map<string, number>();
  for (let i = 1; i < rows.length; i++) {
    const u = rowToPreRegistered(rows[i]);
    if (!u) continue;
    counts.set(u.email, (counts.get(u.email) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c > 1)
    .map(([email, count]) => ({ email, count }));
}

// ── Luma / Google Events / GDG ticket export (kick-off) ────────────────────
/** e.g. `*AI DevCamp 2026* kick-off* registration.csv` — Order number, Ticket number, First Name, ... */

const SKIP_TICKET_IMPORT_EMAILS = new Set(
  [
    "gdg-support@google.com",
  ].map((e) => e.toLowerCase())
);

export function isTicketEventExportFormat(rows: string[][]): boolean {
  const h = rows[0] ?? [];
  if (h.length < 5) return false;
  return (
    h.includes("Order number") &&
    h.includes("Ticket number") &&
    h.includes("First Name") &&
    h.includes("Email")
  );
}

function ticketHeaderCol(header: string[], name: string): number {
  return header.findIndex((c) => c.trim() === name);
}

/** Row shape for Luma / GDG ticket export → `POST /api/admin/preregistered`. */
export type TicketKickoffImportRow = {
  email: string;
  displayName: string;
  uid: string;
  role: UserRole;
  userStatus: UserStatus;
  registeredSessions: string[];
  photoURL: string;
  formRole: string;
  roleTitle?: string;
  yearsOfExperience: string;
  priorAIKnowledge: string;
  areasOfInterest: string;
  whyJoin: string;
  knowsProgramming: boolean;
  joiningInPerson: string;
  location: string;
  city: string;
  country: string;
  commitment: boolean;
  formSubmittedAt: string;
  registeredAt: string;
  importCreatedAt: string;
  createdAt: string;
  updatedAt: string;
  preRegistered: boolean;
  registered: boolean;
  signedIn: boolean;
  importSource: "gdg-ticket";
  kickoffInPersonRsvp: boolean;
};

/**
 * Luma / ticket row → same broad shape as `rowToPreRegistered` for upsert, plus `kickoffInPersonRsvp`.
 * Uses `Email`, `First Name`, `Last Name`, `Company`, `Title`, `Paid date (UTC)`.
 */
export function rowToPreRegisteredFromTicket(
  header: string[],
  row: string[]
): TicketKickoffImportRow | null {
  if (row.length < 5) return null;
  const cEmail = ticketHeaderCol(header, "Email");
  const cFirst = ticketHeaderCol(header, "First Name");
  const cLast = ticketHeaderCol(header, "Last Name");
  if (cEmail < 0 || cFirst < 0 || cLast < 0) return null;

  const email = (row[cEmail] || "").toLowerCase().trim();
  if (!email?.includes("@") || SKIP_TICKET_IMPORT_EMAILS.has(email)) return null;

  const first = cleanTextField(row[cFirst] || "", 200);
  const last = cleanTextField(row[cLast] || "", 200);
  const cCompany = ticketHeaderCol(header, "Company");
  const cTitle = ticketHeaderCol(header, "Title");
  const cPaid = ticketHeaderCol(header, "Paid date (UTC)");
  const cVenue = ticketHeaderCol(header, "Ticket venue");
  const company = cCompany >= 0 ? cleanTextField(row[cCompany] || "", 200) : "";
  const title = cTitle >= 0 ? cleanTextField(row[cTitle] || "", 200) : "";
  const paidRaw = cPaid >= 0 ? (row[cPaid] || "").trim() : "";
  const venue = cVenue >= 0 ? cleanTextField(row[cVenue] || "", 200) : "In-person";
  const paidIso =
    formTimestampToIso(paidRaw) || (paidRaw || "").trim() || new Date().toISOString();

  const namePart = [first, last].filter(Boolean).join(" ");
  const displayName = cleanTextField(
    namePart || email.split("@")[0] || "Guest",
    500
  );
  const at = paidIso;
  return {
    email,
    displayName,
    uid: "",
    role: "attendee" as UserRole,
    userStatus: "participated" as UserStatus,
    registeredSessions: [],
    photoURL: "",
    formRole: title,
    roleTitle: company || undefined,
    yearsOfExperience: "",
    priorAIKnowledge: "",
    areasOfInterest: "Kickoff in-person (final ticket / registration export)",
    whyJoin: "",
    knowsProgramming: false,
    joiningInPerson: venue ? `In person (${venue} — ticket)` : "In person (ticket)",
    location: "",
    city: "",
    country: "",
    commitment: true,
    formSubmittedAt: at,
    registeredAt: at,
    importCreatedAt: at,
    createdAt: at,
    updatedAt: at,
    preRegistered: true,
    registered: false,
    signedIn: false,
    importSource: "gdg-ticket",
    kickoffInPersonRsvp: true,
  };
}

function pickNewerByPaidDate(a: TicketKickoffImportRow, b: TicketKickoffImportRow): TicketKickoffImportRow {
  return compareIso(
    typeof a.registeredAt === "string" ? a.registeredAt : null,
    typeof b.registeredAt === "string" ? b.registeredAt : null
  ) >= 0
    ? a
    : b;
}

export function buildTicketUsersFromRows(rows: string[][]): {
  unique: TicketKickoffImportRow[];
  duplicateCount: number;
} {
  if (rows.length < 2) return { unique: [], duplicateCount: 0 };
  const header = rows[0];
  const raw: TicketKickoffImportRow[] = [];
  const byEmail = new Map<string, TicketKickoffImportRow>();
  for (let i = 1; i < rows.length; i++) {
    const u = rowToPreRegisteredFromTicket(header, rows[i]);
    if (!u) continue;
    raw.push(u);
    const prev = byEmail.get(u.email);
    if (!prev) {
      byEmail.set(u.email, u);
    } else {
      byEmail.set(u.email, pickNewerByPaidDate(u, prev));
    }
  }
  const unique = [...byEmail.values()];
  const duplicateCount = raw.length - unique.length;
  return { unique, duplicateCount };
}

export function duplicateMetaFromTicketRows(rows: string[][]): { email: string; count: number }[] {
  if (rows.length < 2) return [];
  const header = rows[0];
  const counts = new Map<string, number>();
  for (let i = 1; i < rows.length; i++) {
    const u = rowToPreRegisteredFromTicket(header, rows[i]);
    if (!u) continue;
    counts.set(u.email, (counts.get(u.email) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c > 1)
    .map(([email, count]) => ({ email, count }));
}
