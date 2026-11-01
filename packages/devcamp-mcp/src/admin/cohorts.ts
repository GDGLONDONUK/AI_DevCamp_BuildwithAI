import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SEPTEMBER_2026_COHORT_ID } from "../../../../src/lib/cohorts";
import { applyCloseCohort, previewCloseCohort } from "../../../../src/lib/server/closeCohort";
import { bulkIssueCohortCertificates } from "../../../../src/lib/server/admin/certifierOps";
import { withAdmin } from "./withAdmin";

export function registerAdminCohortTools(server: McpServer): void {
  server.registerTool(
    "admin_preview_close_cohort",
    {
      description:
        "Admin/moderator only. Preview the 60% certification rule for a cohort. Does not write.",
      inputSchema: {
        cohortId: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    withAdmin(async (_caller, args) =>
      previewCloseCohort(args.cohortId || SEPTEMBER_2026_COHORT_ID)
    )
  );

  server.registerTool(
    "admin_close_cohort",
    {
      description:
        "Admin/moderator only. Close a cohort: stamp closing-day attendance, set per-cohort certified status, move enrolment to April 2027. Idempotent. Does not issue Credsverse credentials or send email. Requires confirm=true.",
      inputSchema: {
        cohortId: z.string().optional(),
        confirm: z.boolean(),
      },
      annotations: { destructiveHint: true },
    },
    withAdmin(async (caller, args) => {
      if (args.confirm !== true) {
        throw new Error("Pass confirm=true after reviewing admin_preview_close_cohort");
      }
      return applyCloseCohort({
        cohortId: args.cohortId || SEPTEMBER_2026_COHORT_ID,
        actorUid: caller.uid,
      });
    })
  );

  server.registerTool(
    "admin_issue_cohort_certificates",
    {
      description:
        "Admin/moderator only. Issue Credsverse credentials for certified members of a cohort. Default dryRun=true (no send). skipIfExists is per-cohort so June credentials are never reused.",
      inputSchema: {
        cohortId: z.string().optional(),
        dryRun: z.boolean().optional(),
      },
      annotations: { destructiveHint: true },
    },
    withAdmin(async (caller, args) =>
      bulkIssueCohortCertificates({
        cohortId: args.cohortId || SEPTEMBER_2026_COHORT_ID,
        actorUid: caller.uid,
        dryRun: args.dryRun !== false,
      })
    )
  );
}
