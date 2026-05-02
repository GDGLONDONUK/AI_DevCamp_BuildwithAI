"use client";

import {
  BookOpen,
  FlaskConical,
  FolderKanban,
  Tags,
  type LucideIcon,
  Video,
  Wrench,
} from "lucide-react";
import { learningTaskCategoryChipClass } from "../domain/categoryPresets";

export function taskCategoryLucide(category: string): LucideIcon {
  switch (category.trim().toLowerCase()) {
    case "resource":
      return BookOpen;
    case "recording":
      return Video;
    case "codelab":
      return FlaskConical;
    case "setup":
      return Wrench;
    case "other":
      return FolderKanban;
    default:
      return Tags;
  }
}

/** Category glyph — rounded tile + Lucide icon; pairs with `learningTaskCategoryChipClass`. */
export function TaskCategoryGlyph({
  category,
  size = 17,
  compact,
  className = "",
}: {
  category: string;
  size?: number;
  /** Smaller padding for dense layouts (timeline, tight lists). */
  compact?: boolean;
  className?: string;
}) {
  const Icon = taskCategoryLucide(category);
  const pad = compact ? "p-1.5" : "p-2";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border ${learningTaskCategoryChipClass(category)} ${pad} ${className}`}
      title={category}
    >
      <Icon size={size} className="opacity-95" aria-hidden />
    </span>
  );
}
