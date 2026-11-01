/** Public graduate name: never an email. */
export function publicGraduateName(opts: {
  displayName?: string | null;
  profilePublic?: boolean;
}): string {
  const raw = String(opts.displayName || "").trim();
  if (!raw || raw.includes("@")) return "AI DevCamp graduate";
  if (opts.profilePublic === true) return raw.slice(0, 80);
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!;
  const last = parts[parts.length - 1]!;
  return `${parts[0]} ${last[0]?.toUpperCase() ?? ""}.`.trim();
}
