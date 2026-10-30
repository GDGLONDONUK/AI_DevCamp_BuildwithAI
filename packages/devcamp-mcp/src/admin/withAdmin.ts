/**
 * Admin MCP tools call the same server modules as `/api/*` (Admin SDK).
 * Auth: live staff role + admin scope on the MCP token — not a Firebase ID token,
 * so tools cannot HTTP-loopback to Next routes. Dual gate: MCP requireAdmin here,
 * HTTP requireAdmin(req) on the matching route.
 */
import type { McpCaller } from "../auth";
import { requireAdmin, resolveCaller } from "../auth";
import { errResult, okResult } from "../json";

export function withAdmin<T extends Record<string, unknown> | undefined>(
  fn: (caller: McpCaller, args: T) => Promise<unknown>
) {
  return async (args: T) => {
    try {
      const caller = await resolveCaller();
      requireAdmin(caller);
      return okResult(await fn(caller, args ?? ({} as T)));
    } catch (e) {
      return errResult(e instanceof Error ? e.message : String(e));
    }
  };
}
