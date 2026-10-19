/**
 * Delete all MCP tokens whose label starts with `probe-` (leftovers from role probes).
 * Does not touch real tokens (e.g. claude-desktop).
 *
 *   npx tsx --env-file=.env.local scripts/mcp-cleanup-probe-tokens.ts
 */

import { adminDb } from "../src/lib/firebase-admin";
import { MCP_ACCESS_TOKENS_COLLECTION } from "../src/lib/mcp/accessTokens";

async function main() {
  const snap = await adminDb().collection(MCP_ACCESS_TOKENS_COLLECTION).limit(500).get();
  const probe = snap.docs.filter((d) => String(d.data().label || "").startsWith("probe-"));
  if (probe.length === 0) {
    console.log(JSON.stringify({ ok: true, deleted: 0 }));
    return;
  }
  const batch = adminDb().batch();
  for (const d of probe) batch.delete(d.ref);
  await batch.commit();
  console.log(JSON.stringify({ ok: true, deleted: probe.length }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
