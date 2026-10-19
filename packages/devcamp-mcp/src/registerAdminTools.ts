import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "../../../src/lib/firebase-admin";
import { getActiveCohortId, SPRING_2026_COHORT_ID } from "../../../src/lib/cohorts";
import {
  listMaterialsForCohort,
  upsertLearningMaterial,
} from "../../../src/lib/learning-chat/materialsRepoCore";
import { requireAdmin, resolveCaller } from "./auth";
import { errResult, okResult } from "./json";
import type { DocumentData, Query } from "firebase-admin/firestore";

const userStatus = z.enum([
  "pending",
  "participated",
  "certified",
  "outstanding",
  "not-certified",
  "failed",
]);

const userRole = z.enum(["attendee", "moderator", "admin"]);

const assignmentStatus = z.enum(["submitted", "reviewed", "approved"]);

const materialKind = z.enum([
  "session_summary",
  "transcript",
  "pdf",
  "video",
  "slides",
  "concept",
  "notes",
  "resource",
]);

function serializeDoc(id: string, data: DocumentData): Record<string, unknown> {
  return { id, ...data };
}

export function registerAdminTools(server: McpServer): void {
  server.registerTool(
    "whoami",
    {
      description: "Return the authenticated MCP caller (uid, email, role, cohort).",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const caller = await resolveCaller();
        return okResult({
          uid: caller.uid,
          email: caller.email ?? null,
          role: caller.role,
          isAdmin: caller.isAdmin,
          enrolled: caller.enrolled,
          scopes: caller.scopes,
          cohortId: caller.cohortId,
          cohortIds: caller.cohortIds,
          activeCohortDefault: getActiveCohortId(),
          tiers: {
            public: true,
            attendee: caller.enrolled,
            admin: caller.isAdmin && caller.scopes.includes("admin"),
          },
          dataSource: "firestore (not seed files)",
        });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── Users ──────────────────────────────────────────────────────────────

  server.registerTool(
    "admin_list_users",
    {
      description:
        "Admin/moderator only. List users (optional status + text search on name/email/handle). Caps at `limit` (default 40).",
      inputSchema: {
        status: userStatus.optional(),
        search: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        cohortId: z.string().optional().describe("Filter users whose cohortIds includes this id"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ status, search, limit, cohortId }) => {
      try {
        const caller = await resolveCaller();
        requireAdmin(caller);
        const cap = limit ?? 40;
        let query: Query = adminDb().collection("users").orderBy("createdAt", "desc");
        if (status) query = query.where("userStatus", "==", status);
        const snap = await query.limit(Math.min(cap * 3, 500)).get();
        let users = snap.docs.map((d) => serializeDoc(d.id, d.data()));
        const term = search?.toLowerCase().trim();
        if (term) {
          users = users.filter((u) => {
            const name = String(u.displayName ?? "").toLowerCase();
            const email = String(u.email ?? "").toLowerCase();
            const handle = String(u.handle ?? "").toLowerCase();
            return name.includes(term) || email.includes(term) || handle.includes(term);
          });
        }
        if (cohortId) {
          users = users.filter((u) => {
            const ids = u.cohortIds;
            return Array.isArray(ids) && ids.includes(cohortId);
          });
        }
        users = users.slice(0, cap);
        return okResult({ count: users.length, users });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "admin_get_user",
    {
      description: "Admin/moderator only. Get one user profile by uid or email document id.",
      inputSchema: {
        uid: z.string().min(1).describe("Firestore users document id (Auth uid or email for pending)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ uid }) => {
      try {
        const caller = await resolveCaller();
        requireAdmin(caller);
        const snap = await adminDb().collection("users").doc(uid).get();
        if (!snap.exists) return errResult(`User not found: ${uid}`);
        return okResult(serializeDoc(snap.id, snap.data()!));
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "admin_update_user",
    {
      description:
        "Admin/moderator only. Update privileged user fields (status, role, opt-out, cohort tags) and/or profile fields.",
      inputSchema: {
        uid: z.string().min(1),
        userStatus: userStatus.optional(),
        role: userRole.optional(),
        programOptOut: z.boolean().optional(),
        accountDisabled: z.boolean().optional(),
        displayName: z.string().max(200).optional(),
        cohortIds: z.array(z.string()).optional(),
        activeCohortId: z.string().optional(),
      },
      annotations: { destructiveHint: true },
    },
    async (args) => {
      try {
        const caller = await resolveCaller();
        requireAdmin(caller);
        const { uid, ...fields } = args;
        const update: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fields)) {
          if (v !== undefined) update[k] = v;
        }
        if (Object.keys(update).length === 0) {
          return errResult("No fields to update");
        }
        if (update.programOptOut === true && update.programOptOutAt === undefined) {
          update.programOptOutAt = new Date().toISOString();
        }
        if (update.programOptOut === false) {
          update.programOptOutAt = FieldValue.delete();
        }
        update.updatedAt = FieldValue.serverTimestamp();
        const ref = adminDb().collection("users").doc(uid);
        const existing = await ref.get();
        if (!existing.exists) return errResult(`User not found: ${uid}`);
        await ref.update(update);
        const updated = await ref.get();
        return okResult(serializeDoc(updated.id, updated.data()!));
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── Sessions ───────────────────────────────────────────────────────────

  server.registerTool(
    "admin_list_sessions",
    {
      description:
        "Admin/moderator only. List sessions; optional cohort filter (defaults to active cohort).",
      inputSchema: {
        cohortId: z.string().optional(),
        allCohorts: z.boolean().optional().describe("If true, return every session"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ cohortId, allCohorts }) => {
      try {
        const caller = await resolveCaller();
        requireAdmin(caller);
        const snap = await adminDb().collection("sessions").orderBy("number", "asc").get();
        let sessions = snap.docs.map((d) => serializeDoc(d.id, d.data()));
        if (!allCohorts) {
          const cid = cohortId || caller.cohortId;
          sessions = sessions.filter(
            (s) =>
              (s.cohortId as string | undefined) === cid ||
              (!s.cohortId && cid === SPRING_2026_COHORT_ID)
          );
        }
        return okResult({ count: sessions.length, sessions });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "admin_upsert_session",
    {
      description:
        "Admin/moderator only. Create or merge-update a session document. Requires id + title + number for creates.",
      inputSchema: {
        id: z.string().min(1),
        title: z.string().min(1).optional(),
        number: z.number().optional(),
        date: z.string().optional(),
        time: z.string().optional(),
        week: z.number().optional(),
        topic: z.string().optional(),
        description: z.string().optional(),
        cohortId: z.string().optional(),
        videoUrl: z.string().optional(),
        resourcesFolderUrl: z.string().optional(),
        isKickoff: z.boolean().optional(),
        isClosing: z.boolean().optional(),
        whatYouWillLearn: z.array(z.string()).optional(),
        buildIdeas: z.array(z.string()).optional(),
        resources: z
          .array(z.object({ title: z.string(), url: z.string() }))
          .optional(),
        merge: z
          .boolean()
          .optional()
          .describe("Default true — merge fields. Set false to replace document."),
      },
      annotations: { destructiveHint: true },
    },
    async (args) => {
      try {
        const caller = await resolveCaller();
        requireAdmin(caller);
        const { id, merge = true, ...fields } = args;
        const ref = adminDb().collection("sessions").doc(id);
        const existing = await ref.get();
        const now = new Date().toISOString();
        const payload: Record<string, unknown> = {
          ...fields,
          id,
          updatedAt: now,
        };
        if (!existing.exists) {
          if (!fields.title || typeof fields.number !== "number") {
            return errResult("New session requires title and number");
          }
          payload.createdAt = now;
          if (!payload.cohortId) payload.cohortId = caller.cohortId;
          await ref.set(payload);
        } else {
          const cleaned = Object.fromEntries(
            Object.entries(payload).filter(([, v]) => v !== undefined)
          );
          if (merge) await ref.set(cleaned, { merge: true });
          else await ref.set({ ...existing.data(), ...cleaned, id });
        }
        const updated = await ref.get();
        return okResult(serializeDoc(updated.id, updated.data()!));
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── Assignments ────────────────────────────────────────────────────────

  server.registerTool(
    "admin_list_assignments",
    {
      description:
        "Admin/moderator only. List assignments; filter by userId, sessionId, or status. Caps at `limit`.",
      inputSchema: {
        userId: z.string().optional(),
        sessionId: z.string().optional(),
        status: assignmentStatus.optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ userId, sessionId, status, limit }) => {
      try {
        const caller = await resolveCaller();
        requireAdmin(caller);
        const cap = limit ?? 50;
        let query: Query = adminDb().collection("assignments");
        if (userId) query = query.where("userId", "==", userId);
        else if (sessionId) query = query.where("sessionId", "==", sessionId);
        else if (status) query = query.where("status", "==", status);
        const snap = await query.limit(cap).get();
        let assignments = snap.docs.map((d) => serializeDoc(d.id, d.data()));
        if (userId && sessionId) {
          assignments = assignments.filter((a) => a.sessionId === sessionId);
        }
        if (status && (userId || sessionId)) {
          assignments = assignments.filter((a) => a.status === status);
        }
        return okResult({ count: assignments.length, assignments });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "admin_get_assignment",
    {
      description: "Admin/moderator only. Get one assignment by document id.",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      try {
        const caller = await resolveCaller();
        requireAdmin(caller);
        const snap = await adminDb().collection("assignments").doc(id).get();
        if (!snap.exists) return errResult(`Assignment not found: ${id}`);
        return okResult(serializeDoc(snap.id, snap.data()!));
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "admin_update_assignment",
    {
      description:
        "Admin/moderator only. Update assignment review fields (status, feedback, grade).",
      inputSchema: {
        id: z.string().min(1),
        status: assignmentStatus.optional(),
        feedback: z.string().max(5000).optional(),
        grade: z.string().max(80).optional(),
      },
      annotations: { destructiveHint: true },
    },
    async ({ id, status, feedback, grade }) => {
      try {
        const caller = await resolveCaller();
        requireAdmin(caller);
        const update: Record<string, unknown> = {
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (status !== undefined) update.status = status;
        if (feedback !== undefined) update.feedback = feedback;
        if (grade !== undefined) update.grade = grade;
        if (Object.keys(update).length <= 1) {
          return errResult("Provide status, feedback, and/or grade");
        }
        const ref = adminDb().collection("assignments").doc(id);
        if (!(await ref.get()).exists) return errResult(`Assignment not found: ${id}`);
        await ref.update(update);
        const updated = await ref.get();
        return okResult(serializeDoc(updated.id, updated.data()!));
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── Learning materials (admin write) ───────────────────────────────────

  server.registerTool(
    "admin_list_learning_materials",
    {
      description: "Admin/moderator only. List RAG corpus materials for a cohort.",
      inputSchema: {
        cohortId: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ cohortId }) => {
      try {
        const caller = await resolveCaller();
        requireAdmin(caller);
        const cid = cohortId || caller.cohortId;
        const materials = await listMaterialsForCohort(cid);
        return okResult({
          cohortId: cid,
          count: materials.length,
          materials: materials.map((m) => ({
            id: m.id,
            sessionId: m.sessionId,
            title: m.title,
            kind: m.kind,
            url: m.url,
            concepts: m.concepts,
            textPreview: m.textContent.slice(0, 200),
            updatedAt: m.updatedAt,
          })),
        });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "admin_upsert_learning_material",
    {
      description:
        "Admin/moderator only. Create or update a sessionLearningMaterials doc (RAG corpus).",
      inputSchema: {
        id: z.string().max(160).optional(),
        sessionId: z.string().min(1),
        cohortId: z.string().min(1).optional(),
        title: z.string().min(1).max(300),
        kind: materialKind,
        textContent: z.string().min(1).max(200_000),
        url: z.string().max(2000).optional(),
        concepts: z.array(z.string().max(120)).max(40).optional(),
        week: z.number().int().min(0).max(12).optional(),
        sessionTitle: z.string().max(300).optional(),
        sessionTopic: z.string().max(200).optional(),
      },
      annotations: { destructiveHint: true },
    },
    async (args) => {
      try {
        const caller = await resolveCaller();
        requireAdmin(caller);
        const saved = await upsertLearningMaterial(
          {
            ...args,
            cohortId: args.cohortId || caller.cohortId,
            url: args.url && args.url.length > 0 ? args.url : undefined,
          },
          caller.uid
        );
        return okResult(saved);
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
