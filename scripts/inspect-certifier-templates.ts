/** npx tsx --env-file=.env.local scripts/inspect-certifier-templates.ts */

export {};

const CERTIFIER_API_BASE = "https://api.certifier.io/v1";
const GROUP_IDS = ["01krye1285ajh93pebhz8yh8tt", "01krvh488zv181waadghgt4jr0"];
const DESIGN_IDS = ["01krydv66cpd6j3w19zjkpkjaq", "01krvgxvxadheqbbe5v7208fpd"];

async function get(path: string) {
  const token = process.env.CERTIFIER_API_TOKEN?.trim();
  if (!token) throw new Error("CERTIFIER_API_TOKEN missing");
  const version = process.env.CERTIFIER_API_VERSION?.trim() || "2022-10-26";
  const res = await fetch(`${CERTIFIER_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Certifier-Version": version,
    },
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function main() {
  for (const id of GROUP_IDS) {
    const r = await get(`/groups/${id}`);
    const d = (r.json as { data?: Record<string, unknown> }).data || r.json;
    console.log(
      "GROUP",
      JSON.stringify({
        status: r.status,
        id: (d as { id?: string }).id,
        name: (d as { name?: string }).name,
        keys: Object.keys(d as object),
        designIds: (d as { designIds?: unknown }).designIds,
      })
    );
  }
  for (const id of DESIGN_IDS) {
    const r = await get(`/designs/${id}`);
    const d = (r.json as { data?: Record<string, unknown> }).data || r.json;
    console.log(
      "DESIGN",
      JSON.stringify({
        status: r.status,
        id: (d as { id?: string }).id,
        name: (d as { name?: string }).name,
        keys: Object.keys(d as object),
      })
    );
  }
  const listed = await get("/designs?limit=50");
  const rows = ((listed.json as { data?: Array<Record<string, unknown>> }).data || []).map(
    (x) => ({ id: x.id, name: x.name, type: x.type })
  );
  console.log("DESIGNS_LIST", JSON.stringify(rows));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
