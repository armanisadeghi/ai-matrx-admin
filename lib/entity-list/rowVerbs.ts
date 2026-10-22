"use client";

// lib/entity-list/rowVerbs.ts
//
// THE BULK TWIN RULE — one declaration, two surfaces.
//
// A verb a person can do to ONE row is offered, the same way, when they select
// MANY. It drifted on ~95 lists because the row action and the bulk action were
// written twice (spend approvals: five row verbs, three bulk buttons). So a verb
// is declared ONCE here and both surfaces come out of that declaration:
//
//   defineRowVerbs(verbs, { noun, getRowId, getRowName })
//     → { rowActionDefs, bulkActions }        for a MatrxDataTable / EntityListPage
//
//   bulkActionsFromRowVerbs(registry, twins, { noun, getRowId, blocked })
//     → bulkActions                           for a verb REGISTRY (ItemMenuConfig-
//                                             style menus, `allUserActions()`):
//                                             `twins` is keyed by every verb id,
//                                             so a new verb without a bulk decision
//                                             is a type error.
//
// Every verb carries `bulk`: its twin, or `false` with a one-word `noBulk`
// reason ("single" for Open / Edit / History). There is no third state, so a
// verb cannot simply be forgotten on the bar.
//
// A selected row the verb does not apply to (its `appliesTo` says false, it is
// `disabled`, or the twin's `skipReason` names one) is SKIPPED AND NAMED in the
// one warning toast — never silently dropped and never pre-filtered out of the
// selection (`isRowSelectable` is only for rows no verb can ever touch). A bar
// button whose verb applies to none of the loaded selection is grayed with the
// first row's reason as its tooltip.
//
// A verb that needs ONE value for the whole selection (an expiry date, a status
// to set) asks it in its confirm: `confirm: () => ({ …, ask: { kind: "date" | "choice", … } })`;
// the value reaches `runOne` / `run` as `input.value`. A reason is
// `confirm.reason` → `input.reason`. Both reuse the shell's dialogs.

import type { ComponentType } from "react";
import type { MatrxTableRowActionDef } from "@ai-matrx/design-system/data-table/types";
import {
  bulkCountLabel,
  type BulkSkip,
  type EntityBulkAction,
  type EntityBulkActionConfirm,
  type EntityBulkActionInput,
  type EntityBulkActionResult,
  type EntityBulkSelection,
} from "./selection";
import { reportPerRow, runPerRow } from "./standardBulkActions";

/**
 * Why a verb has no bulk twin — one word, read by people and by `check:bulk-parity`.
 *   single   only makes sense on one record (History, Rename, Duplicate here)
 *   open     opens or navigates to the record
 *   edit     opens the record's editor
 *   view     shows something (details, preview) and changes nothing
 *   copy     copies one record's value
 */
export type NoBulkReason = "single" | "open" | "edit" | "view" | "copy";

/** The rows a twin actually runs on: the selection minus every skipped row. */
export interface BulkTargets<T> {
  ids: string[];
  /** The loaded rows among `ids` (a selection can outlive a page — see `EntityBulkSelection.rows`). */
  rows: T[];
}

/**
 * What a batch twin (`run`) answers: every id it could not do, with the reason, and — when it ran
 * on ids it did not hold a row for — the ids it actually did (`done`).
 *
 * 🚨 AN UNLOADED ROW IS NEVER COUNTED AS DONE. A selection can outlive a page, so `targets.ids`
 * may hold ids with no row in `targets.rows`. A twin that loops `targets.rows` never touches them.
 * So unless the twin names them in `done`, an unloaded id that is not in `failed` is skipped and
 * NAMED ("Not loaded"), never reported as done. A batch door that acts on ids (one RPC over every
 * id) returns `done: targets.ids` minus its failures.
 */
export interface BulkBatchOutcome {
  failed?: { id: string; reason: string }[];
  /** Ids the twin actually did. Absent → every LOADED target not in `failed`. */
  done?: string[];
}

/** The skip sentence for a selected id whose row the list does not hold. */
export const NOT_LOADED_REASON = "Not loaded — show it in the list and try again";

interface BulkTwinBase<T> {
  /** The bar's label. Default: the verb's label. */
  label?: string;
  /** Past-tense phrase for the success line ("Approved"). Default: the label. */
  done?: string;
  variant?: EntityBulkAction<T>["variant"];
  /** The verb removes rows from this list (drop them locally on success). */
  removesRows?: boolean;
  /**
   * Stop and name the consequence first; may ask one `reason` or one value (`ask`).
   * Gets the rows that will run (skipped ones are already out). Destructive verbs
   * without one get a default confirm naming the count.
   */
  confirm?: (targets: BulkTargets<T>, selection: EntityBulkSelection<T>) => EntityBulkActionConfirm | null;
  /** A reason to skip (and name) a row on top of `appliesTo`, or null to run it. */
  skipReason?: (row: T) => string | null;
}

