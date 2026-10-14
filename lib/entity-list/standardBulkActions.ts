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

import { Star, StarOff, Tag, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { supabase } from "@/utils/supabase/client";
import { archiveRecord } from "@/features/trash/service";
import { fileUnderTag } from "@/features/knowledge/hub/tags/tagApi";
import { promptForValues } from "@/components/dialogs/value-prompts/valuePromptsOpener";
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
  /** A reason to skip a loaded row without calling the verb; null = run it. */
  skipReason?: (row: TRow) => string | null;
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
      batch.map(async (id) => {
        const row = rowsById.get(id);
        const reason = row && options.skipReason ? options.skipReason(row) : null;
        if (reason) throw new Error(reason);
        await verb(id, row);
      }),
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
  appliesTo?: (row: TRow) => string | null;
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
          skipReason: args.appliesTo,
        },
        args.rowIdOf,
      ),
  };
}

/** Favourite or unfavourite every selected row for the signed-in person (`ues_set`). */
export function favoriteBulkAction<TRow>(args: {
  token: string;
  noun: string;
  rowIdOf: (row: TRow) => string;
  labelOf?: (row: TRow) => string;
  appliesTo?: (row: TRow) => string | null;
  favorite: boolean;
}): EntityBulkAction<TRow> {
  return {
    id: args.favorite ? "favorite" : "unfavorite",
    label: args.favorite ? "Favorite" : "Unfavorite",
    icon: args.favorite ? Star : StarOff,
    run: (selection) =>
      runPerRow(
        selection,
        async (id) => {
          const { error } = await supabase.rpc("ues_set", {
            p_entity_type: args.token,
            p_entity_id: id,
            p_is_favorite: args.favorite,
          });
          if (error) throw new Error(error.message);
        },
        {
          done: args.favorite ? "Added to favorites" : "Removed from favorites",
          noun: args.noun,
          labelOf: args.labelOf,
          skipReason: args.appliesTo,
        },
        args.rowIdOf,
      ),
  };
}

/** Ask for one tag name, then file every selected row under it (`platform.file_under_tag`). */
export function tagBulkAction<TRow>(args: {
  token: string;
  noun: string;
  rowIdOf: (row: TRow) => string;
  labelOf?: (row: TRow) => string;
  appliesTo?: (row: TRow) => string | null;
}): EntityBulkAction<TRow> {
  return {
    id: "add-tag",
    label: "Add tag",
    icon: Tag,
    run: async (selection) => {
      const answers = await promptForValues({
        title: `Tag ${bulkCountLabel(selection.count, args.noun)}`,
        description: "A new name creates the tag.",
        submitLabel: "Add tag",
        fields: [{ name: "tag", prompt: "Tag name" }],
      });
      const name = answers?.tag?.trim();
      // Cancelled or empty: resolve with nothing, so the shell keeps the selection.
      if (!name) return;
      return runPerRow(
        selection,
        async (id) => {
          await fileUnderTag(args.token, id, name);
        },
        {
          done: `Tagged "${name}"`,
          noun: args.noun,
          labelOf: args.labelOf,
          skipReason: args.appliesTo,
        },
        args.rowIdOf,
      );
    },
  };
}

/** Which built-in verbs a surface keeps. Every one is on unless set to false. */
export interface StandardBulkActionsConfig<TRow = never> {
  trash?: boolean;
  favorite?: boolean;
  tag?: boolean;
  /**
   * For lists that mix record types or hold rows the built-ins cannot act on:
   * return a short reason to skip (and name) that row, or null to act on it.
   */
  appliesTo?: (row: TRow) => string | null;
}

/**
 * THE BUILT-IN BULK SET. Every list that names its record type
 * (`registryToken`) gets these without writing any code; a surface turns one
 * off with `standardBulkActions: { trash: false }`, or all with `false`.
 * The surface's own actions come first, and an own action with the same id
 * replaces the built-in one.
 */
export function standardBulkActionsFor<TRow>(args: {
  token: string | undefined;
  noun: string;
  rowIdOf: (row: TRow) => string;
  labelOf?: (row: TRow) => string;
  config: StandardBulkActionsConfig<TRow> | false | undefined;
  /**
   * Whether this screen shows favorites at all (a star or favorites-first).
   * False → no Favorite verbs: a toast saying "added" with nothing visible
   * changing is a lie.
   */
  favoritesShown?: boolean;
}): EntityBulkAction<TRow>[] {
  if (!args.token || args.config === false) return [];
  const on = (key: "trash" | "favorite" | "tag") =>
    !args.config || args.config[key] !== false;
  const base = {
    token: args.token,
    noun: args.noun,
    rowIdOf: args.rowIdOf,
    labelOf: args.labelOf,
    appliesTo: args.config ? args.config.appliesTo : undefined,
  };
  return [
    ...(on("favorite") && args.favoritesShown !== false
      ? [
          favoriteBulkAction<TRow>({ ...base, favorite: true }),
          favoriteBulkAction<TRow>({ ...base, favorite: false }),
        ]
      : []),
    ...(on("tag") ? [tagBulkAction<TRow>(base)] : []),
    ...(on("trash") ? [trashBulkAction<TRow>(base)] : []),
  ];
}

/**
 * The surface's own actions, then the built-ins. An own action with a
 * built-in's id takes that built-in's PLACE, so every bar reads in the same
 * order (Favorite · Unfavorite · Add tag · Move to Trash) whoever implements it.
 */
export function mergeBulkActions<TRow>(
  own: EntityBulkAction<TRow>[],
  standard: EntityBulkAction<TRow>[],
): EntityBulkAction<TRow>[] {
  const standardIds = new Set(standard.map((action) => action.id));
  const replacing = new Map(
    own.filter((action) => standardIds.has(action.id)).map((action) => [action.id, action]),
  );
  return [
    ...own.filter((action) => !replacing.has(action.id)),
    ...standard.map((action) => replacing.get(action.id) ?? action),
  ];
}
