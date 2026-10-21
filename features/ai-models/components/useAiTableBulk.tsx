"use client";

// ONE PATTERN for the delete verb on every AI-models table (models, aliases, endpoints, APIs,
// offerings, providers, settings): the row's Delete and its bulk twin come out of ONE declaration
// (`defineRowVerbs`), so a table cannot grow a row delete without a bar delete. The table passes the
// SAME throwing door it always used (`deleteOne`); a row it refuses (a system provider) is skipped and
// named, never pre-filtered out of the selection. A table's other row verbs (View, Edit, Duplicate)
// are single and ride along as `extraVerbs`.

import { Trash2 } from "lucide-react";
import type { MatrxTableRowActionDef } from "@ai-matrx/design-system/data-table/types";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toastWriteFailure } from "@/lib/errors/toastWriteFailure";
import { defineRowVerbs, type RowVerb } from "@/lib/entity-list/rowVerbs";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";

export interface AiTableBulkOptions<T extends { id: string }> {
  /** Singular noun for counts and sentences ("provider"). */
  noun: string;
  rows: readonly T[];
  getRowName: (row: T) => string;
  /** The same door the row used: delete it, update local state, THROW on refusal. */
  deleteOne: (row: T) => Promise<void>;
  /** Why this row can never be deleted ("System providers cannot be deleted"), or null. */
  protectedReason?: (row: T) => string | null;
  /** The delete verb's label. Default "Delete". */
  deleteLabel?: string;
  /** What deleting does, one short sentence for the confirm. */
  consequence: string;
  /** Single-row verbs that come before Delete (View, Edit, Duplicate). */
  extraVerbs?: readonly RowVerb<T>[];
}

export function useAiTableBulk<T extends { id: string }>(options: AiTableBulkOptions<T>): {
  rowActionDefs: MatrxTableRowActionDef<T>[];
  selection: ReturnType<typeof useTableBulkSelection<T>>["selection"];
} {
  const { noun, rows, getRowName, deleteOne, protectedReason, consequence, extraVerbs = [] } = options;
  const label = options.deleteLabel ?? "Delete";
  const { rowActionDefs, bulkActions } = defineRowVerbs<T>(
    [
      ...extraVerbs,
      {
        id: "delete",
        icon: Trash2,
        label,
        tone: "destructive",
        appliesTo: (row) => !protectedReason?.(row),
        unavailableTooltip: "Can't be deleted",
        onClick: (row) => {
          void (async () => {
            const ok = await confirm({
              title: `${label} "${getRowName(row)}"?`,
              description: consequence,
              confirmLabel: label,
              variant: "destructive",
            });
            if (!ok) return;
            try {
              await deleteOne(row);
            } catch (err) {
              toastWriteFailure(err, { action: `${label.toLowerCase()} ${getRowName(row)}`, remedy: "Try again." });
            }
          })();
        },
        bulk: {
          done: label === "Delete" ? "Deleted" : `${label}d`,
          removesRows: true,
          skipReason: (row) => protectedReason?.(row) ?? null,
          confirm: (targets) => ({
            title: `${label} ${targets.ids.length} ${noun}${targets.ids.length === 1 ? "" : "s"}?`,
            description: `${consequence} Any the server refuses are skipped and named.`,
            confirmLabel: label,
            variant: "destructive",
          }),
          runOne: async (_id, row) => {
            if (!row) throw new Error("Not loaded");
            await deleteOne(row);
          },
        },
      },
    ],
    { noun, getRowId: (row) => row.id, getRowName },
  );
  const bulk = useTableBulkSelection<T>({
    noun,
    rows: rows as T[],
    getRowId: (row) => row.id,
    getRowName,
    actions: bulkActions,
    standardBulkActions: false,
    onRefresh: () => {},
  });
  return { rowActionDefs, selection: bulk.selection };
}
