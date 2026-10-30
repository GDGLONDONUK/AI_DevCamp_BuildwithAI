import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listMaterialsForCohort,
  upsertLearningMaterial,
} from "../../../../src/lib/learning-chat/materialsRepoCore";
import { withAdmin } from "./withAdmin";

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

export function registerAdminMaterialTools(server: McpServer): void {
  server.registerTool(
    "admin_list_learning_materials",
    {
      description:
        "Admin/moderator only. List RAG corpus materials. Same as GET /api/admin/learning-materials.",
      inputSchema: {
        cohortId: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    withAdmin(async (caller, { cohortId }) => {
      const cid = cohortId || caller.cohortId;
      const materials = await listMaterialsForCohort(cid);
      return {
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
      };
    })
  );

  server.registerTool(
    "admin_upsert_learning_material",
    {
      description:
        "Admin/moderator only. Create or update a sessionLearningMaterials doc. Same as PUT /api/admin/learning-materials.",
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
    withAdmin(async (caller, args) =>
      upsertLearningMaterial(
        {
          ...args,
          cohortId: args.cohortId || caller.cohortId,
          url: args.url && args.url.length > 0 ? args.url : undefined,
        },
        caller.uid
      )
    )
  );
}
