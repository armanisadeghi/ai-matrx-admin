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
//   moveBulkAction   "Move to…" — THE home picker (`pickHome`), then the one
//                    move door `platform.set_home` per row.
//   shareBulkAction  "Share…" — the Share dialog's People form
//                    (`shareWithPeople`), then `share_resource_with_user` per
//                    row through `shareWithUser`.
//   restoreBulkAction "Restore" — out of Trash (archived) through the one
//                    restore door (`restoreFromTrash` → `entity_undelete`).
//   tagBulkAction    "Add tag" — THE tag picker (`pickTag`: your tags, or a
//                    new name), then `platform.file_under_tag` per row.
//
// ARCHIVE IS TRASH. The platform has ONE archive door (`archiveRecord` writes
// `deleted_at`) and ONE way back (`entity_undelete`), so "Archive" is the
// built-in "Move to Trash" and "Unarchive" is "Restore" — never a second pair.
// Which of the two a bar shows follows the view (`archivedView`): an archived-
// only view shows Restore and no Trash; an active-only view the reverse.
//
// 🚨 A bulk action never decides who may tick a row. `bulkSelection.
// isRowSelectable` is for rows NO action can ever touch; one feature's limits
// live inside that feature's own `run` (skip + report), so the next action a
// surface adds is not silently blocked on rows the first one could not handle.

import { ArchiveRestore, House, Share2, Star, StarOff, Tag, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { supabase } from "@/utils/supabase/client";
import { archiveRecord, carryOnTableRestore, restoreFromTrash } from "@/features/trash/service";
import { fileUnderTag } from "@/features/knowledge/hub/tags/tagApi";
import { pickTag } from "@/features/knowledge/hub/tags/tagPickerOpener";
import { isArchivedRow } from "./archivedRow";
import type { ArchivedFilter } from "./types";
import { pickHome } from "@/features/scopes/homes/homePickerOpener";
import { resolveHomeScopeId, setHome } from "@/features/scopes/homes/setHome";
import { shareWithPeople } from "@/features/sharing/bulk/shareWithPeopleOpener";
import type { PermissionLevel, ShareActionResult } from "@ai-matrx/sharing/core";
import { BulkNoneDoneError, copySkippedAction, skippedLine } from "./bulkSkipped";
import { isCmsTrashToken } from "@/features/trash/cmsKinds";
import {
  bulkCountLabel,
  type BulkSkip,
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
 * fail are named with their reason in one warning toast and STAY SELECTED
 * (`keepIds`). Throws only when NOTHING succeeded, so the shell keeps the
 * selection and says so.
 */
export async function runPerRow<TRow>(
  selection: EntityBulkSelection<TRow>,
  verb: (id: string, row: TRow | undefined) => Promise<void>,
  options: PerRowOptions<TRow>,
  rowIdOf: (row: TRow) => string,
): Promise<EntityBulkActionResult> {
  const rowsById = new Map(selection.rows.map((row) => [rowIdOf(row), row]));
  const succeeded: string[] = [];
  const skipped: BulkSkip[] = [];

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
        id,
        name: row && options.labelOf ? options.labelOf(row) : id,
        reason,
      });
    });
  }

  return reportPerRow(succeeded, skipped, options);
}

/**
 * THE ONE OUTCOME SENTENCE for a verb that ran over a selection: succeeded rows
 * counted, skipped rows NAMED with their reason in one warning toast (five
 * inline, then "+N more" and Copy list). The skipped rows stay selected
 * (`keepIds`) and the done ones are unticked. Throws only when nothing
 * succeeded, so the shell keeps the selection and says so.
 * `runPerRow` ends here; a verb with its own batch door reports through it too.
 */
