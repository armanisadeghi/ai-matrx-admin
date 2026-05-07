/**
 * features/files/components/surfaces/desktop/ColumnHeader.tsx
 *
 * Sortable + filterable column header for the file table. Click the label
 * to toggle sort direction (or activate this column as the sort key);
 * click the chevron to open a dropdown with sort + per-column filter
 * options. Active filters are dimly highlighted on the header so users
 * notice which columns have a non-default filter without scanning the
 * chip row.
 *
 * Each column type (text / date / size / enum) provides its own filter
 * UI. The component is column-agnostic — the host passes the right
 * `filterContent` slot.
 */

"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Check, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SortBy, SortDirection } from "@/features/files/types";

export type ColumnSortKey = SortBy;

export interface ColumnHeaderProps {
  label: string;
  /** When null, the column is not sortable (e.g. Access) — clicking the
   *  label opens the filter directly and the dropdown omits the sort
   *  options. */
  sortKey: ColumnSortKey | null;
  activeSortBy: SortBy;
  activeSortDir: SortDirection;
  onChangeSort: (next: { sortBy: SortBy; sortDir: SortDirection }) => void;
  align?: "left" | "right";
  /** Display text for the ascending / descending sort options. Defaults to
   *  "A → Z" / "Z → A". Date columns use "Newest first" / "Oldest first";
   *  size columns use "Largest first" / "Smallest first". */
  ascLabel?: string;
  descLabel?: string;
  /** Filter UI rendered inside the dropdown after the sort options.
   *  When omitted, the dropdown shows sort only. */
  filterContent?: React.ReactNode;
  /** Whether this column has an active filter (drives the dim highlight). */
  hasActiveFilter?: boolean;
}

export function ColumnHeader({
  label,
  sortKey,
  activeSortBy,
  activeSortDir,
  onChangeSort,
  align = "left",
  ascLabel = "Sort A → Z",
  descLabel = "Sort Z → A",
  filterContent,
  hasActiveFilter,
}: ColumnHeaderProps) {
  const isSorted = sortKey !== null && activeSortBy === sortKey;
  const [open, setOpen] = useState(false);

  return (
    <th
      className={cn(
        "px-4 py-2 font-medium whitespace-nowrap",
        align === "left" ? "text-left" : "text-right",
      )}
    >
      <div className="inline-flex items-center gap-0.5">
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent/60 hover:text-foreground",
            isSorted && "text-foreground",
            hasActiveFilter && "text-primary",
          )}
          onClick={() => {
            if (sortKey === null) {
              // Non-sortable column — open the dropdown so the filter is
              // reachable without forcing the user to find the chevron.
              setOpen((prev) => !prev);
              return;
            }
            if (isSorted) {
              onChangeSort({
                sortBy: sortKey,
                sortDir: activeSortDir === "asc" ? "desc" : "asc",
              });
            } else {
              onChangeSort({ sortBy: sortKey, sortDir: "asc" });
            }
          }}
        >
          {label}
          {isSorted ? (
            activeSortDir === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : null}
          {hasActiveFilter ? (
            <Filter className="h-3 w-3" aria-label="Filter active" />
          ) : null}
        </button>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`${label} column options`}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground",
                hasActiveFilter && "text-primary",
              )}
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            {sortKey !== null ? (
              <>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Sort
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() =>
                    onChangeSort({ sortBy: sortKey, sortDir: "asc" })
                  }
                >
                  {isSorted && activeSortDir === "asc" ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <span className="mr-6" />
                  )}
                  {ascLabel}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onChangeSort({ sortBy: sortKey, sortDir: "desc" })
                  }
                >
                  {isSorted && activeSortDir === "desc" ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <span className="mr-6" />
                  )}
                  {descLabel}
                </DropdownMenuItem>
              </>
            ) : null}
            {filterContent ? (
              <>
                {sortKey !== null ? <DropdownMenuSeparator /> : null}
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Filter
                </DropdownMenuLabel>
                <div className="px-2 py-1.5">{filterContent}</div>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </th>
  );
}
