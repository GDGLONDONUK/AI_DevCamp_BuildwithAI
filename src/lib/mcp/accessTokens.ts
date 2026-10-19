/**
 * Opaque MCP access tokens (Admin SDK only).
 * Collection: mcpAccessTokens/{id} — never client-readable (default deny).
 *
 * Plaintext token is shown once at mint time; only sha256 hash is stored.
 */

import { createHash, randomBytes } from "node:crypto";
import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export const MCP_ACCESS_TOKENS_COLLECTION = "mcpAccessTokens";

export type McpTokenScope = "learning" | "admin";

export type McpAccessTokenRecord = {
  id: string;
  /** sha256 hex of the secret token */
  tokenHash: string;
  uid: string;
  email?: string;
  /** Role snapshot at mint (re-checked on use for admin). */
  roleAtIssue: string;
  scopes: McpTokenScope[];
  label: string;
  createdByUid: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  revokedAt?: string;
  lastUsedAt?: string;
};

export type MintedMcpToken = {
  token: string;
  tokenId: string;
  scopes: McpTokenScope[];
  expiresAt: string;
  label: string;
  uid: string;
  role: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function newSecretToken(): string {
  return `dcmcp_${randomBytes(32).toString("base64url")}`;
}

function toIso(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "toDate" in v) {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function serializeTokenMeta(
  id: string,
  data: DocumentData
): Omit<McpAccessTokenRecord, "tokenHash"> & { tokenHash?: never } {
  return {
    id,
    uid: String(data.uid || ""),
    email: typeof data.email === "string" ? data.email : undefined,
    roleAtIssue: String(data.roleAtIssue || "attendee"),
    scopes: Array.isArray(data.scopes)
      ? data.scopes.filter((s): s is McpTokenScope => s === "learning" || s === "admin")
      : ["learning"],
    label: String(data.label || ""),
    createdByUid: String(data.createdByUid || ""),
    createdAt: toIso(data.createdAt) || "",
    expiresAt: toIso(data.expiresAt) || "",
    revoked: data.revoked === true,
    revokedAt: toIso(data.revokedAt),
    lastUsedAt: toIso(data.lastUsedAt),
  };
}

export async function mintMcpAccessToken(opts: {
  uid: string;
  email?: string;
  role: string;
  scopes: McpTokenScope[];
  createdByUid: string;
  label?: string;
  ttlHours?: number;
}): Promise<MintedMcpToken> {
  const scopes = [...new Set(opts.scopes)];
  if (scopes.length === 0) throw new Error("At least one scope required");
  if (scopes.includes("admin") && !["admin", "moderator"].includes(opts.role)) {
    throw new Error("Admin scope requires target user role admin or moderator");
  }

  const ttlHours = Math.min(
    Math.max(opts.ttlHours ?? (scopes.includes("admin") ? 24 * 7 : 24 * 30), 1),
    24 * 90
  );
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  const token = newSecretToken();
  const tokenHash = hashToken(token);
  const ref = adminDb().collection(MCP_ACCESS_TOKENS_COLLECTION).doc();
  const label = (opts.label || "mcp").trim().slice(0, 80);

  await ref.set({
    tokenHash,
    uid: opts.uid,
    email: opts.email ?? null,
    roleAtIssue: opts.role,
    scopes,
    label,
    createdByUid: opts.createdByUid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    revoked: false,
  });

  return {
    token,
    tokenId: ref.id,
    scopes,
    expiresAt: expiresAt.toISOString(),
    label,
    uid: opts.uid,
    role: opts.role,
  };
}

export async function revokeMcpAccessToken(
  tokenId: string,
  opts?: { uid?: string; allowAny?: boolean }
): Promise<boolean> {
  const ref = adminDb().collection(MCP_ACCESS_TOKENS_COLLECTION).doc(tokenId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const data = snap.data()!;
  if (!opts?.allowAny && opts?.uid && data.uid !== opts.uid) {
    throw new Error("Forbidden");
  }
  if (data.revoked === true) return true;
  await ref.update({
    revoked: true,
    revokedAt: FieldValue.serverTimestamp(),
  });
  return true;
}

export async function listMcpAccessTokensForUid(uid: string) {
  const snap = await adminDb()
    .collection(MCP_ACCESS_TOKENS_COLLECTION)
    .where("uid", "==", uid)
    .limit(100)
    .get();
  return snap.docs
    .map((d) => serializeTokenMeta(d.id, d.data()))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

/**
 * Resolve opaque MCP Bearer secret. Returns null if not `dcmcp_` shape
 * (caller should try Firebase ID token). User/role checks happen in MCP auth.
 */
export async function resolveMcpAccessToken(rawToken: string): Promise<{
  uid: string;
  email?: string;
  scopes: McpTokenScope[];
  tokenId: string;
} | null> {
  const token = rawToken.trim();
  if (!token.startsWith("dcmcp_")) return null;

  const tokenHash = hashToken(token);
  const snap = await adminDb()
    .collection(MCP_ACCESS_TOKENS_COLLECTION)
    .where("tokenHash", "==", tokenHash)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new Error("Invalid or unknown MCP access token");
  }

  const doc = snap.docs[0];
  const data = doc.data();
  if (data.revoked === true) {
    throw new Error("MCP access token has been revoked");
  }

  const expiresAt = data.expiresAt?.toDate?.() as Date | undefined;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    throw new Error("MCP access token has expired");
  }

  let scopes = (Array.isArray(data.scopes) ? data.scopes : ["learning"]) as McpTokenScope[];
  if (!scopes.includes("learning") && !scopes.includes("admin")) {
    scopes = ["learning"];
  }

  void doc.ref.update({ lastUsedAt: FieldValue.serverTimestamp() }).catch(() => {});

  return {
    uid: String(data.uid || ""),
    email: typeof data.email === "string" ? data.email : undefined,
    scopes: [...new Set(scopes)],
    tokenId: doc.id,
  };
}