export function reportPerRow(
  succeeded: string[],
  skipped: BulkSkip[],
  options: Pick<PerRowOptions<never>, "done" | "noun" | "removesRows">,
): EntityBulkActionResult {
  const line = skippedLine(skipped);

  if (succeeded.length === 0) {
    throw new BulkNoneDoneError(
      `None done. ${bulkCountLabel(skipped.length, options.noun)} skipped — ${line}`,
      skipped,
    );
  }
  if (skipped.length > 0) {
    const copy = copySkippedAction(skipped);
    toast.warning(`${bulkCountLabel(skipped.length, options.noun)} skipped`, {
      description: line,
      ...(copy ? { action: copy } : {}),
    });
  }
  const keepIds = skipped.flatMap((s) => (s.id === undefined ? [] : [s.id]));
  return {
    message: `${options.done}: ${bulkCountLabel(succeeded.length, options.noun)}.`,
    ...(options.removesRows ? { removedIds: succeeded } : {}),
    ...(keepIds.length ? { keepIds } : {}),
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
          skipReason: (row) => (isArchivedRow(row) ? "Already in Trash" : (args.appliesTo?.(row) ?? null)),
        },
        args.rowIdOf,
      ),
  };
}

/**
 * IS THIS ROW IN TRASH — read from what the Trash door itself writes. `archiveRecord` sets
 * `deleted_at` and `entity_undelete` clears it, so that column is the authority; `is_archived` /
 * `archived_at` are other lifecycles and never decide it. A row whose projection does not carry
 * `deleted_at` is UNKNOWN (null), never "not in Trash": the restore door answers for it.
 */
export function rowInTrash(row: unknown): boolean | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  const key = "deleted_at" in r ? "deleted_at" : "deletedAt" in r ? "deletedAt" : null;
  if (key === null) return null;
  return r[key] !== null && r[key] !== undefined;
}

/**
 * "Restore" — bring every selected trashed row back through THE TRASH PAGE'S OWN DOOR for the
 * main database (`features/trash/sources.ts` → `mainTrashSource.restore`): `restoreFromTrash`
 * (`entity_undelete`) then `carryOnTableRestore`, which brings a custom Table's records, forms,
 * views and dashboards back pass by pass — without it a Table came back half-restored under a
 * green toast. Site content (CMS tokens) lives in another database and is restored from Trash
 * only; this says so by name.
 *
 * "In Trash" follows the VIEW first: in an archived-only view every row is in Trash by definition
 * (nothing is skipped on that axis); in an "all" view a row whose `deleted_at` is present and
 * empty is skipped as "Not in Trash"; a row that does not carry the column runs and the door
 * answers. A refusal (a taken name, no edit access) is named with the database's own sentence.
 */
export function restoreBulkAction<TRow>(
  args: BuiltInVerbArgs<TRow> & { archivedView?: ArchivedFilter },
): EntityBulkAction<TRow> {
  const trustView = args.archivedView === "archived";
  const notInTrash = (row: TRow) => !trustView && rowInTrash(row) === false;
  return {
    id: "restore",
    label: "Restore",
    icon: ArchiveRestore,
    disabledReason: (_count, selection) =>
      selection.rows.length > 0 && selection.rows.length === selection.ids.length && selection.rows.every(notInTrash)
        ? "None of these are in Trash"
        : null,
    run: (selection) => {
      if (isCmsTrashToken(args.token)) {
        throw new Error(`Restore site content from Trash — ${args.noun} records restore there.`);
      }
      return runPerRow(
        selection,
        async (id, row) => {
          // The carry-on needs the Table's organization; without it nothing runs (never half).
          const organizationId = rowString(row, "organization_id") ?? selection.filter.orgId;
          if (args.token === "record" && !organizationId) throw new Error("Not loaded — restore it from Trash");
          await restoreFromTrash(args.token, id);
          // The Trash page's carry-on: a Table's records come back pass by pass.
          await carryOnTableRestore(args.token, organizationId, id);
        },
        {
          done: "Restored",
          noun: args.noun,
          labelOf: args.labelOf,
          skipReason: (row) => (notInTrash(row) ? "Not in Trash" : (args.appliesTo?.(row) ?? null)),
        },
        args.rowIdOf,
      );
    },
  };
}

/** Favorite or unfavourite every selected row for the signed-in person (`ues_set`). */
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

