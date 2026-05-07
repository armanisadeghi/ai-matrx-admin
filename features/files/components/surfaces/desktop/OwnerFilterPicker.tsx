/**
 * features/files/components/surfaces/desktop/OwnerFilterPicker.tsx
 *
 * Multi-select dropdown body for the Owner column filter. Shows one row
 * per distinct owner present in the current file/folder set, with a small
 * deterministic-color avatar + initials and a row count. The currently
 * authenticated user is labeled "You" and pinned to the top.
 *
 * State lives in `cloudFiles.ui.columnFilters.owner` — this component
 * is purely presentational; the host wires `value` / `onChange`.
 */

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { OwnerFilter } from "@/features/files/types";

const PALETTE = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function colorFor(id: string): string {
  return PALETTE[hashString(id) % PALETTE.length];
}

function initialsFor(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9]/g, "");
  if (clean.length === 0) return "?";
  const first = clean[0]?.toUpperCase() ?? "?";
  const mid =
    clean.length > 1
      ? (clean[Math.floor(clean.length / 2)] ?? "").toUpperCase()
      : "";
  return first + mid;
}

export interface OwnerOption {
  ownerId: string;
  /** Pre-formatted display label — caller resolves "You" vs. user-id. */
  label: string;
  count: number;
}

export interface OwnerFilterPickerProps {
  value: OwnerFilter;
  onChange: (next: OwnerFilter) => void;
  options: OwnerOption[];
  className?: string;
}

export function OwnerFilterPicker({
  value,
  onChange,
  options,
  className,
}: OwnerFilterPickerProps) {
  const selectedSet = useMemo(() => new Set(value), [value]);

  const toggle = (ownerId: string) => {
    const next = new Set(selectedSet);
    if (next.has(ownerId)) next.delete(ownerId);
    else next.add(ownerId);
    onChange(Array.from(next));
  };

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {value.length === 0 ? "Any owner" : `${value.length} selected`}
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
        {options.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No owners to filter.
          </div>
        ) : null}
        {options.map((row) => {
          const checked = selectedSet.has(row.ownerId);
          return (
            <button
              key={row.ownerId}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(row.ownerId);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-accent",
                checked && "bg-accent",
              )}
            >
              <Checkbox
                checked={checked}
                aria-label={row.label}
                className="pointer-events-none"
                tabIndex={-1}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white",
                  colorFor(row.ownerId),
                )}
              >
                {initialsFor(row.ownerId)}
              </span>
              <span className="flex-1 truncate font-medium text-foreground">
                {row.label}
              </span>
              <span className="tabular-nums text-[10px] text-muted-foreground">
                {row.count > 0 ? row.count.toLocaleString() : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
