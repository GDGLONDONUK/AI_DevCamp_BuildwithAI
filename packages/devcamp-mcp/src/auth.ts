import { adminAuth } from "../../../src/lib/firebase-admin";
import { getActiveCohortId } from "../../../src/lib/cohorts";
import {
  actorEnrolledInCohort,
  isStaffRole,
  loadActiveProgrammeActor,
} from "../../../src/lib/access/programmeAccess";
import { resolveMcpAccessToken, type McpTokenScope } from "../../../src/lib/mcp/accessTokens";
import { getRequestCaller } from "./requestContext";

export type McpCaller = {
  uid: string;
  email?: string;
  role: string;
  cohortId: string;
  cohortIds: string[];
  isAdmin: boolean;
  enrolled: boolean;
  scopes: McpTokenScope[];
};

let envCached: { token: string; caller: McpCaller; expiresAt: number } | null = null;

function readEnvToken(): string {
  const raw =
    process.env.DEVCAMP_MCP_ACCESS_TOKEN?.trim() ||
    process.env.DEVCAMP_MCP_ID_TOKEN?.trim() ||
    process.env.FIREBASE_ID_TOKEN?.trim() ||
    "";
  if (!raw) {
    throw new Error(
      "Missing MCP token. Set DEVCAMP_MCP_ACCESS_TOKEN (from /mcp on the site) " +
        "or DEVCAMP_MCP_ID_TOKEN (Firebase ID token)."
    );
  }
  return raw.startsWith("Bearer ") ? raw.slice(7) : raw;
}

async function buildCaller(opts: {
  uid: string;
  email?: string;
  scopes: McpTokenScope[];
}): Promise<McpCaller> {
  const actor = await loadActiveProgrammeActor(opts.uid);
  const role = actor.role || "attendee";
  const isAdmin = isStaffRole(role);
  const cohortId =
    process.env.DEVCAMP_MCP_COHORT_ID?.trim() ||
    actor.activeCohortId ||
    getActiveCohortId();
  const cohortIds = actor.cohortIds;
  const enrolled = actorEnrolledInCohort({ role, cohortIds }, cohortId);

  let scopes = [...opts.scopes];
  if (scopes.includes("admin") && !isAdmin) {
    scopes = scopes.filter((s) => s !== "admin");
  }
  if (!scopes.includes("learning") && !scopes.includes("admin")) {
    scopes = ["learning"];
  }

  return {
    uid: opts.uid,
    email: opts.email || actor.email,
    role,
    cohortId,
    cohortIds,
    isAdmin,
    enrolled,
    scopes: [...new Set(scopes)],
  };
}

async function callerFromBearer(token: string): Promise<McpCaller> {
  const opaque = await resolveMcpAccessToken(token);
  if (opaque) {
    return buildCaller({
      uid: opaque.uid,
      email: opaque.email,
      scopes: opaque.scopes,
    });
  }
  const decoded = await adminAuth().verifyIdToken(token);
  return buildCaller({
    uid: decoded.uid,
    email: decoded.email,
    scopes: ["learning", "admin"],
  });
}

export async function resolveCaller(): Promise<McpCaller> {
  const fromRequest = getRequestCaller();
  if (fromRequest) return fromRequest;

  const token = readEnvToken();
  const now = Date.now();
  if (envCached && envCached.token === token && envCached.expiresAt > now) {
    return envCached.caller;
  }

  const caller = await callerFromBearer(token);
  envCached = { token, caller, expiresAt: now + 50 * 60 * 1000 };
  return caller;
}

export async function resolveCallerFromBearer(
  authorizationHeader: string | undefined
): Promise<McpCaller> {
  const raw = authorizationHeader?.trim() || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7).trim() : raw;
  if (!token) {
    throw new Error("Missing Authorization: Bearer <mcp-access-token or Firebase ID token>");
  }
  return callerFromBearer(token);
}

export function requireAuthenticated(caller: McpCaller): void {
  if (!caller.uid) throw new Error("Authentication required");
}

export function requireAttendee(caller: McpCaller): void {
  requireAuthenticated(caller);
  if (!caller.scopes.includes("learning") && !caller.scopes.includes("admin")) {
    throw new Error("Learning MCP scope required");
  }
  if (!caller.enrolled) {
    throw new Error(
      "Attendee tools require cohort enrolment. Join the programme on the site, " +
        "or use list_public_sessions for public schedule only."
    );
  }
}

export function requireAdmin(caller: McpCaller): void {
  if (!caller.isAdmin || !caller.scopes.includes("admin")) {
    throw new Error(
      "Forbidden — admin MCP scope required (mint an admin token on /mcp as admin/moderator)."
    );
  }
}
