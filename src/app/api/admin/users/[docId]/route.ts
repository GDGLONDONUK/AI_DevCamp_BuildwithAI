/**
 * DELETE /api/admin/users/[docId]
 *
 * Removes `users/{docId}` (Firestore document id = Auth uid or email-keyed pending row).
 * Query: ?auth=1 — also delete Firebase Auth user (when resolvable) and attendance/{uid}.
 *
 * Requires: admin role (not moderator — matches Firestore security rules for user delete).
 */

import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { ok, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";

type Params = { params: Promise<{ docId: string }> };

function isEmailDocId(id: string): boolean {
  return id.includes("@");
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;
  if (auth.role !== "admin") {
    return err("Forbidden — only admins can delete users", 403);
  }

  const { docId: rawDocId } = await params;
  const docId = decodeURIComponent(rawDocId);
  const deleteAuthUser = request.nextUrl.searchParams.get("auth") === "1";

  const db = adminDb();
  const ref = db.collection("users").doc(docId);

  try {
    const snap = await ref.get();
    if (!snap.exists) {
      return err("User document not found", 404);
    }

    const data = snap.data() as Record<string, unknown> | undefined;
    const uidFromDoc =
      typeof data?.uid === "string" && (data.uid as string).length > 0 ? (data.uid as string) : null;

    let authUid: string | null = null;
    if (!isEmailDocId(docId)) {
      authUid = docId;
    } else if (uidFromDoc) {
      authUid = uidFromDoc;
    } else {
      try {
        const rec = await adminAuth().getUserByEmail(docId.toLowerCase());
        authUid = rec.uid;
      } catch {
        authUid = null;
      }
    }

    await ref.delete();

    if (deleteAuthUser && authUid) {
      try {
        await adminAuth().deleteUser(authUid);
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code !== "auth/user-not-found") {
          logServerRouteException(`DELETE /api/admin/users/${docId} (auth)`, e);
        }
      }
      try {
        await db.collection("attendance").doc(authUid).delete();
      } catch {
        /* optional cleanup */
      }
    }

    return ok({ deleted: true });
  } catch (e) {
    logServerRouteException(`DELETE /api/admin/users/${docId}`, e);
    return err("Failed to delete user", 500);
  }
}
