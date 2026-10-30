import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  issueCertifierCredential,
  syncCertifierCredentials,
} from "../../../../src/lib/server/admin/certifierOps";
import { withAdmin } from "./withAdmin";

export function registerAdminCertifierTools(server: McpServer): void {
  server.registerTool(
    "admin_sync_certifier",
    {
      description:
        "Admin/moderator only. Same as POST /api/admin/certifier/sync. Looks up existing Credsverse credentials by email and stores ids on the user. Does NOT issue a new certificate (no Certifier quota). Pass email or uids; default is all certified attendees.",
      inputSchema: {
        email: z.string().email().optional(),
        uids: z.array(z.string().min(1)).max(50).optional(),
        certifiedOnly: z.boolean().optional(),
      },
      annotations: { destructiveHint: true },
    },
    withAdmin(async (_caller, args) => syncCertifierCredentials(args))
  );

  server.registerTool(
    "admin_issue_certificate",
    {
      description:
        "Admin/moderator only. Same as POST /api/admin/certifier/issue. Creates, issues, and emails a Credsverse credential (counts against Certifier annual quota, free plan 250/year). If one already exists, links it instead. Also sets userStatus=certified unless markCertified=false. Requires CERTIFIER_API_TOKEN and CERTIFIER_GROUP_ID.",
      inputSchema: {
        uid: z.string().min(1).describe("Firebase uid or email"),
        groupId: z
          .string()
          .optional()
          .describe("Override CERTIFIER_GROUP_ID (Certifier template/group)"),
        skipIfExists: z
          .boolean()
          .optional()
          .describe("Default true — do not issue a second credential"),
        markCertified: z
          .boolean()
          .optional()
          .describe("Default true — set users.userStatus to certified"),
      },
      annotations: { destructiveHint: true },
    },
    withAdmin(async (_caller, args) =>
      issueCertifierCredential({
        uidOrEmail: args.uid,
        groupId: args.groupId,
        skipIfExists: args.skipIfExists,
        markCertified: args.markCertified,
      })
    )
  );
}