/** The bulk twin of a row verb: one per-row door (`runOne`) or one batch door (`run`). */
export type BulkTwin<T> = BulkTwinBase<T> &
  (
    | {
        /** The per-row door, run across the selection by `runPerRow` (5 at a time, refusals named). */
        runOne: (id: string, row: T | undefined, input: EntityBulkActionInput) => Promise<void>;
        run?: never;
      }
    | {
        /**
         * One batch door for every target. Resolve `undefined` when it did not run (its own
         * dialog was canceled); otherwise name every id that failed.
         */
        run: (
          targets: BulkTargets<T>,
          input: EntityBulkActionInput,
          selection: EntityBulkSelection<T>,
        ) => Promise<BulkBatchOutcome | void>;
        runOne?: never;
      }
  );

/** A row action declared with its bulk decision. */
export type RowVerb<T> = MatrxTableRowActionDef<T> &
  ({ bulk: BulkTwin<T>; noBulk?: never } | { bulk: false; noBulk: NoBulkReason });

export interface RowVerbOptions<T> {
  /** Singular noun for counts ("approval"). */
  noun: string;
  getRowId: (row: T) => string;
  /** A row's human name in the skipped list. Falls back to its id. */
  getRowName?: (row: T) => string;
}

/** What a verb looks like to the bar, whichever declaration it came from. */
interface VerbFace<T> {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  destructive: boolean;
  /** Why this row is skipped, or null to run it. */
  skipOf: (row: T) => string | null;
}

/** One bulk twin → one `EntityBulkAction`, with skip-and-name, confirm and input. */
function twinToBulkAction<T>(face: VerbFace<T>, twin: BulkTwin<T>, options: RowVerbOptions<T>): EntityBulkAction<T> {
  const label = twin.label ?? face.label;
  const done = twin.done ?? label;
  const skipOf = (row: T) => twin.skipReason?.(row) ?? face.skipOf(row);
  const targetsOf = (selection: EntityBulkSelection<T>): BulkTargets<T> & { skipped: BulkSkip[] } => {
    const rowsById = new Map(selection.rows.map((row) => [options.getRowId(row), row]));
    const ids: string[] = [];
    const rows: T[] = [];
    const skipped: BulkSkip[] = [];
    for (const id of selection.ids) {
      const row = rowsById.get(id);
      const reason = row === undefined ? null : skipOf(row);
      if (reason) {
        skipped.push({ id, name: row && options.getRowName ? options.getRowName(row) : id, reason });
        continue;
      }
      ids.push(id);
      if (row !== undefined) rows.push(row);
    }
    return { ids, rows, skipped };
  };

  const variant = twin.variant ?? (face.destructive ? "destructive" : undefined);
  return {
    id: face.id,
    label,
    ...(face.icon ? { icon: face.icon } : {}),
    ...(variant ? { variant } : {}),
    disabledReason: (_count, selection) => {
      // Gray only when the bar can SEE every selected row and none takes the verb.
      if (selection.rows.length === 0 || selection.rows.length < selection.ids.length) return null;
      const reasons = selection.rows.map(skipOf);
      return reasons.every(Boolean) ? (reasons[0] as string) : null;
    },
    confirm: (selection) => {
      const targets = targetsOf(selection);
      // Every selected row is skipped: no "Approve 0 approvals?" dialog — the run names each skip.
      if (targets.ids.length === 0) return null;
      if (twin.confirm) return twin.confirm(targets, selection);
      if (!face.destructive) return null;
      return {
        title: `${label} ${bulkCountLabel(targets.ids.length, options.noun)}?`,
        description: targets.skipped.length
          ? `${bulkCountLabel(targets.skipped.length, options.noun)} will be skipped and named.`
          : "Any that refuse are skipped and named.",
        confirmLabel: label,
        variant: "destructive",
      };
    },
    run: async (selection, input = {}): Promise<EntityBulkActionResult | void> => {
      const reportOptions = { done, noun: options.noun, ...(twin.removesRows ? { removesRows: true } : {}) };
      if (twin.runOne) {
        const runOne = twin.runOne;
        return runPerRow(
          selection,
          (id, row) => runOne(id, row, input),
          {
            ...reportOptions,
            ...(options.getRowName ? { labelOf: options.getRowName } : {}),
            skipReason: skipOf,
          },
          options.getRowId,
        );
      }
      const targets = targetsOf(selection);
      const skipped: BulkSkip[] = [...targets.skipped];
      if (targets.ids.length === 0) return reportPerRow([], skipped, reportOptions);
      const outcome = await twin.run({ ids: targets.ids, rows: targets.rows }, input, selection);
      // The batch door's own dialog was canceled: nothing ran, the selection stays.
      if (outcome === undefined) return;
      const rowsById = new Map(targets.rows.map((row) => [options.getRowId(row), row]));
      const failed = new Map((outcome.failed ?? []).map((f) => [f.id, f.reason]));
      const saidDone = outcome.done ? new Set(outcome.done) : null;
      const succeeded: string[] = [];
      for (const id of targets.ids) {
        const row = rowsById.get(id);
        const name = row && options.getRowName ? options.getRowName(row) : id;
        const failure = failed.get(id);
        if (failure !== undefined) skipped.push({ id, name, reason: failure });
        else if (saidDone ? saidDone.has(id) : row !== undefined) succeeded.push(id);
        else skipped.push({ id, name, reason: saidDone ? "Did not run" : NOT_LOADED_REASON });
      }
      return reportPerRow(succeeded, skipped, reportOptions);
    },
  };
}

