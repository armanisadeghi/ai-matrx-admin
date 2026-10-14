"use client";

// lib/entity-list/useTableBulkSelection.tsx
//
// THE SAME BULK BAR FOR A PLAIN TABLE. Screens that render `MatrxDataTable`
// directly (not through `EntityListPage`) get the identical selection
// lifecycle, buttons, confirms, toasts and built-in verbs (Favorite,
// Unfavorite, Add tag, Move to Trash) with one hook:
//
//   const bulk = useTableBulkSelection({ token: "task", noun: "task", rows,
//     getRowId: (r) => r.id, getRowName: (r) => r.title, onRefresh });
//   <MatrxDataTable … selection={bulk.selection} />
//
// The buttons ARE `EntityBulkActions` — one implementation, never a second.
// A selection here means the ticked ids; "select all matching" belongs to the
// list shell, which can page its own service.

import { useState } from "react";
import type { MatrxDataTableSelectionConfig } from "@ai-matrx/design-system/data-table/types";
import { EntityBulkActions } from "./components/EntityBulkBar";
import type { EntityBulkAction, EntityBulkSelection } from "./selection";
import {
  mergeBulkActions,
  standardBulkActionsFor,
  type StandardBulkActionsConfig,
} from "./standardBulkActions";

export interface UseTableBulkSelectionArgs<TRow> {
  /** Registered record type (platform.entity_types token). Turns on the built-in verbs. */
  token?: string;
  /** Singular noun for counts ("task"). */
  noun: string;
  rows: TRow[];
  getRowId: (row: TRow) => string;
  getRowName?: (row: TRow) => string;
  /** The screen's own verbs; an id equal to a built-in replaces it. */
  actions?: EntityBulkAction<TRow>[];
  standardBulkActions?: StandardBulkActionsConfig<TRow> | false;
  /** Does this screen show favorites (stars)? Default true. */
  favoritesShown?: boolean;
  /** Re-read the screen's data after an action changed it. */
  onRefresh: () => void;
  /** Drop removed rows locally; defaults to `onRefresh`. */
  onRemoveRows?: (ids: string[]) => void;
}

export function useTableBulkSelection<TRow>(args: UseTableBulkSelectionArgs<TRow>): {
  selection: MatrxDataTableSelectionConfig<TRow> | undefined;
  selectedIds: string[];
  clear: () => void;
} {
  const [ids, setIds] = useState<string[]>([]);
  const actions = mergeBulkActions(
    args.actions ?? [],
    standardBulkActionsFor<TRow>({
      token: args.token,
      noun: args.noun,
      rowIdOf: args.getRowId,
      labelOf: args.getRowName,
      config: args.standardBulkActions,
      favoritesShown: args.favoritesShown,
    }),
  );

  const clear = () => setIds([]);
  const build = (): EntityBulkSelection<TRow> => {
    const wanted = new Set(ids);
    return {
      mode: "ids",
      ids,
      rows: args.rows.filter((row) => wanted.has(args.getRowId(row))),
      count: ids.length,
      filter: {
        scope: { kind: "all" },
        orgId: null,
        search: "",
        deep: false,
        archived: "active",
        filters: {},
      },
    };
  };

  if (actions.length === 0) {
    return { selection: undefined, selectedIds: ids, clear };
  }

  return {
    selectedIds: ids,
    clear,
    selection: {
      selectedIds: ids,
      onSelectedIdsChange: setIds,
      noun: args.noun,
      actions: () => (
        <EntityBulkActions
          actions={actions}
          selection={{ build, clear, count: ids.length }}
          noun={args.noun}
          onRemoveRows={args.onRemoveRows ?? (() => args.onRefresh())}
          onRefresh={args.onRefresh}
        />
      ),
    },
  };
}
