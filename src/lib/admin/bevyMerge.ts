import { formTimestampToIso, compareIso } from "@/lib/formTimestamp";
import { parseCSVText } from "@/lib/admin/csvPreRegistered";
import { isValid, parseISO } from "date-fns";

export interface BevyCsvRow {
  email: string;
  displayName: string;
  bevyRegisteredAt: string;
  /** Original date cell from the export (for display). */
  rawDate?: string;
}

export function bevyDateToIso(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  const iso = parseISO(t);
  if (isValid(iso)) return iso.toISOString();
  const g = formTimestampToIso(t);
  if (g) return g;
  const d2 = new Date(t);
  if (isValid(d2) && !Number.isNaN(d2.getTime())) return d2.toISOString();
  return null;
}

/** True if the same mailbox (handles gmail ↔ googlemail). */
export function bevyEmailMatches(a: string, b: string): boolean {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (x === y) return true;
  return (
    x.replace("@googlemail.com", "@gmail.com") ===
    y.replace("@googlemail.com", "@gmail.com")
  );
}

type AppUserDoc = { id: string; data: Record<string, unknown> };

export function getResolvedEmailFromUserDoc(d: AppUserDoc): string {
  const de = d.data.email;
  if (typeof de === "string" && de.includes("@")) {
    return de.toLowerCase().trim();
  }
  if (d.id.includes("@")) return d.id.toLowerCase();
  return "";
}

function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,'"]/g, "")
    .trim();
}

/**
 * Heuristic column detection for Bevy / event-platform style CSVs (header row).
 */
function detectColumns(header: string[]) {
  const h = (i: number) => (header[i] || "").trim().toLowerCase();

  let emailCol = -1;
  for (let i = 0; i < header.length; i++) {
    const cell = h(i);
    if (/\be-?mail\b|email address|member email|login email|username/.test(cell)) {
      emailCol = i;
      break;
    }
  }
  if (emailCol < 0) {
    for (let i = 0; i < header.length; i++) {
      if (h(i) === "email") {
        emailCol = i;
        break;
      }
    }
  }

  let firstNameCol = -1;
  let lastNameCol = -1;
  let fullNameCol = -1;
  for (let i = 0; i < header.length; i++) {
    const cell = h(i);
    if (/^first name$|^given name$|first$/.test(cell) && !/last/.test(cell)) firstNameCol = i;
    if (/^last name$|^surname$|^family name$|last$/.test(cell)) lastNameCol = i;
    if (
      /^name$|^full name$|display name|attendee name|member name$/.test(cell) &&
      !/first|last|e-?mail/.test(cell)
    ) {
      fullNameCol = i;
    }
  }

  let dateCol = -1;
  for (let i = 0; i < header.length; i++) {
    const cell = h(i);
    if (
      /registered|registration|rsvp|signed up|date\s*register|join.*date|created( at)?/.test(
        cell
      ) &&
      !/birth|dob|deadline/i.test(cell)
    ) {
      dateCol = i;
      break;
    }
  }

  return { emailCol, firstNameCol, lastNameCol, fullNameCol, dateCol };
}

function nameFromRow(
  r: string[],
  firstNameCol: number,
  lastNameCol: number,
  fullNameCol: number
): string {
  if (fullNameCol >= 0 && (r[fullNameCol] || "").trim()) {
    return (r[fullNameCol] || "").replace(/\s+/g, " ").trim();
  }
  const a = firstNameCol >= 0 ? (r[firstNameCol] || "").trim() : "";
  const b = lastNameCol >= 0 ? (r[lastNameCol] || "").trim() : "";
  if (a || b) return [a, b].filter(Boolean).join(" ");
  for (let i = 0; i < r.length; i++) {
    if (i === firstNameCol || i === lastNameCol || i === fullNameCol) continue;
    const t = (r[i] || "").trim();
    if (t && !t.includes("@") && t.length < 200 && /[a-zA-Z]/.test(t)) {
      if (!/\d{4}-\d{2}/.test(t) && !/^\d{1,2}\/\d{1,2}/.test(t)) return t;
    }
  }
  return "Unknown";
}