/** Pick one tag (THE tag picker: yours, or a new name), then file every selected row under it (`platform.file_under_tag`). */
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
      const picked = await pickTag({
        title: `Tag ${bulkCountLabel(selection.count, args.noun)}`,
        count: selection.count,
      });
      const name = picked?.trim();
      // Closed without a choice: resolve with nothing, so the shell keeps the selection.
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

/** A column a list row may carry (rows are each surface's own shape). */
function rowField(row: unknown, key: string): unknown {
  return row && typeof row === "object" ? (row as Record<string, unknown>)[key] : undefined;
}
const rowString = (row: unknown, key: string): string | null => {
  const value = rowField(row, key);
  return typeof value === "string" && value ? value : null;
};

interface BuiltInVerbArgs<TRow> {
  token: string;
  noun: string;
  rowIdOf: (row: TRow) => string;
  labelOf?: (row: TRow) => string;
  appliesTo?: (row: TRow) => string | null;
}

/**
 * Move every selected row to one home through `platform.set_home`. Each row
 * carries the `version` the list read (a row changed since is refused by the
 * database and named); a row the list does not hold moves unversioned.
 */
export function moveSelectionToHome<TRow>(
  selection: EntityBulkSelection<TRow>,
  home: { scopeId: string; label: string },
  args: BuiltInVerbArgs<TRow>,
): Promise<EntityBulkActionResult> {
  return runPerRow(
    selection,
    async (id, row) => {
      const version = rowField(row, "version");
      const moved = await setHome({
        entityType: args.token,
        entityId: id,
        scopeId: home.scopeId,
        expectedVersion: typeof version === "number" ? version : null,
      });
      if (!moved.ok) throw new Error(moved.message);
    },
    {
      done: `Moved to ${home.label}`,
      noun: args.noun,
      labelOf: args.labelOf,
      skipReason: args.appliesTo,
    },
    args.rowIdOf,
  );
}

/** "Move to…" — pick a home (THE home picker), then move every row there. */
export function moveBulkAction<TRow>(args: BuiltInVerbArgs<TRow>): EntityBulkAction<TRow> {
  return {
    // Notes' own move (its Redux-held path) carries this id and takes this place.
    id: "move-home",
    label: "Move to…",
    icon: House,
    run: async (selection) => {
      const first = selection.rows[0];
      const picked = await pickHome({
        title: `Move ${bulkCountLabel(selection.count, args.noun)} to…`,
        currentScopeId: selection.count === 1 ? rowString(first, "home_scope_id") : null,
        initialOrganizationId: rowString(first, "organization_id"),
      });
      // Closed without a choice: nothing done, the selection stays.
      if (!picked) return;
      const resolved = await resolveHomeScopeId(picked.home.scopeId);
      if (!resolved.ok) throw new Error(resolved.message);
      return moveSelectionToHome(selection, { scopeId: resolved.scopeId, label: picked.label }, args);
    },
  };
}

/**
 * Grant one person `level` on every selected row through `shareWithUser`
 * (`share_resource_with_user`). The door answers `{success:false, error}`
 * instead of raising: that row is skipped and named with its sentence.
 * Answers like the single-record door, so the People form shows it in place.
 */
