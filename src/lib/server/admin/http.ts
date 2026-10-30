import { err } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { isAdminOpError } from "@/lib/server/admin/errors";

/** Map AdminOpError to an HTTP error; log unexpected failures. */
export function adminRouteError(label: string, e: unknown, fallback: string) {
  if (isAdminOpError(e)) return err(e.message, e.status);
  logServerRouteException(label, e);
  return err(fallback, 500);
}