/** A verb's own skip rule: `appliesTo` false → its unavailable sentence; `disabled` → busy. */
function rowVerbSkip<T>(verb: MatrxTableRowActionDef<T>): (row: T) => string | null {
  return (row) => {
    if (verb.appliesTo && !verb.appliesTo(row)) return verb.unavailableTooltip ?? `${verb.label} doesn't apply`;
    const disabled = typeof verb.disabled === "function" ? verb.disabled(row) : verb.disabled;
    // A verb disabled for a stated reason says it; only a reasonless disable reads as busy.
    if (disabled) return verb.unavailableTooltip ?? "Busy — try again";
    return null;
  };
}

/**
 * DECLARE EACH ROW VERB ONCE; get the row action AND its bulk twin.
 *
 *   const { rowActionDefs, bulkActions } = defineRowVerbs<Row>([
 *     { id: "approve", icon: Check, label: "Approve", appliesTo: (r) => r.status !== "approved",
 *       onClick: (r) => openApprove(r),
 *       bulk: { done: "Approved", runOne: (id) => approve(id) } },
 *     { id: "history", icon: History, label: "History", onClick: openHistory,
 *       bulk: false, noBulk: "single" },
 *   ], { noun: "approval", getRowId: (r) => r.id, getRowName: (r) => r.name });
 *
 *   const bulk = useTableBulkSelection({ noun: "approval", rows, getRowId, actions: bulkActions, onRefresh });
 *   <MatrxDataTable rowActionDefs={rowActionDefs} selection={bulk.selection} … />
 *   // or EntityListPage: config.bulkActions = bulkActions
 */
export function defineRowVerbs<T>(
  verbs: readonly RowVerb<T>[],
  options: RowVerbOptions<T>,
): { rowActionDefs: MatrxTableRowActionDef<T>[]; bulkActions: EntityBulkAction<T>[] } {
  const rowActionDefs: MatrxTableRowActionDef<T>[] = [];
  const bulkActions: EntityBulkAction<T>[] = [];
  for (const verb of verbs) {
    const { bulk, noBulk: _noBulk, ...def } = verb;
    rowActionDefs.push(def);
    if (bulk === false) continue;
    bulkActions.push(
      twinToBulkAction(
        {
          id: def.id,
          label: def.label,
          icon: def.icon,
          destructive: def.tone === "destructive",
          skipOf: rowVerbSkip(def),
        },
        bulk,
        options,
      ),
    );
  }
  return { rowActionDefs, bulkActions };
}

/** The least a registry verb carries (`UserActionDef`, a menu registry entry). */
export interface RegistryVerb {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  danger?: boolean;
}

/** A registry verb's bulk decision: its twin, or no twin with a one-word reason. */
export type RegistryTwin<T> = BulkTwin<T> | { noBulk: NoBulkReason };

/**
 * THE SAME RULE FOR A VERB REGISTRY. `twins` is keyed by EVERY verb id in the
 * registry — a verb added to the registry without a bulk decision fails the
 * type check. `blocked(verb, row)` is the registry's own per-row refusal
 * (`userActionBlocked`), so a selected row it refuses is skipped and named.
 *
 *   const bulkActions = bulkActionsFromRowVerbs(allUserActions(), {
 *     suspend: { done: "Suspended", runOne: (id) => suspendUser(id) },
 *     message: { noBulk: "single" },
 *     …every other id…
 *   }, { noun: "account", getRowId: (r) => r.id, getRowName: (r) => r.email,
 *        blocked: (verb, row) => userActionBlocked(verb.id, row, context) });
 */
export function bulkActionsFromRowVerbs<V extends RegistryVerb, T>(
  verbs: readonly V[],
  twins: { [K in V["id"]]: RegistryTwin<T> },
  options: RowVerbOptions<T> & { blocked?: (verb: V, row: T) => string | null },
): EntityBulkAction<T>[] {
  const out: EntityBulkAction<T>[] = [];
  for (const verb of verbs) {
    const twin = (twins as Record<string, RegistryTwin<T> | undefined>)[verb.id];
    if (!twin || "noBulk" in twin) continue;
    const blocked = options.blocked;
    out.push(
      twinToBulkAction(
        {
          id: verb.id,
          label: verb.label,
          icon: verb.icon,
          destructive: Boolean(verb.danger),
          skipOf: (row) => (blocked ? blocked(verb, row) : null),
        },
        twin,
        options,
      ),
    );
  }
  return out;
}
