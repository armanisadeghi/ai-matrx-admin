"use client";

// components/official/RowSelectionBar.tsx
//
// SELECTION CHROME for hand-built lists that are not a MatrxDataTable (the
// schedules list, the meetings agenda). Same model as the notes sidebar: the
// list owns a plain id set (`useRowSelection`), every row shows a checkbox,
// and the verbs are the platform's shared `EntityBulkActions` — confirms,
// pending state, named refusals and toasts are the shared ones. This file
// owns only the select-all / count / clear strip. The strip is always
// present (actions disabled until a row is ticked) so ticking never shifts
// the list.

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
  clear: () => void;
  allSelected: boolean;
  someSelected: boolean;
}

/** Selection by id over the rows currently shown; ids that left the list drop out of `rows`. */
export function useRowSelection<TRow>(
  rows: readonly TRow[],
  idOf: (row: TRow) => string,
): RowSelection<TRow> {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  const selectedRows = rows.filter((row) => ids.has(idOf(row)));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  return {
    rows: selectedRows,
    has: (id) => ids.has(id),
    toggle: (id) =>
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    toggleAll: () =>
      setIds(allSelected ? new Set() : new Set(rows.map(idOf))),
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
      className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-1 lg:min-h-9"
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
      <span className="min-w-[5.5rem] text-xs font-medium tabular-nums">
        {count > 0 ? `${count} selected` : `Select ${plural}`}
      </span>
      <fieldset
        disabled={count === 0}
        className="m-0 flex min-w-0 flex-wrap items-center gap-1 border-0 p-0 disabled:opacity-50"
      >
        <EntityBulkActions
          actions={actions}
          selection={{ build, clear: selection.clear, count }}
          noun={noun}
          onRemoveRows={onRemoveRows ?? (() => {})}
          onRefresh={onRefresh}
        />
      </fieldset>
      <div className="flex-1" />
      {count > 0 ? (
        <Button
          type="button"
          variant="quiet"
          icon={<X />}
          onClick={selection.clear}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}
