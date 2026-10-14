"use client";

// lib/entity-list/RowSelectionBar.tsx
//
// THE ONE SELECTION for lists that are not a MatrxDataTable (notes sidebar,
// pick lists, context items, schedules, meetings). Plain tables use
// ./useTableBulkSelection.tsx; list pages get it from EntityListPage. Never a
// fourth copy.
//
// The list owns an id set (`useRowSelection`), every row shows a checkbox, and
// the verbs are the shared `EntityBulkActions` — confirms, pending state, named
// refusals and toasts are the shared ones. Only rows still ON SCREEN count:
// ticks a filter took away drop out, and a change of `resetKey` (tab, filter,
// organization) clears them, so an action never touches a row nobody can see.
// The strip is always present and reserves room for Clear, so ticking never
// shifts the list.

import { useState } from "react";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { EntityBulkActions } from "@/lib/entity-list/components/EntityBulkBar";
import type {
  EntityBulkAction,
  EntityBulkSelection,
} from "@/lib/entity-list/selection";

export interface RowSelection<TRow> {
  /** Ticked rows that are still on screen, in list order. */
  rows: TRow[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  toggleAll: () => void;
  /** Tick or untick a group (a section header's checkbox). */
  setMany: (ids: string[], ticked: boolean) => void;
  clear: () => void;
  allSelected: boolean;
  someSelected: boolean;
}

/** Selection by id over the rows currently shown; ids that left the list drop out of `rows`. */
export function useRowSelection<TRow>(
  rows: readonly TRow[],
  idOf: (row: TRow) => string,
  /** Change it (tab, filter, organization) to clear the selection. */
  resetKey?: string,
): RowSelection<TRow> {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  const [seenKey, setSeenKey] = useState(resetKey);
  // Reset during render (React's "adjust state on a prop change" pattern).
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    if (ids.size > 0) setIds(new Set());
  }
  const onScreen = new Set(rows.map(idOf));
  // A tick on a row that left the screen (search, filter, tab) is DROPPED, not
  // hidden — it never reappears unasked when the row comes back.
  if (seenKey === resetKey && [...ids].some((id) => !onScreen.has(id))) {
    setIds(new Set([...ids].filter((id) => onScreen.has(id))));
  }
  const selectedRows = rows.filter((row) => ids.has(idOf(row)));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  return {
    rows: selectedRows,
    has: (id) => ids.has(id) && onScreen.has(id),
    toggle: (id) =>
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    toggleAll: () =>
      setIds(allSelected ? new Set() : new Set(rows.map(idOf))),
    setMany: (many, ticked) =>
      setIds((prev) => {
        const next = new Set(prev);
        for (const id of many) {
          if (ticked) next.add(id);
          else next.delete(id);
        }
        return next;
      }),
    clear: () => setIds(new Set()),
    allSelected,
    someSelected: selectedRows.length > 0 && !allSelected,
  };
}

export function RowSelectionBar<TRow>({
  selection,
  idOf,
  actions,
  noun,
  plural,
  onRefresh,
  onRemoveRows,
  disabled = false,
  compact = false,
}: {
  selection: RowSelection<TRow>;
  idOf: (row: TRow) => string;
  actions: EntityBulkAction<TRow>[];
  noun: string;
  plural: string;
  onRefresh: () => void;
  onRemoveRows?: (ids: string[]) => void;
  /** Nothing to select (empty list). */
  disabled?: boolean;
  /** Icon-only action buttons, for narrow hosts (a sidebar). */
  compact?: boolean;
}) {
  const count = selection.rows.length;
  const build = (): EntityBulkSelection<TRow> => ({
    mode: "ids",
    ids: selection.rows.map(idOf),
    rows: selection.rows,
    count,
    filter: {
      scope: { kind: "all" },
      orgId: null,
      search: "",
      deep: false,
      archived: "active",
      filters: {},
    },
  });
  return (
    <div
      role="toolbar"
      aria-label={`Bulk ${noun} actions`}
      data-row-selection-bar
      className={
        compact
          ? "flex min-h-11 flex-nowrap items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 lg:min-h-9"
          : "flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-1 lg:min-h-9"
      }
    >
      <Checkbox
        checked={
          selection.allSelected
            ? true
            : selection.someSelected
              ? "indeterminate"
              : false
        }
        disabled={disabled}
        aria-label={
          selection.allSelected ? `Clear selected ${plural}` : `Select all ${plural}`
        }
        onCheckedChange={() => selection.toggleAll()}
      />
      <span
        className={
          compact
            ? "shrink-0 text-xs font-medium tabular-nums"
            : "min-w-[5.5rem] text-xs font-medium tabular-nums"
        }
      >
        {count > 0 ? `${count} selected` : `Select ${plural}`}
      </span>
      <fieldset
        disabled={count === 0}
        className={
          compact
            ? "m-0 flex min-w-0 flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto border-0 p-0 disabled:opacity-50"
            : "m-0 flex min-w-0 flex-wrap items-center gap-1 border-0 p-0 disabled:opacity-50"
        }
      >
        <EntityBulkActions
          actions={actions}
          selection={{ build, clear: selection.clear, count }}
          noun={noun}
          compact={compact}
          onRemoveRows={onRemoveRows ?? (() => {})}
          onRefresh={onRefresh}
        />
      </fieldset>
      {compact ? null : <div className="flex-1" />}
      {/* Always rendered so its room is reserved; hidden while nothing is ticked. */}
      <Button
        type="button"
        variant="quiet"
        icon={<X />}
        aria-hidden={count === 0}
        aria-label="Clear selection"
        title="Clear selection"
        tabIndex={count === 0 ? -1 : undefined}
        className={count === 0 ? "invisible" : undefined}
        onClick={selection.clear}
      >
        {compact ? null : "Clear"}
      </Button>
    </div>
  );
}
