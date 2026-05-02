/** Built-in checklist categories — users may also save any custom label (stored as trimmed text). */

export const LEARNING_TASK_CATEGORY_PRESETS = [
  { value: "resource", label: "Resource" },
  { value: "recording", label: "Recording" },
  { value: "codelab", label: "Codelab" },
  { value: "setup", label: "Setup" },
  { value: "other", label: "Other" },
] as const;

const PRESET_VALUES_LOWER = new Set(
  LEARNING_TASK_CATEGORY_PRESETS.map((p) => p.value.toLowerCase())
);

export function normalizeLearningTaskCategory(raw: string): string {
  const collapsed = raw.trim().replace(/\s+/g, " ");
  return collapsed.slice(0, 80);
}

/** Display label: presets keep canonical labels; custom strings stay trimmed with simple title casing fallback. */
export function labelLearningTaskCategory(stored: string): string {
  const t = stored.trim();
  if (!t) return "Other";
  const preset = LEARNING_TASK_CATEGORY_PRESETS.find((p) => p.value.toLowerCase() === t.toLowerCase());
  if (preset) return preset.label;
  return t.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Chip colours — presets matched case-insensitively; anything else shares “custom”. */
export function learningTaskCategoryChipClass(stored: string): string {
  const key = stored.trim().toLowerCase();
  switch (key) {
    case "resource":
      return "bg-sky-500/15 text-sky-200 border-sky-500/30";
    case "recording":
      return "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30";
    case "codelab":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
    case "setup":
      return "bg-amber-500/15 text-amber-200 border-amber-500/30";
    case "other":
      return "bg-gray-500/15 text-gray-200 border-gray-500/30";
    default:
      return "bg-violet-500/15 text-violet-200 border-violet-500/35";
  }
}

/** Merge preset keys with extras (e.g. from existing tasks), dedupe case-insensitively, presets first. */
export function mergeCategorySuggestions(extraRaw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (v: string) => {
    const n = normalizeLearningTaskCategory(v);
    if (!n) return;
    const lk = n.toLowerCase();
    if (seen.has(lk)) return;
    seen.add(lk);
    const preset = LEARNING_TASK_CATEGORY_PRESETS.find((p) => p.value.toLowerCase() === lk);
    out.push(preset ? preset.value : n);
  };

  for (const p of LEARNING_TASK_CATEGORY_PRESETS) push(p.value);
  const extrasSorted = [...extraRaw].sort((a, b) =>
    normalizeLearningTaskCategory(a).localeCompare(normalizeLearningTaskCategory(b), undefined, {
      sensitivity: "base",
    })
  );
  for (const x of extrasSorted) {
    const n = normalizeLearningTaskCategory(x);
    if (!n || PRESET_VALUES_LOWER.has(n.toLowerCase())) continue;
    push(n);
  }
  return out;
}
