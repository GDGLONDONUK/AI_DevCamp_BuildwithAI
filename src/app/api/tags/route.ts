/**
 * GET /api/tags — public list of tag categories (for forms, filters).
 * Reads from Firestore `tags` collection via Admin SDK.
 */

import { adminDb } from "@/lib/firebase-admin";
import { ok, err } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { TagCategoryDocument } from "@/types";

export async function GET() {
  try {
    const snap = await adminDb()
      .collection("tags")
      .orderBy("order", "asc")
      .get();

    const list: TagCategoryDocument[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        label: data.label ?? d.id,
        userField: data.userField ?? "",
        values: Array.isArray(data.values) ? data.values : [],
        order: typeof data.order === "number" ? data.order : 0,
        updatedAt: data.updatedAt,
      };
    });

    return ok(list);
  } catch (e) {
    logServerRouteException("GET /api/tags", e);
    return err("Failed to load tags", 500);
  }
}