function inferDateFromRow(
  r: string[],
  emailCol: number,
  dateCol: number
): string | null {
  if (dateCol >= 0) {
    const t = bevyDateToIso((r[dateCol] || "").trim());
    if (t) return t;
  }
  const fromCol0 = bevyDateToIso((r[0] || "").trim());
  if (fromCol0) return fromCol0;
  for (let j = 0; j < r.length; j++) {
    if (j === emailCol) continue;
    const t = bevyDateToIso((r[j] || "").trim());
    if (t) return t;
  }
  return null;
}

/**
 * Parse a Bevy (or similar) event export CSV. Expects a header row.
 */
export function parseBevyCsvText(text: string):
  | { ok: true; rows: BevyCsvRow[]; duplicateCount: number; parseWarnings: string[] }
  | { ok: false; error: string } {
  const rows = parseCSVText(text);
  if (rows.length < 2) {
    return { ok: false, error: "CSV must include a header row and at least one data row." };
  }

  const header = rows[0]!;
  const { emailCol, firstNameCol, lastNameCol, fullNameCol, dateCol } =
    detectColumns(header);
  if (emailCol < 0) {
    return {
      ok: false,
      error:
        "Could not find an email column. Ensure the file has a header with something like 'Email' or 'Member email'.",
    };
  }

  const out: BevyCsvRow[] = [];
  const seen = new Map<string, BevyCsvRow>();
  const parseWarnings: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const rawEmail = (r[emailCol] || "").toLowerCase().trim();
    if (!rawEmail || !rawEmail.includes("@")) continue;
    const displayName = nameFromRow(r, firstNameCol, lastNameCol, fullNameCol);
    const rawDate = dateCol >= 0 ? (r[dateCol] || "").trim() : "";
    const bevyAt = inferDateFromRow(r, emailCol, dateCol);
    if (!bevyAt) {
      parseWarnings.push(`Row ${i + 1} (${rawEmail}): could not parse registration date — skipped`);
      continue;
    }
    const row: BevyCsvRow = {
      email: rawEmail,
      displayName: displayName || "Unknown",
      bevyRegisteredAt: bevyAt,
      rawDate: rawDate || undefined,
    };
    out.push(row);
    const prev = seen.get(rawEmail);
    if (!prev) {
      seen.set(rawEmail, row);
    } else {
      if (
        compareIso(bevyAt, prev.bevyRegisteredAt) >= 0
      ) {
        seen.set(rawEmail, row);
      }
    }
  }

  if (seen.size === 0) {
    return {
      ok: false,
      error: "No valid data rows (need email and a parseable date).",
    };
  }

  const unique = [...seen.values()];
  return {
    ok: true,
    rows: unique,
    duplicateCount: out.length - unique.length,
    parseWarnings,
  };
}

function pickAppDoc(candidates: AppUserDoc[]): AppUserDoc | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!;
  const uidBacked = candidates.find((c) => !c.id.includes("@"));
  return uidBacked ?? candidates[0]!;
}

function findAllMatchingAppDocs(
  bevyEmail: string,
  appDocs: AppUserDoc[]
): AppUserDoc[] {
  const m: AppUserDoc[] = [];
  for (const d of appDocs) {
    const re = getResolvedEmailFromUserDoc(d);
    if (re && bevyEmailMatches(bevyEmail, re)) m.push(d);
  }
  return m;
}

export type BevyMergePlan = {
  toUpdate: { firestoreId: string; email: string; payload: Record<string, unknown> }[];
  toCreate: { email: string; firestoreId: string; payload: Record<string, unknown> }[];
  inAppNotInBevy: {
    email: string;
    displayName: string;
    firestoreId: string;
    signedIn: boolean;
  }[];
  inBevyNotInApp: { email: string; displayName: string; bevyRegisteredAt: string }[];
  nameMismatches: {
    email: string;
    appName: string;
    bevyName: string;
    firestoreId: string;
  }[];
  stats: { bevyRowCount: number; appDocsWithEmail: number; toUpdate: number; toCreate: number };
};

