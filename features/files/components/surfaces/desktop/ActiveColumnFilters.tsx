/**
 * features/files/components/surfaces/desktop/ActiveColumnFilters.tsx
 *
 * Small chip row rendered above the file table when any column filter is
 * non-default. Each chip names the active filter and dismisses it on
 * click; a final "Clear all" pill resets every column filter at once.
 */

"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectColumnFilters,
  selectHasActiveColumnFilters,
} from "@/features/files/redux/selectors";
import {
  clearColumnFilters,
  setColumnFilter,
} from "@/features/files/redux/slice";

const MODIFIED_LABEL: Record<string, string> = {
  today: "Modified today",
  week: "Modified in last 7 days",
  month: "Modified in last 30 days",
};

const SIZE_LABEL: Record<string, string> = {
  small: "Size ≤ 1 MB",
  medium: "Size 1–10 MB",
  large: "Size 10–100 MB",
  huge: "Size > 100 MB",
};

const ACCESS_LABEL: Record<string, string> = {
  private: "Private only",
  shared: "Shared only",
  public: "Public only",
};

export interface ActiveColumnFiltersProps {
  className?: string;
}

export function ActiveColumnFilters({ className }: ActiveColumnFiltersProps) {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectColumnFilters);
  const hasAny = useAppSelector(selectHasActiveColumnFilters);
  if (!hasAny) return null;

  const chips: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (filters.name) {
    chips.push({
      key: "name",
      label: `Name contains "${filters.name}"`,
      onClear: () => dispatch(setColumnFilter({ column: "name", value: "" })),
    });
  }
  if (filters.modified !== "any") {
    chips.push({
      key: "modified",
      label: MODIFIED_LABEL[filters.modified] ?? filters.modified,
      onClear: () =>
        dispatch(setColumnFilter({ column: "modified", value: "any" })),
    });
  }
  if (filters.size !== "any") {
    chips.push({
      key: "size",
      label: SIZE_LABEL[filters.size] ?? filters.size,
      onClear: () => dispatch(setColumnFilter({ column: "size", value: "any" })),
    });
  }
  if (filters.access !== "any") {
    chips.push({
      key: "access",
      label: ACCESS_LABEL[filters.access] ?? filters.access,
      onClear: () =>
        dispatch(setColumnFilter({ column: "access", value: "any" })),
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 px-4 py-2 border-b bg-muted/20",
        className,
      )}
    >
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        Filters
      </span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onClear}
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
        >
          {chip.label}
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => dispatch(clearColumnFilters())}
        className="ml-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
