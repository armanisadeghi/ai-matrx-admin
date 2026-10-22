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
import { bulkCountLabel } from "@/lib/entity-list/selection";
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
  /** Plural of `noun` when it is not noun + "s" ("alias" -> "aliases"). */
  nounPlural?: string;
  /** The delete verb's label (button and menu). Default "Delete". */
  deleteLabel?: string;
  /** The verb phrase alone, for the confirm title ("Delete", "Move to Trash"). Default "Delete". */
  verb?: string;
  /** Past tense for the success line ("Deleted", "Moved to Trash"). Default "Deleted". */
  done?: string;
  /** What deleting does, one short sentence for the confirm. */
  consequence: string;
  /** Single-row verbs that come before Delete (View, Edit, Duplicate). */
  extraVerbs?: readonly RowVerb<T>[];
}

/** "3 aliases", "1 model": the table's own singular and plural, never string-glued per call site. */
export function aiTableCountLabel(count: number, noun: string, nounPlural?: string): string {
  return count === 1 || !nounPlural ? bulkCountLabel(count, noun) : `${count.toLocaleString()} ${nounPlural}`;
}

export function useAiTableBulk<T extends { id: string }>(options: AiTableBulkOptions<T>): {
  rowActionDefs: MatrxTableRowActionDef<T>[];
  selection: ReturnType<typeof useTableBulkSelection<T>>["selection"];
} {
  const { noun, rows, getRowName, deleteOne, protectedReason, consequence, extraVerbs = [] } = options;
  const label = options.deleteLabel ?? "Delete";
  const verb = options.verb ?? "Delete";
  const countLabel = (n: number) => aiTableCountLabel(n, noun, options.nounPlural);
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
          done: options.done ?? "Deleted",
          removesRows: true,
          skipReason: (row) => protectedReason?.(row) ?? null,
          confirm: (targets) => ({
            title: `${verb} ${countLabel(targets.ids.length)}?`,
            description: `${consequence} Refused ones are named and skipped.`,
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