function signedInFromDoc(d: AppUserDoc): boolean {
  const data = d.data;
  const isEmailKey = d.id.includes("@");
  if (data.signedIn === false) return false;
  if (data.signedIn === true) return true;
  return !isEmailKey;
}

export function buildBevyCreatePayload(row: BevyCsvRow): Record<string, unknown> {
  const email = row.email.toLowerCase().trim();
  const at = row.bevyRegisteredAt;
  return {
    email,
    displayName: row.displayName,
    uid: "",
    role: "attendee",
    userStatus: "participated",
    registeredSessions: [],
    photoURL: "",
    preRegistered: true,
    registered: false,
    signedIn: false,
    bevyRegisteredAt: at,
    bevyNameSnapshot: row.displayName,
    importSource: "bevy",
    importCreatedAt: at,
    formSubmittedAt: at,
    registeredAt: at,
    createdAt: at,
  };
}

/**
 * Build update payload for an existing `users` doc (merge write).
 */
export function buildBevyUpdatePayload(row: BevyCsvRow): Record<string, unknown> {
  return {
    bevyRegisteredAt: row.bevyRegisteredAt,
    bevyNameSnapshot: row.displayName,
  };
}

/**
 * Plan Bevy merge: match by email, flag name differences, list app-only and Bevy-only people.
 */
export function computeBevyMergePlan(
  bevyRows: BevyCsvRow[],
  appDocs: AppUserDoc[]
): BevyMergePlan {
  const withEmail: AppUserDoc[] = appDocs.filter((d) => Boolean(getResolvedEmailFromUserDoc(d)));
  const toUpdate: BevyMergePlan["toUpdate"] = [];
  const toCreate: BevyMergePlan["toCreate"] = [];
  const nameMismatches: BevyMergePlan["nameMismatches"] = [];
  for (const bevy of bevyRows) {
    const matches = findAllMatchingAppDocs(bevy.email, withEmail);
    const doc = pickAppDoc(matches);
    if (doc) {
      toUpdate.push({
        firestoreId: doc.id,
        email: getResolvedEmailFromUserDoc(doc),
        payload: buildBevyUpdatePayload(bevy),
      });
      const appName = String(doc.data.displayName || "").trim() || "(no name)";
      if (normName(appName) !== normName(bevy.displayName)) {
        nameMismatches.push({
          email: getResolvedEmailFromUserDoc(doc),
          appName,
          bevyName: bevy.displayName,
          firestoreId: doc.id,
        });
      }
    } else {
      toCreate.push({
        email: bevy.email,
        firestoreId: bevy.email,
        payload: buildBevyCreatePayload(bevy),
      });
    }
  }

  const inBevyNotInApp = toCreate.map((c) => ({
    email: c.email,
    displayName: (c.payload.displayName as string) || "Unknown",
    bevyRegisteredAt: c.payload.bevyRegisteredAt as string,
  }));

  const inAppNotInBevy: BevyMergePlan["inAppNotInBevy"] = [];
  for (const d of withEmail) {
    const re = getResolvedEmailFromUserDoc(d);
    if (!re) continue;
    let inBevy = false;
    for (const b of bevyRows) {
      if (bevyEmailMatches(b.email, re)) {
        inBevy = true;
        break;
      }
    }
    if (!inBevy) {
      inAppNotInBevy.push({
        email: re,
        displayName: String(d.data.displayName || "").trim() || "(no name)",
        firestoreId: d.id,
        signedIn: signedInFromDoc(d),
      });
    }
  }

  inAppNotInBevy.sort((a, b) => a.email.localeCompare(b.email));

  return {
    toUpdate,
    toCreate,
    inAppNotInBevy,
    inBevyNotInApp,
    nameMismatches,
    stats: {
      bevyRowCount: bevyRows.length,
      appDocsWithEmail: withEmail.length,
      toUpdate: toUpdate.length,
      toCreate: toCreate.length,
    },
  };
}
