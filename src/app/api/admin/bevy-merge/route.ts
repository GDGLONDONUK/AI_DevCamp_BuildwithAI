import { NextRequest } from "next/server";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import type { BevyCsvRow } from "@/lib/admin/bevyMerge";
import { computeBevyMergePlan } from "@/lib/admin/bevyMerge";

const BATCH_MAX = 450;

/**
 * POST /api/admin/bevy-merge
 * Reconciles Bevy export rows with all `users` documents: sets `bevyRegisteredAt` /
 * `bevyNameSnapshot` on matches; creates pending `users/{email}` for people on Bevy only.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const bevyRows: BevyCsvRow[] = body.bevyRows;
    if (!Array.isArray(bevyRows) || bevyRows.length === 0) {
      return err("bevyRows must be a non-empty array", 400);
    }

    const db = adminDb();
    const snap = await db.collection("users").get();
    const appDocs = snap.docs.map((d) => ({
      id: d.id,
      data: d.data() as Record<string, unknown>,
    }));

    const plan = computeBevyMergePlan(bevyRows, appDocs);

    const ops: { ref: DocumentReference; data: Record<string, unknown> }[] = [];

    for (const u of plan.toUpdate) {
      ops.push({
        ref: db.collection("users").doc(u.firestoreId),
        data: {
          ...u.payload,
          updatedAt: FieldValue.serverTimestamp(),
        },
      });
    }
    for (const c of plan.toCreate) {
      const p = { ...c.payload, updatedAt: FieldValue.serverTimestamp() };
      ops.push({
        ref: db.collection("users").doc(c.firestoreId),
        data: p,
      });
    }

    for (let i = 0; i < ops.length; i += BATCH_MAX) {
      const batch = db.batch();
      for (const op of ops.slice(i, i + BATCH_MAX)) {
        batch.set(op.ref, op.data, { merge: true });
      }
      await batch.commit();
    }

    return ok({
      plan: {
        inAppNotInBevy: plan.inAppNotInBevy,
        inBevyNotInApp: plan.inBevyNotInApp,
        nameMismatches: plan.nameMismatches,
        stats: plan.stats,
      },
      written: { updated: plan.toUpdate.length, created: plan.toCreate.length },
    });
  } catch (e) {
    logServerRouteException("POST /api/admin/bevy-merge", e);
    return err("Bevy merge failed", 500);
  }
}
