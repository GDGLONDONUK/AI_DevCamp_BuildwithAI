"use client";

import { useState, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";

interface SkillsSelectorProps {
  label: string;
  sublabel?: string;
  selected: string[];
  onChange: (tags: string[]) => void;
  presets: string[];
  color?: "green" | "blue" | "purple" | "orange";
}

const COLOR_MAP = {
  green: {
    active: "bg-green-500/20 border-green-500 text-green-300",
    check: "text-green-400",
    custom: "bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20",
    input: "focus:ring-green-500",
    badge: "bg-green-500/15 text-green-300 border border-green-500/30",
  },
  blue: {
    active: "bg-blue-500/20 border-blue-500 text-blue-300",
    check: "text-blue-400",
    custom: "bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20",
    input: "focus:ring-blue-500",
    badge: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  },
  purple: {
    active: "bg-purple-500/20 border-purple-500 text-purple-300",
    check: "text-purple-400",
    custom: "bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20",
    input: "focus:ring-purple-500",
    badge: "bg-purple-500/15 text-purple-300 border border-purple-500/30",
  },
  orange: {
    active: "bg-orange-500/20 border-orange-500 text-orange-300",
    check: "text-orange-400",
    custom: "bg-orange-500/10 border-orange-500/30 text-orange-300 hover:bg-orange-500/20",
    input: "focus:ring-orange-500",
    badge: "bg-orange-500/15 text-orange-300 border border-orange-500/30",
  },
};

export default function SkillsSelector({
  label,
  sublabel,
  selected,
  onChange,
  presets,
  color = "green",
}: SkillsSelectorProps) {
  const [customInput, setCustomInput] = useState("");
  const c = COLOR_MAP[color];

  const toggle = (tag: string) => {
    onChange(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag]
    );
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (val && !selected.includes(val)) {
      onChange([...selected, val]);
    }
    setCustomInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    }
  };

  const removeCustom = (tag: string) => {
    onChange(selected.filter((t) => t !== tag));
  };

  // Custom tags = selected items not in presets
  const customTags = selected.filter((t) => !presets.includes(t));

  return (
    <div>
      <p className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-2">
        {label}
      </p>
      {sublabel && <p className="text-xs text-gray-600 mb-3">{sublabel}</p>}

      {/* Preset tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        {presets.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`px-3 py-1.5 rounded-full text-sm border-2 transition-all font-medium ${
              selected.includes(tag)
                ? c.active
                : "border-white/15 text-gray-400 hover:border-white/30 hover:text-white"
            }`}
          >
            {selected.includes(tag) && (
              <span className={`mr-1 ${c.check}`}>✓</span>
            )}
            {tag}
          </button>
        ))}
      </div>

      {/* Custom tag input */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Plus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add something custom (press Enter)"
            className={`w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 pl-8 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 transition-all ${c.input}`}
          />
        </div>
        {customInput.trim() && (
          <button
            type="button"
            onClick={addCustom}
            className={`flex-shrink-0 px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${c.custom}`}
          >
            Add
          </button>
        )}
      </div>

      {/* Custom tags row */}
      {customTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {customTags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${c.badge}`}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeCustom(tag)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
