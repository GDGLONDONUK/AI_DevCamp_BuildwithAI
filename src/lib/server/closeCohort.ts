/**
 * Close a cohort: apply 60% certification, stamp closing-day attendance, mark lifecycle closed.
 * Idempotent. Does not issue Certifier credentials or send email.
 */

import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import {
  APRIL_2027_COHORT_ID,
  SEPTEMBER_2026_COHORT_ID,
} from "@/lib/cohorts";
import {
  attendedSessionIdsFromRecord,
  evaluateCertification,
  SEPTEMBER_2026_CERTIFICATION_RULE,
} from "@/lib/certification";
import { attendancePatchWithAudit } from "@/lib/attendanceAudit";
import { sessionLooksCancelled } from "@/lib/server/sessionCancelled";
import { sessionCohortId } from "@/lib/server/sessionCohortAccess";
import { AdminOpError } from "@/lib/server/admin/errors";
import { clearCohortLifecycleCache } from "@/lib/server/cohortLifecycle";
import { clearActiveCohortCache } from "@/lib/server/activeCohort";

export type CloseCohortPreviewRow = {
  uid: string;
  displayName: string;
  attendedCount: number;
  required: number;
  qualifies: boolean;
  alreadyCertified: boolean;
};

export type CloseCohortPreview = {
  cohortId: string;
  closingSessionId: string | null;
  countedSessionIds: string[];
  required: number;
  threshold: number;
  qualifying: CloseCohortPreviewRow[];
  oneSessionShort: CloseCohortPreviewRow[];
  others: number;
};

function newShareId(): string {
  return randomBytes(16).toString("hex");
}

async function loadCohortSessions(cohortId: string) {
  const snap = await adminDb().collection("sessions").get();
  return snap.docs
    .map((d) => {
      const data = d.data() as {
        title?: string;
        tags?: unknown;
        isClosing?: boolean;
        cohortId?: unknown;
      };
      return {
        id: d.id,
        title: String(data.title || ""),
        tags: data.tags,
        isClosing: data.isClosing === true || d.id === "sept-2026-hackathon",
        cancelled: sessionLooksCancelled(String(data.title || ""), data.tags),
        cohortId: data.cohortId,
      };
    })
    .filter((s) => sessionCohortId(s) === cohortId);
}

export async function previewCloseCohort(cohortId: string): Promise<CloseCohortPreview> {
  const cohortSnap = await adminDb().collection("cohorts").doc(cohortId).get();
  if (!cohortSnap.exists) throw new AdminOpError(`Cohort not found: ${cohortId}`, 404);
  const cohort = cohortSnap.data() || {};
  const threshold =
    typeof cohort.certificationThreshold === "number"
      ? cohort.certificationThreshold
      : 0.6;

  const sessions = await loadCohortSessions(cohortId);
  const closing = sessions.find((s) => s.isClosing) || null;
  const members = await adminDb()
    .collection("users")
    .where("cohortIds", "array-contains", cohortId)
    .get();

  const qualifying: CloseCohortPreviewRow[] = [];
  const oneSessionShort: CloseCohortPreviewRow[] = [];
  let others = 0;
  let required = 0;
  let countedSessionIds: string[] = [];

  for (const doc of members.docs) {
    if (doc.id.includes("@")) continue;
    const data = doc.data();
    if (data.role === "admin" || data.role === "moderator") continue;
    const att = await adminDb().collection("attendance").doc(doc.id).get();
    const evalr = evaluateCertification({
      sessions,
      attended: attendedSessionIdsFromRecord(
        att.exists ? (att.data() as Record<string, unknown>) : {}
      ),
      threshold,
    });
    required = evalr.required;
    countedSessionIds = evalr.countedSessionIds;
    const part = (data.cohortParticipation || {})[cohortId] as
      | { status?: string }
      | undefined;
    const row: CloseCohortPreviewRow = {
      uid: doc.id,
      displayName: String(data.displayName || ""),
      attendedCount: evalr.attendedCount,
      required: evalr.required,
      qualifies: evalr.qualifies,
      alreadyCertified: part?.status === "certified",
    };
    if (evalr.qualifies) qualifying.push(row);
    else if (evalr.shortfall === 1) oneSessionShort.push(row);
    else others += 1;
  }

  return {
    cohortId,
    closingSessionId: closing?.id ?? null,
    countedSessionIds,
    required,
    threshold,
    qualifying,
    oneSessionShort,
    others,
  };
}

