/**
 * features/files/components/surfaces/desktop/TypeFilterPicker.tsx
 *
 * Beautiful multi-select for the Type column. Renders one row per file
 * category present in `FILE_TYPES` — each with the category's Lucide icon,
 * color token, and a live count of how many rows in the current set fall
 * into that category. Click rows to toggle, click the header chip to clear.
 *
 * Drives `cloudFiles.ui.columnFilters.type` through `setColumnFilter`.
 *
 * Built to rival Box.com / Google Drive's "Filter by file type" panel —
 * the icons + counts make the difference between "guess what bucket the
 * file lives in" and "I see exactly 12 PDFs and 4 spreadsheets, click."
 */

"use client";

import { useMemo } from "react";
import {
  Archive,
  BookOpen,
  Box,
  Code as CodeIcon,
  Database as DatabaseIcon,
  FileImage,
  FileText,
  Folder,
  Mail,
  Music,
  Notebook,
  Package,
  Subtitles as SubtitlesIcon,
  Video,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FILE_TYPES,
  type FileCategory,
} from "@/features/files/utils/file-types";
import type { TypeFilter } from "@/features/files/types";

/**
 * Category metadata shown in the picker. Pulled out of `FILE_TYPES`
 * because per-entry icons are too varied (every JS variant has its own
 * icon) — the picker wants ONE canonical icon + label per category.
 */
interface CategoryMeta {
  category: FileCategory;
  label: string;
  icon: LucideIcon;
  color: string;
}

const CATEGORY_META: ReadonlyArray<CategoryMeta> = [
  { category: "FOLDER", label: "Folders", icon: Folder, color: "text-sky-500" },
  {
    category: "IMAGE",
    label: "Images",
    icon: FileImage,
    color: "text-emerald-500",
  },
  { category: "VIDEO", label: "Videos", icon: Video, color: "text-purple-500" },
  { category: "AUDIO", label: "Audio", icon: Music, color: "text-pink-500" },
  {
    category: "DOCUMENT",
    label: "Documents",
    icon: FileText,
    color: "text-blue-500",
  },
  { category: "CODE", label: "Code", icon: CodeIcon, color: "text-amber-500" },
  {
    category: "DATA",
    label: "Data",
    icon: DatabaseIcon,
    color: "text-orange-500",
  },
  {
    category: "NOTEBOOK",
    label: "Notebooks",
    icon: Notebook,
    color: "text-orange-400",
  },
  {
    category: "ARCHIVE",
    label: "Archives",
    icon: Archive,
    color: "text-amber-600",
  },
  {
    category: "EBOOK",
    label: "Ebooks",
    icon: BookOpen,
    color: "text-indigo-500",
  },
  { category: "EMAIL", label: "Emails", icon: Mail, color: "text-blue-400" },
  {
    category: "SUBTITLES",
    label: "Subtitles",
    icon: SubtitlesIcon,
    color: "text-cyan-500",
  },
  {
    category: "MODEL_3D",
    label: "3D models",
    icon: Box,
    color: "text-violet-400",
  },
  {
    category: "UNKNOWN",
    label: "Other",
    icon: Package,
    color: "text-muted-foreground",
  },
];

/** Set of every category that has at least one entry in `FILE_TYPES`. */
const REGISTERED_CATEGORIES: ReadonlySet<FileCategory> = new Set(
  FILE_TYPES.map((e) => e.category),
);

export interface TypeFilterPickerProps {
  value: TypeFilter;
  onChange: (next: TypeFilter) => void;
  /** Optional category counts (category → count) computed by the host. */
  counts?: Partial<Record<FileCategory, number>>;
  className?: string;
}

export function TypeFilterPicker({
  value,
  onChange,
  counts,
  className,
}: TypeFilterPickerProps) {
  const selectedSet = useMemo(() => new Set(value), [value]);

  // Show every meta entry whose category is registered OR has a non-zero
  // count in the current set. Folders and Unknown always show because
  // they're meaningful filters even when empty (users want to "show only
  // folders" before any file is uploaded).
  const rows = useMemo(() => {
    return CATEGORY_META.filter((m) => {
      if (m.category === "FOLDER" || m.category === "UNKNOWN") return true;
      if (REGISTERED_CATEGORIES.has(m.category)) return true;
      return (counts?.[m.category] ?? 0) > 0;
    });
  }, [counts]);

  const toggle = (category: FileCategory) => {
    const next = new Set(selectedSet);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    onChange(Array.from(next));
  };

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {value.length === 0 ? "Any type" : `${value.length} selected`}
        </span>
        {value.length > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            className="text-[10px] font-medium text-primary hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="max-h-72 overflow-y-auto pr-1">
        {rows.map((row) => {
          const Icon = row.icon;
          const checked = selectedSet.has(row.category);
          const count = counts?.[row.category] ?? 0;
          const dim = count === 0 && !checked;
          return (
            <button
              key={row.category}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(row.category);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-accent",
                checked && "bg-accent",
                dim && "opacity-60",
              )}
            >
              <Checkbox
                checked={checked}
                aria-label={row.label}
                className="pointer-events-none"
                tabIndex={-1}
              />
              <Icon
                className={cn("h-3.5 w-3.5 shrink-0", row.color)}
                aria-hidden="true"
              />
              <span className="flex-1 truncate font-medium text-foreground">
                {row.label}
              </span>
              <span className="tabular-nums text-[10px] text-muted-foreground">
                {count > 0 ? count.toLocaleString() : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
