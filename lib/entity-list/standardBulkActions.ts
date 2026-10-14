"use client";

// lib/entity-list/standardBulkActions.ts
//
// SHARED BULK VERBS — what any EntityListPage surface can switch on without
// writing its own. Two pieces:
//
//   runPerRow        do one per-row verb across a selection, keep going past
//                    refusals, and report every skipped row BY NAME with the
//                    database's own reason. This is how a surface offers a bulk
//                    action without narrowing who gets a checkbox: a row the
//                    verb cannot touch is skipped and named, never hidden.
//   trashBulkAction  "Move to Trash" for any registered, soft-deletable entity
//                    token, through the platform's one archive door
//                    (`archiveRecord`), restorable from Trash.
//
// 🚨 A bulk action never decides who may tick a row. `bulkSelection.
// isRowSelectable` is for rows NO action can ever touch; one feature's limits
// live inside that feature's own `run` (skip + report), so the next action a
// surface adds is not silently blocked on rows the first one could not handle.

import { Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { archiveRecord } from "@/features/trash/service";
import {
  bulkCountLabel,
  type EntityBulkAction,
  type EntityBulkActionResult,
  type EntityBulkSelection,
} from "./selection";

/** How many rows one verb works on at once — a courtesy to the database, not a limit. */
const PER_ROW_CONCURRENCY = 5;

export interface PerRowOptions<TRow> {
  /** Past-tense phrase for the success line, e.g. "Moved to Trash". */
  done: string;
  /** Singular noun for counts ("shape"). */
  noun: string;
  /** A row's human name for the skipped list. Falls back to its id. */
  labelOf?: (row: TRow) => string;
  /** Ids to drop from the list after success (a removal verb). */
  removesRows?: boolean;
}

/**
 * Run `verb` on every selected id. Rows that succeed are counted; rows that
 * fail are named with their reason in one warning toast. Throws only when
 * NOTHING succeeded, so the shell keeps the selection and says so.
 */
export async function runPerRow<TRow>(
  selection: EntityBulkSelection<TRow>,
  verb: (id: string, row: TRow | undefined) => Promise<void>,
  options: PerRowOptions<TRow>,
  rowIdOf: (row: TRow) => string,
): Promise<EntityBulkActionResult> {
  const rowsById = new Map(selection.rows.map((row) => [rowIdOf(row), row]));
  const succeeded: string[] = [];
  const skipped: { name: string; reason: string }[] = [];

  for (let i = 0; i < selection.ids.length; i += PER_ROW_CONCURRENCY) {
    const batch = selection.ids.slice(i, i + PER_ROW_CONCURRENCY);
    const outcomes = await Promise.allSettled(
      batch.map((id) => verb(id, rowsById.get(id))),
    );
    outcomes.forEach((outcome, index) => {
      const id = batch[index];
      if (outcome.status === "fulfilled") {
        succeeded.push(id);
        return;
      }
      const row = rowsById.get(id);
      const reason =
        outcome.reason instanceof Error
          ? outcome.reason.message
          : String(outcome.reason);
      skipped.push({
        name: row && options.labelOf ? options.labelOf(row) : id,
        reason,
      });
    });
  }

  const skippedLine = skipped
    .slice(0, 5)
    .map((s) => `${s.name}: ${s.reason}`)
    .join(" · ");
  const more = skipped.length > 5 ? ` · and ${skipped.length - 5} more` : "";

  if (succeeded.length === 0) {
    throw new Error(
      `None done. ${bulkCountLabel(skipped.length, options.noun)} skipped — ${skippedLine}${more}`,
    );
  }
  if (skipped.length > 0) {
    toast.warning(`${bulkCountLabel(skipped.length, options.noun)} skipped`, {
      description: `${skippedLine}${more}`,
    });
  }
  return {
    message: `${options.done}: ${bulkCountLabel(succeeded.length, options.noun)}.`,
    ...(options.removesRows ? { removedIds: succeeded } : {}),
    refresh: true,
  };
}

/**
 * "Move to Trash" for any registered, soft-deletable entity token. Each row
 * goes through `archiveRecord` (row security decides; refusals are skipped and
 * named), and every one can be restored from Trash.
 */
export function trashBulkAction<TRow>(args: {
  token: string;
  noun: string;
  rowIdOf: (row: TRow) => string;
  labelOf?: (row: TRow) => string;
}): EntityBulkAction<TRow> {
  return {
    id: "move-to-trash",
    label: "Move to Trash",
    icon: Trash2,
    variant: "destructive",
    confirm: (selection) => ({
      title: `Move ${bulkCountLabel(selection.count, args.noun)} to Trash?`,
      description:
        "They can be restored from Trash. Any you can't delete are skipped and named.",
      confirmLabel: "Move to Trash",
      variant: "destructive",
    }),
    run: (selection) =>
      runPerRow(
        selection,
        (id, row) =>
          archiveRecord(args.token, id, row && args.labelOf ? args.labelOf(row) : "this"),
        {
          done: "Moved to Trash",
          noun: args.noun,
          labelOf: args.labelOf,
          removesRows: true,
        },
        args.rowIdOf,
      ),
  };
}