export async function applyCohortCertification(opts: {
  cohortId: string;
  actorUid: string;
}): Promise<CloseCohortPreview & { written: number; skipped: number }> {
  const preview = await previewCloseCohort(opts.cohortId);
  const db = adminDb();
  const nowIso = new Date().toISOString();
  let written = 0;
  let skipped = 0;

  for (const row of preview.qualifying) {
    const userRef = db.collection("users").doc(row.uid);
    const userSnap = await userRef.get();
    const data = userSnap.data() || {};
    const participation = {
      ...(typeof data.cohortParticipation === "object" && data.cohortParticipation
        ? data.cohortParticipation
        : {}),
    } as Record<string, Record<string, unknown>>;
    const prev = participation[opts.cohortId] || {
      status: "participated",
      joinedAt: nowIso,
      role: "attendee",
    };
    if (prev.status === "certified" && prev.certificationRule) {
      skipped += 1;
    } else {
      participation[opts.cohortId] = {
        ...prev,
        status: "certified",
        certifiedAt: typeof prev.certifiedAt === "string" ? prev.certifiedAt : nowIso,
        certificationRule: SEPTEMBER_2026_CERTIFICATION_RULE,
        certificateShareId:
          typeof prev.certificateShareId === "string"
            ? prev.certificateShareId
            : newShareId(),
      };
      const shareId = String(participation[opts.cohortId].certificateShareId);
      await db.collection("certificateShares").doc(shareId).set(
        {
          uid: row.uid,
          cohortId: opts.cohortId,
          createdAt: nowIso,
        },
        { merge: true }
      );
      await userRef.set(
        {
          cohortParticipation: participation,
          userStatus: "certified",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      written += 1;
    }

    if (preview.closingSessionId) {
      const attRef = db.collection("attendance").doc(row.uid);
      const attSnap = await attRef.get();
      const existing = attSnap.exists ? (attSnap.data() as Record<string, unknown>) : {};
      if (existing[preview.closingSessionId] !== true) {
        await attRef.set(
          {
            ...attendancePatchWithAudit(
              preview.closingSessionId,
              true,
              opts.actorUid,
              "admin",
              existing,
              { cohortId: opts.cohortId, reason: "cohort-close-auto" }
            ),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }
  }

  return { ...preview, written, skipped };
}

export async function applyCloseCohort(opts: {
  cohortId: string;
  actorUid: string;
}): Promise<CloseCohortPreview & { written: number; skipped: number }> {
  const result = await applyCohortCertification(opts);
  const db = adminDb();
  const nowIso = new Date().toISOString();
  const preview = result;

  await db.collection("cohorts").doc(opts.cohortId).set(
    {
      status: "closed",
      isCurrent: false,
      closedAt: nowIso,
      closedBy: opts.actorUid,
      certificationThreshold: preview.threshold,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  if (opts.cohortId === SEPTEMBER_2026_COHORT_ID) {
    await ensureApril2027Cohort();
    await db.collection("cohorts").doc(APRIL_2027_COHORT_ID).set(
      { isCurrent: true, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  }

  await db.collection("cohortCloseRuns").doc(`${opts.cohortId}-${nowIso.slice(0, 10)}`).set(
    {
      cohortId: opts.cohortId,
      actorUid: opts.actorUid,
      qualifying: preview.qualifying.length,
      written: result.written,
      skipped: result.skipped,
      oneSessionShort: preview.oneSessionShort.length,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  clearCohortLifecycleCache();
  clearActiveCohortCache();
  return result;
}

export async function ensureApril2027Cohort() {
  const ref = adminDb().collection("cohorts").doc(APRIL_2027_COHORT_ID);
  const snap = await ref.get();
  const payload = {
    id: APRIL_2027_COHORT_ID,
    name: "April 2027 Cohort",
    displayName: "AI DevCamp — April 2027",
    title: "AI DevCamp — April 2027",
    status: "upcoming",
    isCurrent: true,
    startDate: "2027-04-01",
    certificationThreshold: 0.6,
    description: "Next AI DevCamp programme. Registration is open — you are on the waitlist.",
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!snap.exists) {
    await ref.set({ ...payload, createdAt: FieldValue.serverTimestamp() });
  } else {
    await ref.set(payload, { merge: true });
  }
  clearCohortLifecycleCache();
  clearActiveCohortCache();
}
