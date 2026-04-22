/**
 * Geocode a single place name via Nominatim (OSM). Use at most 1 request/sec
 * (https://operations.osmfoundation.org/policies/nominatim/). Results cached in memory.
 */
const mem = new Map<string, { lat: number; lon: number } | null>();

function normKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function geocodeNominatim(
  address: string
): Promise<{ lat: number; lon: number } | null> {
  const key = normKey(address);
  if (!key) return null;
  if (mem.has(key)) return mem.get(key) ?? null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", address);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "AI-DevCamp-BuildwithAI/1.0 (https://gdg-london; admin user map)",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    mem.set(key, null);
    return null;
  }
  const data = (await res.json()) as { lat: string; lon: string }[];
  if (!data?.[0]) {
    mem.set(key, null);
    return null;
  }
  const lat = parseFloat(data[0].lat);
  const lon = parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    mem.set(key, null);
    return null;
  }
  const out = { lat, lon };
  mem.set(key, out);
  return out;
}

/** Delay to respect 1 request/sec. */
export function nominatimDelay(): Promise<void> {
  return new Promise((r) => setTimeout(r, 1_100));
}
