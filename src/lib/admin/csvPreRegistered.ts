import { parseLocationFields } from "@/lib/locationCleanup";
import { PreRegisteredUser } from "@/types";

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

function rowToPreRegistered(r: string[]): PreRegisteredUser | null {
  if (r.length < 8) return null;
  const email = (r[2] || "").toLowerCase().trim();
  if (!email || !email.includes("@")) return null;
  const { location, city, country } = parseLocationFields(r[10] || "");
  return {
    email,
    displayName: (r[1] || "").trim(),
    formSubmittedAt: (r[0] || "").trim(),
    formRole: (r[3] || "").trim(),
    yearsOfExperience: (r[4] || "").trim(),
    priorAIKnowledge: (r[5] || "").trim(),
    areasOfInterest: (r[6] || "").trim(),
    whyJoin: (r[7] || "").trim(),
    knowsProgramming: (r[8] || "").toLowerCase().includes("know"),
    joiningInPerson: (r[9] || "").trim(),
    location,
    city,
    country,
    commitment: (r[11] || "").toLowerCase().includes("understand"),
  };
}

/**
 * Dedupe by email (last row wins). Skips header row [0].
 */
export function buildPreRegisteredUsersFromRows(rows: string[][]): {
  unique: PreRegisteredUser[];
  duplicateCount: number;
} {
  const raw: PreRegisteredUser[] = [];
  const seen = new Map<string, PreRegisteredUser>();
  for (let i = 1; i < rows.length; i++) {
    const u = rowToPreRegistered(rows[i]);
    if (!u) continue;
    seen.set(u.email, u);
    raw.push(u);
  }
  const unique = [...seen.values()];
  const duplicateCount = raw.length - unique.length;
  return { unique, duplicateCount };
}
