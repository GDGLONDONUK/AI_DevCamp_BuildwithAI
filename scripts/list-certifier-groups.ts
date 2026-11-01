/**
 * List Certifier groups (names + design ids). Never logs the API token.
 *   npx tsx --env-file=.env.local scripts/list-certifier-groups.ts
 */

export {};

const CERTIFIER_GROUPS_API_BASE = "https://api.certifier.io/v1";

async function main() {
  const token = process.env.CERTIFIER_API_TOKEN?.trim();
  if (!token) throw new Error("CERTIFIER_API_TOKEN missing");
  const version = process.env.CERTIFIER_API_VERSION?.trim() || "2022-10-26";
  const res = await fetch(`${CERTIFIER_GROUPS_API_BASE}/groups?limit=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Certifier-Version": version,
    },
  });
  const json = (await res.json()) as {
    data?: Array<Record<string, unknown>>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`);
  for (const g of json.data ?? []) {
    console.log(
      JSON.stringify({
        id: g.id,
        name: g.name,
        certificateDesignId: g.certificateDesignId,
        badgeDesignId: g.badgeDesignId,
      })
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
