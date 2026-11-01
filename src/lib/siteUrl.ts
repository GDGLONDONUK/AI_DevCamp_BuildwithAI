export function publicSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://aidevcamp.gdg.london";
  return raw.replace(/\/+$/, "");
}
