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
    uid: "",
    role: "attendee" as UserRole,
    userStatus: "pending" as UserStatus,
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
