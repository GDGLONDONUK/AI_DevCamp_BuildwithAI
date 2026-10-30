export function sessionLooksCancelled(title: string, tags: unknown): boolean {
  const tagList = Array.isArray(tags) ? tags.map((t) => String(t).toLowerCase()) : [];
  return tagList.includes("cancelled") || /cancelled/i.test(String(title));
}