export async function shareSelectionWithPerson<TRow>(
  selection: EntityBulkSelection<TRow>,
  userId: string,
  level: PermissionLevel,
  args: BuiltInVerbArgs<TRow>,
): Promise<ShareActionResult> {
  // Loaded on use: this module rides every list page.
  const { RESOURCE_TYPES } = await import("@ai-matrx/sharing/core");
  const resourceType = RESOURCE_TYPES.find((type) => type === args.token);
  if (!resourceType) {
    return { success: false, error: `${args.noun} records cannot be shared from a list yet.` };
  }
  const { shareWithUser } = await import("@ai-matrx/sharing/core");
  try {
    const result = await runPerRow(
      selection,
      async (id, row) => {
        const organizationId = rowString(row, "organization_id");
        const answer = await shareWithUser({
          resourceType,
          resourceId: id,
          userId,
          permissionLevel: level,
          ...(organizationId ? { organizationId } : {}),
        });
        if (!answer.success) throw new Error(answer.error || "Not shared");
      },
      {
        done: "Shared",
        noun: args.noun,
        labelOf: args.labelOf,
        skipReason: args.appliesTo,
      },
      args.rowIdOf,
    );
    return { success: true, ...(result.message ? { message: result.message } : {}) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** "Share…" — the Share dialog's People form, granting each chosen person on every row. */
export function shareBulkAction<TRow>(args: BuiltInVerbArgs<TRow>): EntityBulkAction<TRow> {
  return {
    // Notes' own share carries this id and takes this place.
    id: "share",
    label: "Share…",
    icon: Share2,
    run: async (selection) => {
      const { RESOURCE_TYPES } = await import("@ai-matrx/sharing/core");
      const resourceType = RESOURCE_TYPES.find((type) => type === args.token);
      if (!resourceType) throw new Error(`${args.noun} records cannot be shared from a list yet.`);
      const organizations = new Set(selection.rows.map((row) => rowString(row, "organization_id")));
      const [onlyOrganization] = organizations;
      const answer = await shareWithPeople({
        title: `Share ${bulkCountLabel(selection.count, args.noun)}`,
        resourceType,
        resourceIds: selection.ids,
        ...(organizations.size === 1 && onlyOrganization ? { organizationId: onlyOrganization } : {}),
        shareOne: (userId, level) => shareSelectionWithPerson(selection, userId, level, args),
      });
      // Closed with nobody granted: nothing done, the selection stays.
      if (answer.shared === 0) return;
      return {
        message: `Shared ${bulkCountLabel(selection.count, args.noun)} with ${answer.shared === 1 ? "1 person" : `${answer.shared} people`}.`,
        refresh: true,
      };
    },
  };
}

/** Which built-in verbs a surface keeps. Every one is on unless set to false. */
export interface StandardBulkActionsConfig<TRow = never> {
  trash?: boolean;
  favorite?: boolean;
  tag?: boolean;
  /** "Move to…" (`platform.set_home`). */
  move?: boolean;
  /** "Share…" (`share_resource_with_user`). */
  share?: boolean;
  /** "Restore" out of Trash (`entity_undelete`) — the Unarchive. Shown when the view can hold archived rows. */
  restore?: boolean;
  /**
   * For lists that mix record types or hold rows the built-ins cannot act on:
   * return a short reason to skip (and name) that row, or null to act on it.
   */
  appliesTo?: (row: TRow) => string | null;
}

/**
 * THE BUILT-IN BULK SET. Every list that names its record type
 * (`registryToken`) gets these without writing any code; a surface turns one
 * off with `standardBulkActions: { trash: false }` (keys: favorite, tag, move,
 * share, restore, trash), or all with `false`.
 * The archive pair follows `archivedView`: "active" (the default) → Move to
 * Trash; "archived" → Restore; "all" → both, each skipping and naming the rows
 * it does not apply to.
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
  /** Which rows the view shows (the list's archive axis). Default "active". */
  archivedView?: ArchivedFilter;
}): EntityBulkAction<TRow>[] {
  if (!args.token || args.config === false) return [];
  const on = (key: "trash" | "favorite" | "tag" | "move" | "share" | "restore") =>
    !args.config || args.config[key] !== false;
  const view = args.archivedView ?? "active";
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
    ...(on("move") ? [moveBulkAction<TRow>(base)] : []),
    ...(on("share") ? [shareBulkAction<TRow>(base)] : []),
    ...(on("restore") && view !== "active" ? [restoreBulkAction<TRow>({ ...base, archivedView: view })] : []),
    ...(on("trash") && view !== "archived" ? [trashBulkAction<TRow>(base)] : []),
  ];
}

/**
 * The surface's own actions, then the built-ins. An own action with a
 * built-in's id takes that built-in's PLACE, so every bar reads in the same
 * order (Favorite · Unfavorite · Add tag · Move to… · Share… · Restore · Move to Trash)
 * whoever implements it.
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
