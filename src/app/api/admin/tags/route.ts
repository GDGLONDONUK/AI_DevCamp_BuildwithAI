/**
 * POST /api/admin/tags — seed or upsert tag categories (admin only).
 * Body: { "action": "seed" } — writes `TAG_CATALOG` to Firestore `tags/{id}`.
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { TAG_CATALOG } from "@/data/tagCatalog";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    if (body.action !== "seed") {
      return err('Expected body: { "action": "seed" }');
    }

    const now = new Date().toISOString();
    const db = adminDb();
    const batch = db.batch();

    for (const cat of TAG_CATALOG) {
      const ref = db.collection("tags").doc(cat.id);
      batch.set(
        ref,
        {
          label: cat.label,
          userField: cat.userField,
          values: cat.values,
          order: cat.order,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    await batch.commit();
    return ok({ upserted: TAG_CATALOG.length, ids: TAG_CATALOG.map((c) => c.id) });
  } catch (e) {
    logServerRouteException("POST /api/admin/tags", e);
    return err("Failed to seed tags", 500);
  }
}
