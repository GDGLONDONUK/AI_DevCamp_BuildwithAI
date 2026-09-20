import { parseLocationFields } from "@/lib/locationCleanup";
import { formTimestampToIso, compareIso } from "@/lib/formTimestamp";
import type { UserProfile, UserRole, UserStatus } from "@/types";
import { getActiveCohortId } from "@/lib/cohorts";

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
    ...cohortEnrolmentFields(typeof at === "string" ? at : undefined),
  };
}

function cohortEnrolmentFields(joinedAt?: string): {
  cohortIds: string[];
  activeCohortId: string;
  cohortParticipation: Record<
    string,
    { status: string; joinedAt: string; role: string }
  >;
} {
  const cohortId = getActiveCohortId();
  const at = joinedAt || new Date().toISOString();
  return {
    cohortIds: [cohortId],
    activeCohortId: cohortId,
    cohortParticipation: {
      [cohortId]: { status: "participated", joinedAt: at, role: "attendee" },
    },
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
  const h = (rows[0] ?? []).map((c) => c.trim());
  if (h.length < 3) return false;
  // Classic GDG / Luma ticket export
  if (
    h.includes("Order number") &&
    h.includes("Ticket number") &&
    h.includes("First Name") &&
    h.includes("Email")
  ) {
    return true;
  }
  // Modern Luma guests export (email + name / first_name)
  const lower = h.map((c) => c.toLowerCase());
  const hasEmail = lower.includes("email") || lower.includes("email address");
  const hasName =
    lower.includes("name") ||
    lower.includes("first name") ||
    lower.includes("first_name");
  const looksLuma =
    lower.includes("api_id") ||
    lower.includes("approval_status") ||
    lower.includes("created_at") ||
    lower.includes("check_in_qr_code") ||
    (h.includes("First Name") && h.includes("Email") && !h.includes("Timestamp"));
  return hasEmail && hasName && looksLuma;
}

function ticketHeaderCol(header: string[], name: string): number {
  const want = name.trim().toLowerCase();
  return header.findIndex((c) => c.trim().toLowerCase() === want);
}

function ticketHeaderColAny(header: string[], names: string[]): number {
  for (const n of names) {
    const i = ticketHeaderCol(header, n);
    if (i >= 0) return i;
  }
  return -1;
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
  importSource: "gdg-ticket" | "luma";
  kickoffInPersonRsvp: boolean;
  cohortIds: string[];
  activeCohortId: string;
  cohortParticipation: Record<
    string,
    { status: string; joinedAt: string; role: string }
  >;
};

/**
 * Luma / ticket row → same broad shape as `rowToPreRegistered` for upsert.
 * Supports classic ticket headers and modern Luma guest exports.
 */
export function rowToPreRegisteredFromTicket(
  header: string[],
  row: string[]
): TicketKickoffImportRow | null {
  if (row.length < 3) return null;
  const cEmail = ticketHeaderColAny(header, ["Email", "email", "Email Address"]);
  const cFirst = ticketHeaderColAny(header, ["First Name", "first_name", "First name"]);
  const cLast = ticketHeaderColAny(header, ["Last Name", "last_name", "Last name"]);
  const cName = ticketHeaderColAny(header, ["Name", "name", "Full Name", "full_name"]);
  if (cEmail < 0) return null;

  const email = (row[cEmail] || "").toLowerCase().trim();
  if (!email?.includes("@") || SKIP_TICKET_IMPORT_EMAILS.has(email)) return null;

  const first = cFirst >= 0 ? cleanTextField(row[cFirst] || "", 200) : "";
  const last = cLast >= 0 ? cleanTextField(row[cLast] || "", 200) : "";
  const fullFromName = cName >= 0 ? cleanTextField(row[cName] || "", 500) : "";
  const cCompany = ticketHeaderColAny(header, ["Company", "company"]);
  const cTitle = ticketHeaderColAny(header, ["Title", "title", "Job Title"]);
  const cPaid = ticketHeaderColAny(header, [
    "Paid date (UTC)",
    "created_at",
    "Created At",
    "registered_at",
  ]);
  const cVenue = ticketHeaderColAny(header, ["Ticket venue", "ticket_type", "Ticket type"]);
  const company = cCompany >= 0 ? cleanTextField(row[cCompany] || "", 200) : "";
  const title = cTitle >= 0 ? cleanTextField(row[cTitle] || "", 200) : "";
  const paidRaw = cPaid >= 0 ? (row[cPaid] || "").trim() : "";
  const venue = cVenue >= 0 ? cleanTextField(row[cVenue] || "", 200) : "";
  const paidIso =
    formTimestampToIso(paidRaw) || (paidRaw || "").trim() || new Date().toISOString();

  const namePart = [first, last].filter(Boolean).join(" ");
  const displayName = cleanTextField(
    fullFromName || namePart || email.split("@")[0] || "Guest",
    500
  );
  const at = paidIso;
  const isModernLuma = header.some((h) =>
    ["api_id", "approval_status", "created_at", "check_in_qr_code"].includes(
      h.trim().toLowerCase()
    )
  );
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
    areasOfInterest: isModernLuma
      ? "Luma registration — September 2026 cohort"
      : "Kickoff / ticket registration export",
    whyJoin: "",
    knowsProgramming: false,
    joiningInPerson: venue
      ? `Registered (${venue})`
      : "Registered via Luma / ticket export",
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
    importSource: isModernLuma ? "luma" : "gdg-ticket",
    kickoffInPersonRsvp: true,
    ...cohortEnrolmentFields(at),
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
