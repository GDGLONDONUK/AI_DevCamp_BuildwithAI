import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "../../../src/lib/firebase-admin";
import {
  learningItemBelongsToCohort,
  resolveLearningTasksCohortId,
} from "../../../src/lib/learningTasksCohort";
import {
  deriveSessionOrder,
  serializeLearningTaskDoc,
  serializeLearningTemplateDoc,
} from "../../../src/lib/server/learningTasksFirestore";
import { requireAttendee, resolveCaller } from "./auth";
import { errResult, okResult } from "./json";

const progress = z.enum(["not_started", "in_progress", "done"]);
const priority = z.enum(["low", "medium", "high"]);

/**
 * Owner-scoped learning checklist tools (never cross-user).
 * Helps students find missing tasks and manage their own progress via any LLM.
 */
export function registerMyTaskTools(server: McpServer): void {
  server.registerTool(
    "list_my_learning_tasks",
    {
      description:
        "List the caller's private learning checklist for a cohort (progress, session, priority). Never returns other users' tasks.",
      inputSchema: {
        cohortId: z.string().optional(),
        progress: progress.optional(),
        sessionKey: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ cohortId, progress: progressFilter, sessionKey }) => {
      try {
        const caller = await resolveCaller();
        requireAttendee(caller);
        const cid = resolveLearningTasksCohortId(cohortId || caller.cohortId);
        const snap = await adminDb()
          .collection("learningTasks")
          .where("userId", "==", caller.uid)
          .orderBy("sessionOrder", "asc")
          .orderBy("sortOrder", "asc")
          .get();

        let tasks = snap.docs
          .map((d) => serializeLearningTaskDoc(d))
          .filter((row) =>
            learningItemBelongsToCohort(
              {
                cohortId: typeof row.cohortId === "string" ? row.cohortId : null,
                sessionKey: typeof row.sessionKey === "string" ? row.sessionKey : null,
              },
              cid
            )
          );

        if (progressFilter) {
          tasks = tasks.filter((t) => t.progress === progressFilter);
        }
        if (sessionKey) {
          tasks = tasks.filter((t) => t.sessionKey === sessionKey);
        }

        const summary = {
          not_started: tasks.filter((t) => t.progress === "not_started").length,
          in_progress: tasks.filter((t) => t.progress === "in_progress").length,
          done: tasks.filter((t) => t.progress === "done").length,
        };

        return okResult({ cohortId: cid, count: tasks.length, summary, tasks });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "list_missing_learning_tasks",
    {
      description:
        "Compare active programme templates to the caller's checklist and list missing / incomplete template tasks (gaps to import or finish).",
      inputSchema: {
        cohortId: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ cohortId }) => {
      try {
        const caller = await resolveCaller();
        requireAttendee(caller);
        const cid = resolveLearningTasksCohortId(cohortId || caller.cohortId);

        const [tplSnap, taskSnap] = await Promise.all([
          adminDb().collection("learningTaskTemplates").get(),
          adminDb().collection("learningTasks").where("userId", "==", caller.uid).get(),
        ]);

        const templates = tplSnap.docs
          .map((d) => serializeLearningTemplateDoc(d))
          .filter((t) => t.active !== false)
          .filter((t) =>
            learningItemBelongsToCohort(
              {
                cohortId: typeof t.cohortId === "string" ? t.cohortId : null,
                sessionKey: typeof t.sessionKey === "string" ? t.sessionKey : null,
              },
              cid
            )
          );

        const myTasks = taskSnap.docs.map((d) => serializeLearningTaskDoc(d));
        const byTemplateId = new Set(
          myTasks
            .map((t) => t.sourceTemplateId)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        );
        const byTitleKey = new Set(
          myTasks.map((t) => `${String(t.sessionKey)}::${String(t.title).toLowerCase()}`)
        );

        const missing = templates.filter((tpl) => {
          const id = String(tpl.id);
          if (byTemplateId.has(id)) return false;
          const key = `${String(tpl.sessionKey)}::${String(tpl.title).toLowerCase()}`;
          return !byTitleKey.has(key);
        });

        const incomplete = myTasks.filter(
          (t) =>
            learningItemBelongsToCohort(
              {
                cohortId: typeof t.cohortId === "string" ? t.cohortId : null,
                sessionKey: typeof t.sessionKey === "string" ? t.sessionKey : null,
              },
              cid
            ) && t.progress !== "done"
        );

        return okResult({
          cohortId: cid,
          missingTemplateCount: missing.length,
          incompleteTaskCount: incomplete.length,
          missingFromTemplates: missing.map((t) => ({
            templateId: t.id,
            title: t.title,
            sessionKey: t.sessionKey,
            sessionLabel: t.sessionLabel,
            category: t.category,
            notes: t.notes,
          })),
          incompleteTasks: incomplete.map((t) => ({
            id: t.id,
            title: t.title,
            progress: t.progress,
            sessionKey: t.sessionKey,
            sessionLabel: t.sessionLabel,
            priority: t.priority,
          })),
          tip: "Use import_missing_learning_tasks to copy missing templates into your checklist, then update_my_learning_task as you work.",
        });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "import_missing_learning_tasks",
    {
      description:
        "Copy missing active templates into the caller's private checklist (same as website import). Skips duplicates.",
      inputSchema: {
        cohortId: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
      annotations: { destructiveHint: false },
    },
    async ({ cohortId, limit }) => {
      try {
        const caller = await resolveCaller();
        requireAttendee(caller);
        const cid = resolveLearningTasksCohortId(cohortId || caller.cohortId);
        const cap = limit ?? 50;

        const [tplSnap, taskSnap] = await Promise.all([
          adminDb().collection("learningTaskTemplates").get(),
          adminDb().collection("learningTasks").where("userId", "==", caller.uid).get(),
        ]);

        const templates = tplSnap.docs
          .map((d) => serializeLearningTemplateDoc(d))
          .filter((t) => t.active !== false)
          .filter((t) =>
            learningItemBelongsToCohort(
              {
                cohortId: typeof t.cohortId === "string" ? t.cohortId : null,
                sessionKey: typeof t.sessionKey === "string" ? t.sessionKey : null,
              },
              cid
            )
          );

        const myTasks = taskSnap.docs.map((d) => serializeLearningTaskDoc(d));
        const byTemplateId = new Set(
          myTasks
            .map((t) => t.sourceTemplateId)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        );

        const toImport = templates
          .filter((tpl) => !byTemplateId.has(String(tpl.id)))
          .slice(0, cap);

        const created: string[] = [];
        const batch = adminDb().batch();
        const label = caller.email || caller.uid;

        for (const tpl of toImport) {
          const ref = adminDb().collection("learningTasks").doc();
          const sessionKey = String(tpl.sessionKey || "general");
          batch.set(ref, {
            userId: caller.uid,
            cohortId: cid,
            title: tpl.title,
            sessionKey,
            sessionLabel: tpl.sessionLabel || sessionKey,
            sessionOrder:
              typeof tpl.sessionOrder === "number"
                ? tpl.sessionOrder
                : deriveSessionOrder(sessionKey),
            category: tpl.category || "other",
            priority: "medium",
            progress: "not_started",
            dueDate: null,
            notes: typeof tpl.notes === "string" ? tpl.notes : "",
            sourceTemplateId: tpl.id,
            sortOrder: typeof tpl.sortOrder === "number" ? tpl.sortOrder : Date.now(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdByUid: caller.uid,
            createdByLabel: label,
            updatedByUid: caller.uid,
            updatedByLabel: label,
          });
          created.push(ref.id);
        }

        if (created.length > 0) await batch.commit();

        return okResult({
          cohortId: cid,
          imported: created.length,
          taskIds: created,
        });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "create_my_learning_task",
    {
      description: "Create a private learning task for the signed-in caller only.",
      inputSchema: {
        title: z.string().min(1).max(500),
        sessionKey: z.string().max(120).optional(),
        sessionLabel: z.string().max(200).optional(),
        sessionOrder: z.number().int().min(0).max(999).optional(),
        category: z.string().max(80).optional(),
        priority: priority.optional(),
        progress: progress.optional(),
        notes: z.string().max(5000).optional(),
        dueDate: z.string().optional().describe("ISO date string"),
        cohortId: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const caller = await resolveCaller();
        requireAttendee(caller);
        const sessionKey = args.sessionKey?.trim() || "general";
        const sessionLabel = args.sessionLabel?.trim() || "General";
        const cohortId = resolveLearningTasksCohortId(args.cohortId || caller.cohortId);
        const label = caller.email || caller.uid;

        const task = {
          userId: caller.uid,
          cohortId,
          title: args.title.trim(),
          sessionKey,
          sessionLabel,
          sessionOrder: deriveSessionOrder(sessionKey, args.sessionOrder),
          category: args.category || "other",
          priority: args.priority || "medium",
          progress: args.progress || "not_started",
          dueDate: args.dueDate ? Timestamp.fromDate(new Date(args.dueDate)) : null,
          notes: args.notes ?? "",
          sourceTemplateId: null,
          sortOrder: Date.now(),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdByUid: caller.uid,
          createdByLabel: label,
          updatedByUid: caller.uid,
          updatedByLabel: label,
        };

        const ref = await adminDb().collection("learningTasks").add(task);
        const created = await ref.get();
        return okResult(serializeLearningTaskDoc(created));
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "update_my_learning_task",
    {
      description:
        "Update the caller's own learning task (progress, notes, priority, due date). Cannot change another user's tasks.",
      inputSchema: {
        id: z.string().min(1),
        title: z.string().min(1).max(500).optional(),
        progress: progress.optional(),
        priority: priority.optional(),
        notes: z.string().max(5000).optional(),
        dueDate: z
          .union([z.string(), z.null()])
          .optional()
          .describe("ISO date or null to clear"),
        category: z.string().max(80).optional(),
      },
    },
    async (args) => {
      try {
        const caller = await resolveCaller();
        requireAttendee(caller);
        const ref = adminDb().collection("learningTasks").doc(args.id);
        const snap = await ref.get();
        if (!snap.exists) return errResult(`Task not found: ${args.id}`);
        if (snap.data()?.userId !== caller.uid) {
          return errResult("Forbidden — not your task");
        }

        const update: Record<string, unknown> = {
          updatedAt: FieldValue.serverTimestamp(),
          updatedByUid: caller.uid,
          updatedByLabel: caller.email || caller.uid,
        };
        if (args.title !== undefined) update.title = args.title;
        if (args.progress !== undefined) update.progress = args.progress;
        if (args.priority !== undefined) update.priority = args.priority;
        if (args.notes !== undefined) update.notes = args.notes;
        if (args.category !== undefined) update.category = args.category;
        if (args.dueDate !== undefined) {
          update.dueDate =
            args.dueDate === null ? null : Timestamp.fromDate(new Date(args.dueDate));
        }
        if (Object.keys(update).length <= 3) {
          return errResult("No fields to update");
        }

        await ref.update(update);
        return okResult(serializeLearningTaskDoc(await ref.get()));
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
