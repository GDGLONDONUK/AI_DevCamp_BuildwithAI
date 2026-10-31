/**
 * Admin Certifier sync / issue. Call only after requireAdmin (HTTP or MCP).
 */

import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { AdminOpError } from "@/lib/server/admin/errors";
import { resolveUserDoc } from "@/lib/server/admin/resolveUserDoc";
import {
  certifierGroupId,
  createIssueSendCredential,
  pickBestCertifierCredential,
  searchCertifierCredentialsByEmail,
  type CertifierCredentialSummary,
} from "@/lib/server/certifier";

export type CertifierSyncOpts = {
  uids?: string[];
  email?: string;
  certifiedOnly?: boolean;
};

export type CertifierSyncResult = {
  total: number;
  synced: number;
  missing: number;
  failed: number;
  syncedRows: { uid: string; email: string; credentialId: string }[];
  missingRows: { uid: string; email: string }[];
  failedRows: { uid: string; email: string; error: string }[];
};

async function loadSyncTargets(opts: CertifierSyncOpts): Promise<DocumentSnapshot[]> {
  const db = adminDb();
  if (opts.email) {
    const snap = await resolveUserDoc(opts.email);
    return snap?.exists ? [snap] : [];
  }
  if (opts.uids?.length) {
    const snaps = await Promise.all(
      opts.uids.map((uid) => db.collection("users").doc(uid).get())
    );
    return snaps.filter((s) => s.exists);
  }
  if (opts.certifiedOnly === false) {
    const q = await db.collection("users").where("role", "==", "attendee").get();
    return q.docs.filter((d) => !d.id.includes("@"));
  }
  const q = await db
    .collection("users")
    .where("userStatus", "==", "certified")
    .where("role", "==", "attendee")
    .get();
  return q.docs;
}

async function writeCredentialFields(
  doc: DocumentSnapshot,
  cred: CertifierCredentialSummary,
  extra?: Record<string, unknown>
) {
  await doc.ref.update({
    certifierCredentialId: cred.id,
    certifierCredentialPublicId: cred.publicId,
    certifierCredentialStatus: cred.status,
    certifierSyncedAt: new Date().toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
    ...extra,
  });
}

/** Link existing Certifier credentials onto user docs (does not issue new ones). */
export async function syncCertifierCredentials(
  opts: CertifierSyncOpts = {}
): Promise<CertifierSyncResult> {
  const targets = await loadSyncTargets(opts);
  const synced: CertifierSyncResult["syncedRows"] = [];
  const missing: CertifierSyncResult["missingRows"] = [];
  const failed: CertifierSyncResult["failedRows"] = [];

  for (const doc of targets) {
    const data = doc.data();
    if (!data) continue;
    const email = (data.email as string)?.trim();
    if (!email) {
      failed.push({ uid: doc.id, email: "", error: "No email" });
      continue;
    }
    try {
      const found = await searchCertifierCredentialsByEmail(email);
      const best = pickBestCertifierCredential(found);
      if (!best) {
        missing.push({ uid: doc.id, email });
        continue;
      }
      await writeCredentialFields(doc, best);
      synced.push({ uid: doc.id, email, credentialId: best.id });
    } catch (e) {
      failed.push({
        uid: doc.id,
        email,
        error: e instanceof Error ? e.message : "sync failed",
      });
    }
  }

  return {
    total: targets.length,
    synced: synced.length,
    missing: missing.length,
    failed: failed.length,
    syncedRows: synced,
    missingRows: missing,
    failedRows: failed,
  };
}

export type IssueCertifierOpts = {
  uidOrEmail: string;
  /** Default: CERTIFIER_GROUP_ID. */
  groupId?: string;
  /** If a credential already exists, link it and skip issue (default true). */
  skipIfExists?: boolean;
  /** Also set users.userStatus = certified (default true). */
  markCertified?: boolean;
};

export type IssueCertifierResult = {
  uid: string;
  email: string;
  alreadyIssued: boolean;
  markedCertified: boolean;
  credential: CertifierCredentialSummary;
};

/** Issue + email a Credsverse credential, then store ids on the user. */
export async function issueCertifierCredential(
  opts: IssueCertifierOpts
): Promise<IssueCertifierResult> {
  const snap = await resolveUserDoc(opts.uidOrEmail);
  if (!snap?.exists) {
    throw new AdminOpError(`User not found: ${opts.uidOrEmail}`, 404);
  }
  const data = snap.data() || {};
  const email = String(data.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new AdminOpError("User has no email — cannot issue a certificate", 400);
  }
  const name =
    (typeof data.displayName === "string" && data.displayName.trim()) ||
    email.split("@")[0] ||
    "Attendee";

  const skipIfExists = opts.skipIfExists !== false;
  if (skipIfExists) {
    const existing = pickBestCertifierCredential(
      await searchCertifierCredentialsByEmail(email)
    );
    if (existing) {
      const markCertified = opts.markCertified !== false;
      await writeCredentialFields(
        snap,
        existing,
        markCertified ? { userStatus: "certified" } : undefined
      );
      return {
        uid: snap.id,
        email,
        alreadyIssued: true,
        markedCertified: markCertified,
        credential: existing,
      };
    }
  }

  let groupId: string;
  try {
    groupId = opts.groupId?.trim() || certifierGroupId();
  } catch (e) {
    throw new AdminOpError(
      e instanceof Error ? e.message : "CERTIFIER_GROUP_ID is not configured",
      503
    );
  }

  let issued: CertifierCredentialSummary;
  try {
    issued = await createIssueSendCredential({
      groupId,
      name,
      email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Certifier issue failed";
    if (msg.includes("CERTIFIER_API_TOKEN")) {
      throw new AdminOpError("Set CERTIFIER_API_TOKEN in server environment", 503);
    }
    throw new AdminOpError(msg, 502);
  }

  const markCertified = opts.markCertified !== false;
  await writeCredentialFields(
    snap,
    issued,
    markCertified ? { userStatus: "certified" } : undefined
  );

  return {
    uid: snap.id,
    email,
    alreadyIssued: false,
    markedCertified: markCertified,
    credential: issued,
  };
}
