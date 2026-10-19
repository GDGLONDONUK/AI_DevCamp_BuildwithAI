/**
 * Create (or refresh) a normal attendee test account and probe MCP role scope.
 *
 * Email / password are NEVER hardcoded — pass via env or CLI (see AGENTS.md,
 * .claude/skills/learning-chat/SKILL.md). Do not commit probe credentials.
 *
 * Usage (repo root):
 *   npx tsx --env-file=.env.local scripts/mcp-probe-attendee-access.ts --email=YOU@example.com
 *
 * Env (preferred for local ops):
 *   DEVCAMP_MCP_PROBE_EMAIL
 *   DEVCAMP_MCP_PROBE_PASSWORD   (optional — random if omitted)
 *
 * Flags:
 *   --email=...
 *   --password=...
 *   --keep-password   print generated password once (still never commit it)
 *
 * Does NOT print MCP token secrets (only pass/fail of probes).
 */

import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../src/lib/firebase-admin";
import { getActiveCohortId } from "../src/lib/cohorts";
import { mintMcpAccessToken } from "../src/lib/mcp/accessTokens";
import {
  requireAdmin,
  requireAttendee,
  resolveCallerFromBearer,
  scopesForLiveRole,
} from "../packages/devcamp-mcp/src/auth";
import { isStaffRole } from "../src/lib/access/programmeAccess";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

type Probe = { name: string; ok: boolean; detail: string };

async function ensureAttendeeUser(email: string, password: string) {
  const auth = adminAuth();
  const db = adminDb();
  const cohortId = getActiveCohortId();
  let uid: string;

  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { password, emailVerified: true, disabled: false });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code !== "auth/user-not-found") throw e;
    const created = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: "MCP Probe Attendee",
      disabled: false,
    });
    uid = created.uid;
  }

  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        uid,
        email,
        displayName: "MCP Probe Attendee",
        role: "attendee",
        userStatus: "participated",
        cohortIds: [cohortId],
        activeCohortId: cohortId,
        accountDisabled: false,
        programOptOut: false,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return { uid, cohortId };
}

async function main() {
  const email = (
    arg("email") ||
    process.env.DEVCAMP_MCP_PROBE_EMAIL ||
    ""
  )
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    console.error(
      "Missing probe email. Set DEVCAMP_MCP_PROBE_EMAIL in .env.local " +
        "(or pass --email=...). See AGENTS.md / learning-chat skill. " +
        "Never commit probe emails or passwords."
    );
    process.exit(1);
  }

  const password =
    arg("password")?.trim() ||
    process.env.DEVCAMP_MCP_PROBE_PASSWORD?.trim() ||
    `${randomBytes(18).toString("base64url")}Aa1!`;
  const keepPassword = hasFlag("keep-password");

  console.log(JSON.stringify({ step: "ensure_attendee", emailSet: true }, null, 2));
  const { uid, cohortId } = await ensureAttendeeUser(email, password);

  let mintAdminBlocked = false;
  try {
    await mintMcpAccessToken({
      uid,
      email,
      role: "attendee",
      scopes: ["admin"],
      createdByUid: uid,
      label: "probe-should-fail",
      ttlHours: 1,
    });
  } catch {
    mintAdminBlocked = true;
  }

  const learning = await mintMcpAccessToken({
    uid,
    email,
    role: "attendee",
    scopes: ["learning"],
    createdByUid: uid,
    label: "probe-attendee-learning",
    ttlHours: 2,
  });

  const caller = await resolveCallerFromBearer(`Bearer ${learning.token}`);
  const probes: Probe[] = [];

  probes.push({
    name: "role_is_attendee",
    ok: caller.role === "attendee" && !caller.isAdmin && !isStaffRole(caller.role),
    detail: `role=${caller.role} isAdmin=${caller.isAdmin}`,
  });

  probes.push({
    name: "scopes_learning_only",
    ok:
      caller.scopes.includes("learning") &&
      !caller.scopes.includes("admin") &&
      scopesForLiveRole(["learning", "admin"], "attendee").join(",") === "learning",
    detail: `scopes=${JSON.stringify(caller.scopes)}`,
  });

  probes.push({
    name: "enrolled_in_active_cohort",
    ok: caller.enrolled && caller.cohortId === cohortId,
    detail: `enrolled=${caller.enrolled} cohortId=${caller.cohortId}`,
  });

  probes.push({
    name: "mint_admin_scope_blocked",
    ok: mintAdminBlocked,
    detail: mintAdminBlocked ? "mint rejected" : "UNEXPECTED: admin mint succeeded",
  });

  let attendeeGateOk = false;
  try {
    requireAttendee(caller);
    attendeeGateOk = true;
  } catch (e) {
    probes.push({
      name: "requireAttendee",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    });
  }
  if (attendeeGateOk) {
    probes.push({ name: "requireAttendee", ok: true, detail: "allowed" });
  }

  let adminBlocked = false;
  let adminMsg = "";
  try {
    requireAdmin(caller);
  } catch (e) {
    adminBlocked = true;
    adminMsg = e instanceof Error ? e.message : String(e);
  }
  probes.push({
    name: "requireAdmin_blocked",
    ok: adminBlocked,
    detail: adminBlocked ? adminMsg : "UNEXPECTED: admin gate passed for attendee",
  });

  const forged = await mintMcpAccessToken({
    uid,
    email,
    role: "attendee",
    scopes: ["learning"],
    createdByUid: uid,
    label: "probe-forged-base",
    ttlHours: 1,
  });
  await adminDb().collection("mcpAccessTokens").doc(forged.tokenId).update({
    scopes: ["learning", "admin"],
  });
  const forgedCaller = await resolveCallerFromBearer(`Bearer ${forged.token}`);
  let forgedAdminBlocked = false;
  try {
    requireAdmin(forgedCaller);
  } catch {
    forgedAdminBlocked = true;
  }
  probes.push({
    name: "stale_admin_scope_stripped",
    ok:
      forgedAdminBlocked &&
      !forgedCaller.scopes.includes("admin") &&
      !forgedCaller.isAdmin,
    detail: `scopes=${JSON.stringify(forgedCaller.scopes)} isAdmin=${forgedCaller.isAdmin}`,
  });

  for (const id of [learning.tokenId, forged.tokenId]) {
    await adminDb().collection("mcpAccessTokens").doc(id).update({
      revoked: true,
      revokedAt: FieldValue.serverTimestamp(),
    });
  }

  const failed = probes.filter((p) => !p.ok);
  const report: Record<string, unknown> = {
    ok: failed.length === 0,
    uid,
    cohortId,
    probes,
    failed: failed.map((p) => p.name),
    notes: [
      "Probe email/password come from env or CLI only — never commit them.",
      "Attendee can use learning/public MCP tools when enrolled.",
      "Attendee cannot pass requireAdmin even with a forged admin scope on the token doc.",
    ],
  };
  if (keepPassword) {
    report.password = password;
    report.warning = "Password printed once for local ops — do not commit or paste into the repo.";
  }

  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
