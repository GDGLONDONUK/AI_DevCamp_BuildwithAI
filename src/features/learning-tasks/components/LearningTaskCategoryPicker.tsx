"use client";

import { ChevronDown, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LEARNING_TASK_CATEGORY_PRESETS,
  labelLearningTaskCategory,
  learningTaskCategoryChipClass,
  mergeCategorySuggestions,
  normalizeLearningTaskCategory,
} from "../domain/categoryPresets";

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** Extra suggestions discovered from tasks/templates (optional). */
  extraSuggestions?: string[];
  disabled?: boolean;
};

export function LearningTaskCategoryPicker({
  value,
  onChange,
  extraSuggestions = [],
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const suggestions = useMemo(
    () => mergeCategorySuggestions(extraSuggestions),
    [extraSuggestions]
  );

  const filtered = useMemo(() => {
    const q = normalizeLearningTaskCategory(query).toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((s) => labelLearningTaskCategory(s).toLowerCase().includes(q));
  }, [query, suggestions]);

  const trimmedQuery = normalizeLearningTaskCategory(query);
  const matchesSuggestionExactly =
    trimmedQuery.length > 0 &&
    suggestions.some(
      (s) =>
        s.toLowerCase() === trimmedQuery.toLowerCase() ||
        labelLearningTaskCategory(s).toLowerCase() === trimmedQuery.toLowerCase()
    );

  /** Offer explicit “create” only when nothing in the list matches the typed text. */
  const showCreateRow =
    trimmedQuery.length > 0 && filtered.length === 0 && !matchesSuggestionExactly;

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null);
      return;
    }
    const el = wrapRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      const pad = 8;
      const width = Math.min(r.width, typeof window !== "undefined" ? window.innerWidth - pad * 2 : r.width);
      const left = Math.min(Math.max(pad, r.left), Math.max(pad, (typeof window !== "undefined" ? window.innerWidth : r.left + width) - width - pad));
      setMenuRect({ top: r.bottom + 6, left, width });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open && menuRect) inputRef.current?.focus();
  }, [open, menuRect]);

  const commit = useCallback(
    (raw: string) => {
      const n = normalizeLearningTaskCategory(raw);
      if (!n) return;
      onChange(n);
      setQuery("");
      setOpen(false);
    },
    [onChange]
  );

  const pickPresetOrCanonical = useCallback(
    (picked: string) => {
      const t = normalizeLearningTaskCategory(picked);
      const preset = LEARNING_TASK_CATEGORY_PRESETS.find((p) => p.value.toLowerCase() === t.toLowerCase());
      commit(preset ? preset.value : t);
    },
    [commit]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) {
        pickPresetOrCanonical(filtered[0]!);
        return;
      }
      if (trimmedQuery) commit(trimmedQuery);
    }
  };

  return (
    <div ref={wrapRef} className="relative space-y-1">
      <span className="text-xs text-gray-500 uppercase tracking-wide">Category</span>

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full flex flex-wrap items-center gap-2 min-h-[42px] px-3 py-2 rounded-lg border bg-gray-900 border-white/15 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/40 ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-white/25 cursor-pointer"
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${learningTaskCategoryChipClass(value)}`}
        >
          {labelLearningTaskCategory(value)}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-500 ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && menuRect && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[100] rounded-xl border border-white/15 bg-gray-950 shadow-xl shadow-black/50 overflow-hidden"
              style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type to filter or add…"
                  className="flex-1 min-w-0 bg-gray-900/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/35"
                  aria-label="Filter or add category"
                />
                {trimmedQuery ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>

              <ul role="listbox" className="max-h-52 overflow-y-auto py-1">
                {filtered.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      role="option"
                      onClick={() => pickPresetOrCanonical(s)}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-sky-500/20 flex items-center gap-2"
                    >
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${learningTaskCategoryChipClass(s)}`}
                      >
                        {labelLearningTaskCategory(s)}
                      </span>
                    </button>
                  </li>
                ))}
                {showCreateRow ? (
                  <li>
                    <button
                      type="button"
                      role="option"
                      onClick={() => commit(trimmedQuery)}
                      className="w-full text-left px-3 py-2 text-sm text-violet-300 hover:bg-violet-500/15 border-t border-white/5"
                    >
                      Add “{trimmedQuery}”
                    </button>
                  </li>
                ) : null}
                {!filtered.length && !showCreateRow ? (
                  <li className="px-3 py-4 text-sm text-gray-500 text-center">No matches</li>
                ) : null}
              </ul>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
