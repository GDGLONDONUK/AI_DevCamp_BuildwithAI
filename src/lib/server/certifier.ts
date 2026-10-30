/**
 * Certifier API — server only. Token: CERTIFIER_API_TOKEN (never commit).
 * Docs: https://developers.certifier.io/docs/api-reference/credentials/search-credentials
 */

import { certifierCredentialViewUrl } from "@/lib/certifierLinks";

const CERTIFIER_BASE = "https://api.certifier.io/v1";
const DEFAULT_VERSION = "2022-10-26";

export type CertifierCredentialSummary = {
  id: string;
  publicId: string;
  status: string;
  recipientEmail: string;
  recipientName: string;
  issueDate?: string;
  viewUrl: string;
};

type CertifierSearchResponse = {
  data?: Array<{
    id: string;
    publicId: string;
    status: string;
    recipient?: { name?: string; email?: string };
    issueDate?: string;
  }>;
  pagination?: { next?: string | null };
};

function apiToken(): string {
  const t = process.env.CERTIFIER_API_TOKEN?.trim();
  if (!t) throw new Error("CERTIFIER_API_TOKEN is not configured");
  return t;
}

function apiVersion(): string {
  return process.env.CERTIFIER_API_VERSION?.trim() || DEFAULT_VERSION;
}

export { certifierCredentialViewUrl };

async function certifierFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${CERTIFIER_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken()}`,
      "Certifier-Version": apiVersion(),
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const json = (await res.json().catch(() => ({}))) as T & {
    error?: { code?: string; message?: string };
  };
  if (!res.ok) {
    const msg =
      (json as { error?: { message?: string } }).error?.message ||
      `Certifier API ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

function searchBodyForEmail(email: string, op: "equals" | "contains"): Record<string, unknown> {
  const normalized = email.trim().toLowerCase();
  return {
    filter: {
      AND: [
        {
          recipient: {
            email: { [op]: op === "contains" ? normalized.split("@")[0] : normalized },
          },
        },
      ],
    },
    sort: { property: "createdAt", order: "desc" as const },
    limit: 25,
  };
}

/** Find credentials for a recipient email (prefers issued, then most recent). */
export async function searchCertifierCredentialsByEmail(
  email: string
): Promise<CertifierCredentialSummary[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];

  let json = await certifierFetch<CertifierSearchResponse>("/credentials/search", {
    method: "POST",
    body: JSON.stringify(searchBodyForEmail(normalized, "equals")),
  });

  let rows = json.data ?? [];
  if (rows.length === 0) {
    json = await certifierFetch<CertifierSearchResponse>("/credentials/search", {
      method: "POST",
      body: JSON.stringify(searchBodyForEmail(normalized, "contains")),
    });
    rows = json.data ?? [];
    rows = rows.filter(
      (r) => r.recipient?.email?.trim().toLowerCase() === normalized
    );
  }

  return rows
    .filter((r) => r.id && r.publicId)
    .map((r) => ({
      id: r.id,
      publicId: r.publicId,
      status: r.status ?? "unknown",
      recipientEmail: r.recipient?.email ?? normalized,
      recipientName: r.recipient?.name ?? "",
      issueDate: r.issueDate,
      viewUrl: certifierCredentialViewUrl(r.publicId),
    }));
}

/** Best credential to attach to a certified user (issued first). */
export function pickBestCertifierCredential(
  list: CertifierCredentialSummary[]
): CertifierCredentialSummary | null {
  if (list.length === 0) return null;
  const issued = list.filter((c) => c.status === "issued");
  const pool = issued.length > 0 ? issued : list;
  return pool[0] ?? null;
}

export function certifierGroupId(): string {
  const g = process.env.CERTIFIER_GROUP_ID?.trim();
  if (!g) {
    throw new Error(
      "CERTIFIER_GROUP_ID is not configured (Certifier credential template / group id)"
    );
  }
  return g;
}

function toSummary(
  raw: {
    id?: string;
    publicId?: string;
    status?: string;
    recipient?: { name?: string; email?: string };
    issueDate?: string;
  },
  fallbackEmail: string
): CertifierCredentialSummary | null {
  if (!raw.id || !raw.publicId) return null;
  return {
    id: raw.id,
    publicId: raw.publicId,
    status: raw.status ?? "issued",
    recipientEmail: raw.recipient?.email ?? fallbackEmail,
    recipientName: raw.recipient?.name ?? "",
    issueDate: raw.issueDate,
    viewUrl: certifierCredentialViewUrl(raw.publicId),
  };
}

/**
 * Create, issue, and email a credential (counts against the Certifier annual quota).
 * Docs: https://developers.certifier.io/docs/api-reference/credentials/create-issue-and-send-a-credential
 */
export async function createIssueSendCredential(opts: {
  groupId: string;
  name: string;
  email: string;
  issueDate?: string;
}): Promise<CertifierCredentialSummary> {
  const email = opts.email.trim().toLowerCase();
  const name = opts.name.trim() || email.split("@")[0] || "Attendee";
  const json = await certifierFetch<
    | {
        id?: string;
        publicId?: string;
        status?: string;
        recipient?: { name?: string; email?: string };
        issueDate?: string;
        data?: {
          id?: string;
          publicId?: string;
          status?: string;
          recipient?: { name?: string; email?: string };
          issueDate?: string;
        };
      }
  >("/credentials/create-issue-send", {
    method: "POST",
    body: JSON.stringify({
      groupId: opts.groupId,
      recipient: { name, email },
      issueDate: opts.issueDate || new Date().toISOString().slice(0, 10),
    }),
  });
  const raw = json.data ?? json;
  const summary = toSummary(raw, email);
  if (!summary) throw new Error("Certifier did not return a credential id");
  return summary;
}
