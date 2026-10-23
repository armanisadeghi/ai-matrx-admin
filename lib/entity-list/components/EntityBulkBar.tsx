"use client";

// lib/entity-list/components/EntityBulkBar.tsx
//
// BULK SELECTION — the two pieces of chrome.
//
//   <EntityBulkActions>  the consumer-declared buttons. Rendered INSIDE the
//                        canonical table's own bulk bar (MatrxDataTable's
//                        `selection.actions` seam), which already owns the
//                        count, the Clear and copy-of-selection. A second bar
//                        beside it would be a fork of a control we own, and
//                        the two counts would eventually disagree.
//
//   <EntityBulkSelectAllBanner>  the ONE sentence the table cannot say: which
//                        of the two meanings of "all" is currently true.
//
// 🚨 WHY THE BANNER EXISTS AT ALL. The table's header checkbox is honest about
// what it does — it ticks the rows on this page — but a person looking at 25 of
// 4,613 rows reads it as "everything". Gmail answers this with a banner under
// the toolbar, and so does this: it states what is selected in full sentences,
// and when the surface can serve the bigger meaning it offers it as a separate,
// explicit click. Where the surface CANNOT serve it, the banner says so rather
// than leaving the larger number unmentioned — a silence a user fills in wrong.

import { useState, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { TextInputDialog } from "@ai-matrx/design-system";
import { Button, DateField, Select, Textarea } from "@ai-matrx/design-system/controls";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CostDoor } from "@/components/cost/CostDoor";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import {
  bulkCountLabel,
  type EntityBulkAction,
  type EntityBulkActionConfirm,
  type EntityBulkActionInput,
  type EntityBulkAsk,
} from "../selection";
import type { EntityListSelection } from "../useEntityListSelection";
import { BulkNoneDoneError, copySkippedAction } from "../bulkSkipped";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

/** The confirm sentence, then its cost (when the verb declares one) behind the quiet Cost door. */
function confirmBody(question: EntityBulkActionConfirm): ReactNode {
  if (!question.cost) return question.description;
  return (
    <>
      {question.description} <CostDoor {...question.cost} />
    </>
  );
}

export function EntityBulkActions<TRow>({
  actions,
  selection,
  noun,
  onRemoveRows,
  onRefresh,
  compact = false,
}: {
  actions: EntityBulkAction<TRow>[];
  /**
   * Only what running an action needs — so a plain table can host the same buttons. `setIds`
   * lets a PARTIAL result keep exactly the skipped rows ticked (`keepIds`); without it the whole
   * selection stays, so a failed row's tick is never dropped.
   */
  selection: Pick<EntityListSelection<TRow>, "build" | "clear" | "count"> &
    Partial<Pick<EntityListSelection<TRow>, "setIds">>;
  noun: string;
  onRemoveRows: (ids: string[]) => void;
  onRefresh: () => void;
  /** Icon-only buttons (name in the tooltip) for narrow hosts like a sidebar. */
  compact?: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);
  // A confirm that asks for a reason: ONE text dialog for the whole selection.
  const [asking, setAsking] = useState<{
    question: EntityBulkActionConfirm;
    confirmLabel: string;
    resolve: (reason: string | null) => void;
  } | null>(null);
  const askReason = (question: EntityBulkActionConfirm, confirmLabel: string) =>
    new Promise<string | null>((resolve) => setAsking({ question, confirmLabel, resolve }));
  // A confirm that asks ONE value (a date, a choice): the same confirm, with the field under it.
  const [askingValue, setAskingValue] = useState<{
    question: EntityBulkActionConfirm & { ask: EntityBulkAsk };
    confirmLabel: string;
    variant: "default" | "destructive";
    value: string;
    /** Typed alongside the value when the same confirm also asks a reason. */
    reason: string;
    resolve: (picked: { value: string; reason: string } | null) => void;
  } | null>(null);
  const askValue = (
    question: EntityBulkActionConfirm & { ask: EntityBulkAsk },
    confirmLabel: string,
    variant: "default" | "destructive",
  ) =>
    new Promise<{ value: string; reason: string } | null>((resolve) =>
      setAskingValue({
        question,
        confirmLabel,
        variant,
        value:
          question.ask.kind === "date"
            ? question.ask.defaultValue
            : (question.ask.defaultValue ?? question.ask.options[0]?.value ?? ""),
        reason: "",
        resolve,
      }),
    );

  const run = async (action: EntityBulkAction<TRow>) => {
    const target = selection.build();
    if (target.count === 0) return;

    // 🚨 THE DESTRUCTIVE / EXPENSIVE CLICK LAW. The surface writes the sentence
    // because only it knows what is lost, duplicated or spent; the shell only
    // guarantees the stop happens before anything runs.
    const question = action.confirm?.(target) ?? null;
    const input: EntityBulkActionInput = {};
    if (question?.ask) {
      // A confirm may ask a value AND a reason: one dialog, both fields, both reach `run`.
      const picked = await askValue(
        { ...question, ask: question.ask },
        question.confirmLabel ?? action.label,
        question.variant ?? (action.variant === "destructive" ? "destructive" : "default"),
      );
      if (picked === null) return;
      input.value = picked.value;
      if (question.reason) input.reason = picked.reason.trim();
    } else if (question?.reason) {
      const reason = await askReason(question, question.confirmLabel ?? action.label);
      if (reason === null) return;
      input.reason = reason.trim();
    } else if (question) {
      const ok = await confirm({
        title: question.title,
        description: confirmBody(question),
        confirmLabel: question.confirmLabel ?? action.label,
        variant: question.variant ?? (action.variant === "destructive" ? "destructive" : "default"),
      });
      if (!ok) return;
    }

    setPending(action.id);
    try {
      const result = await action.run(target, input);
      // 🚨 NOTHING HAPPENED MEANS NOTHING HAPPENED (jobs-bar cold-walk-13,
      // Friction). An action whose verb is a DIALOG resolves with nothing when
      // the person presses Cancel — and this line used to read that as `{}`,
      // which then cleared the selection and raised a success toast for work
      // that was never started. On a Library of 2,981 episodes that is three
      // carefully-made ticks thrown away for pressing Cancel, plus a toast
      // saying the thing you just refused had run.
      //
      // Two surfaces already had this shape and both were wrong the same way:
      // `features/source-library` (Transcribe / Send to a Masterwork Rulebook)
      // and `features/exports` (Send) both return a promise a dialog resolves.
      // So the fix is here, in the shell that owns the selection lifecycle,
      // not in either of them: a `void` / `undefined` result is the action
      // saying it did not run. The selection stays exactly as it was and
      // nothing is announced — the same treatment a thrown error already got,
      // for the same reason.
      if (result == null) return;
      if (result.removedIds?.length) onRemoveRows(result.removedIds);
      if (result.refresh) onRefresh();
      // A partial result keeps the skipped rows ticked for a retry and unticks the done ones.
      if (result.keepIds?.length) {
        if (selection.setIds) selection.setIds(result.keepIds);
      } else if (!result.keepSelection) selection.clear();
      const undo = result.undo;
      toast.success(
        result.message ??
          `${action.label} — ${bulkCountLabel(target.count, noun)}`,
        undo
          ? {
              action: {
                label: "Undo",
                onClick: () => {
                  void Promise.resolve(undo()).then(
                    () => onRefresh(),
                    (error: unknown) =>
                      toast.error(
                        error instanceof Error ? error.message : "Undo did not finish.",
                      ),
                  );
                },
              },
            }
          : undefined,
      );
    } catch (error) {
      // NOTHING FAILS SILENTLY: the selection is kept on failure, so the person
      // can read the reason and try again without re-ticking 40 rows. Past five
      // skipped rows the sentence says "+N more" and the toast hands over all of them.
      const copy = error instanceof BulkNoneDoneError ? copySkippedAction(error.skipped) : null;
      toast.error(
        error instanceof Error
          ? error.message
          : `${action.label} did not finish. Nothing was changed.`,
        copy ? { action: copy } : undefined,
      );
    } finally {
      setPending(null);
    }
  };

  // Built once per render, only when a verb asks — it lets a verb say it would
  // do nothing on THIS selection (every row already in its state).
  const held = actions.some((action) => action.disabledReason) ? selection.build() : null;

  return (
    <>
      {actions.map((action) => {
        const Icon = action.icon;
        const busy = pending === action.id;
        const unavailable = (held && action.disabledReason?.(selection.count, held)) ?? null;
        return (
          <Button
            key={action.id}
            type="button"
            // One family (lane mac-fixes): the /controls Button, sized by the table's control
            // scale (look="mac" included); its touch hit area grows to 44px by itself.
            variant={action.variant === "destructive" ? "danger" : action.variant === "default" ? "primary" : "outline"}
            icon={busy ? <Loader2 className="animate-spin" /> : Icon ? <Icon /> : undefined}
            disabled={pending !== null || unavailable !== null || selection.count === 0}
            title={unavailable ?? (compact ? action.label : undefined)}
            aria-label={`${action.label} — ${bulkCountLabel(selection.count, noun)}`}
            data-entity-bulk-action={action.id}
            onClick={(event) => {
              event.stopPropagation();
              void run(action);
            }}
          >
            {compact && Icon ? undefined : action.label}
          </Button>
        );
      })}
      {asking ? (
        <TextInputDialog
          open
          onOpenChange={(open) => {
            if (open) return;
            asking.resolve(null);
            setAsking(null);
          }}
          title={asking.question.title}
          description={confirmBody(asking.question)}
          placeholder={asking.question.reason?.placeholder}
          confirmLabel={asking.confirmLabel}
          allowEmpty={asking.question.reason?.optional ?? false}
          onConfirm={(value) => {
            asking.resolve(value);
            setAsking(null);
          }}
        />
      ) : null}
      {askingValue ? (
        <BulkAskDialog
          asking={askingValue}
          onChange={(value) => setAskingValue({ ...askingValue, value })}
          onReason={(reason) => setAskingValue({ ...askingValue, reason })}
          onClose={(picked) => {
            askingValue.resolve(picked);
            setAskingValue(null);
          }}
        />
      ) : null}
    </>
  );
}

/** The confirm that asks ONE value for the whole selection (`EntityBulkActionConfirm.ask`). */
function BulkAskDialog({
  asking,
  onChange,
  onReason,
  onClose,
}: {
  asking: {
    question: EntityBulkActionConfirm & { ask: EntityBulkAsk };
    confirmLabel: string;
    variant: "default" | "destructive";
    value: string;
    reason: string;
  };
  onChange: (value: string) => void;
  onReason: (reason: string) => void;
  onClose: (picked: { value: string; reason: string } | null) => void;
}) {
  const { ask, reason } = asking.question;
  const reasonMissing = !!reason && !reason.optional && asking.reason.trim() === "";
  const hint =
    ask.kind === "date"
      ? !asking.value
        ? "Pick a date"
        : ask.min && asking.value < ask.min
          ? "Pick a later date"
          : (ask.validate?.(asking.value) ?? null)
      : asking.value
        ? (ask.validate?.(asking.value) ?? null)
        : "Pick one";
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose(null)}
      title={asking.question.title}
      description={confirmBody(asking.question)}
      variant={asking.variant}
      confirmLabel={asking.confirmLabel}
      cancelLabel="Cancel"
      confirmDisabled={hint !== null || reasonMissing}
      onConfirm={() => onClose({ value: asking.value, reason: asking.reason })}
      content={
        <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm" data-entity-bulk-ask={ask.kind}>
          <span className="type-secondary text-muted-foreground">{ask.label}</span>
          {ask.kind === "date" ? (
            <DateField
              value={asking.value}
              // A date below `min` is KEPT and named ("Pick a later date"), never silently ignored.
              onValueChange={(v) => onChange(v ?? "")}
              aria-label={ask.label}
            />
          ) : (
            <Select<string>
              aria-label={ask.label}
              value={asking.value}
              onValueChange={onChange}
              options={ask.options.map((option) => ({ value: option.value, label: option.label }))}
            />
          )}
          {hint && asking.value ? <span className="type-secondary text-muted-foreground">{hint}</span> : null}
        </label>
        {reason ? (
          <label className="flex flex-col gap-1 text-sm" data-entity-bulk-reason>
            <span className="type-secondary text-muted-foreground">{reason.placeholder}</span>
            <Textarea
              aria-label={reason.placeholder}
              value={asking.reason}
              rows={3}
              onChange={(event) => onReason(event.target.value)}
            />
          </label>
        ) : null}
        </div>
      }
    />
  );
}

/**
 * THE CARD LIST'S SELECT-ALL — the phone's answer to the table's header
 * checkbox.
 *
 * 🚨 WHY IT IS A SEPARATE CONTROL. Below `sm` the canonical table swaps its
 * grid for stacked cards, and the header row — with the select-all checkbox in
 * it — goes with it. So on a phone the only way to select a page was to tap
 * every card in turn, and the "all N matching this filter" escalation (which
 * only appears once every row on screen is ticked) was unreachable in practice:
 * on a library of hundreds of videos, nobody taps 25 boxes to find out an
 * option exists. This is the same verb (`toggleLoaded`) the table header uses,
 * so the two widths can never come to mean different things.
 *
 * It renders ONLY where the cards do (`sm:hidden`, matching the table's
 * `mobileCardsBreakpoint`), so the wide layout is untouched and there is never
 * a moment with two select-alls on screen.
 */
export function EntityCardsSelectAll<TRow>({
  selection,
  noun,
}: {
  selection: EntityListSelection<TRow>;
  noun: string;
}) {
  if (!selection.enabled || selection.loadedSelectableCount === 0) return null;
  const { allLoadedSelected, selectedLoadedCount, loadedSelectableCount } =
    selection;
  const some = selectedLoadedCount > 0 && !allLoadedSelected;

  return (
    <div
      data-entity-cards-select-all
      className="flex items-center gap-2 px-1 py-1 sm:hidden"
    >
      {/*
        `.matrx-tap-area` on the LABEL: the 44px ring for a control whose size
        IS the control (app/globals.css). The label also carries the words, so
        the whole row is the target, not just the box.
      */}
      <label className="matrx-tap-area flex min-h-11 flex-1 cursor-pointer items-center gap-2 text-xs text-foreground">
        <Checkbox
          // Indeterminate is a state, not an attribute: a half-ticked page
          // that renders as empty tells the person nothing is selected.
          checked={allLoadedSelected ? true : some ? "indeterminate" : false}
          aria-label={
            allLoadedSelected
              ? `Clear the ${bulkCountLabel(loadedSelectableCount, noun)} selected on this page`
              : `Select all ${bulkCountLabel(loadedSelectableCount, noun)} on this page`
          }
          onCheckedChange={() => selection.toggleLoaded()}
        />
        {/*
          The label is a VERB, never a restatement. A fully-ticked page is
          already described by the banner directly above and counted by the bulk
          bar directly below; a third sentence saying the same thing is what
          turns three honest strips into noise. Same reason there is no Clear
          here — the bar below carries the one.
        */}
        <span>
          {allLoadedSelected
            ? `Deselect all ${loadedSelectableCount} on this page`
            : some
              ? `${selectedLoadedCount} of ${loadedSelectableCount} on this page — select all`
              : `Select all ${loadedSelectableCount} on this page`}
        </span>
      </label>
    </div>
  );
}

function BannerShell({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warn";
}) {
  return (
    <div
      data-entity-bulk-banner
      role="status"
      aria-live="polite"
      className={
        tone === "warn"
          ? "flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 type-secondary text-foreground"
          : "flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 type-secondary text-foreground"
      }
    >
      {children}
    </div>
  );
}

export function EntityBulkSelectAllBanner<TRow>({
  selection,
  noun,
  plural,
  selectAllMatchingDeclared,
  actions,
}: {
  selection: EntityListSelection<TRow>;
  noun: string;
  /** The surface's plural label, for the "this view matches M" sentence. */
  plural: string;
  selectAllMatchingDeclared: boolean;
  /**
   * The bulk buttons, passed ONLY by a view that has no bulk bar of its own.
   *
   * The table renders them inside its own bar (see `EntityBulkActions`), so it
   * passes nothing here and there is exactly one set on screen. The cards and
   * dense-rows views have no bar at all, and a selection you cannot act on is a
   * dead end — so there the banner carries them.
   */
  actions?: ReactNode;
}) {
  if (!selection.enabled) return null;

  const { resolving, resolveError, count, mode, matchingTotal } = selection;

  // A resolution in flight is many sequential requests. It reports its own
  // progress and can be abandoned — never a frozen screen.
  if (resolving) {
    return (
      <BannerShell>
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        <span className="flex-1">
          Selecting every {noun} that matches this filter —{" "}
          <span className="tabular-nums">
            {resolving.done.toLocaleString()} of{" "}
            {resolving.total.toLocaleString()}
          </span>{" "}
          so far.
        </span>
        <Button variant="quiet" icon={<X />} onClick={selection.cancelSelectAllMatching}>
          Cancel
        </Button>
      </BannerShell>
    );
  }

  if (count === 0) return null;

  const actionsSlot = actions ? (
    <div className="ml-auto flex flex-wrap items-center gap-1.5">{actions}</div>
  ) : null;

  if (resolveError) {
    return (
      <BannerShell tone="warn">
        <span className="flex-1">
          Only {bulkCountLabel(count, noun)} could be selected —{" "}
          {resolveError} Whatever a bulk action does now will touch exactly
          those {count === 1 ? "one" : count.toLocaleString()}.
          <ErrorAlchemyMenu error={resolveError} />
        </span>
        <Button variant="quiet" onClick={selection.runSelectAllMatching}>
          Try again
        </Button>
      </BannerShell>
    );
  }

  if (mode === "matching") {
    return (
      <BannerShell>
        <span className="flex-1">
          Every {noun} matching this filter is selected —{" "}
          <span className="tabular-nums font-medium">
            {count.toLocaleString()}
          </span>{" "}
          in total, including the ones not on this page.
        </span>
        <Button variant="quiet" icon={<X />} onClick={selection.clear}>
          Clear selection
        </Button>
        {actionsSlot}
      </BannerShell>
    );
  }

  if (selection.canOfferSelectAllMatching) {
    return (
      <BannerShell>
        <span className="flex-1">
          All {bulkCountLabel(count, noun)} on this page are selected. This view
          matches <span className="tabular-nums">{matchingTotal.toLocaleString()}</span>.
        </span>
        <Button
          variant="outline"
          data-entity-bulk-select-all-matching
          onClick={selection.runSelectAllMatching}
        >
          Select all {matchingTotal.toLocaleString()} matching this filter
        </Button>
        {actionsSlot}
      </BannerShell>
    );
  }

  // THE PAGE IS FULLY TICKED AND THERE IS MORE, AND THIS SURFACE CANNOT SERVE
  // "everything matching". Saying nothing would let the header checkbox imply
  // it did, so the limit is stated instead of left to be discovered.
  if (
    !selectAllMatchingDeclared &&
    selection.allLoadedSelected &&
    matchingTotal > count
  ) {
    return (
      <BannerShell tone="warn">
        <span className="flex-1">
          Only the {bulkCountLabel(count, noun)} on this page are selected — this
          view matches{" "}
          <span className="tabular-nums">{matchingTotal.toLocaleString()}</span>{" "}
          {plural}. A bulk action here touches this page only; page through to
          select more.
        </span>
        {actionsSlot}
      </BannerShell>
    );
  }

  // A view with no bar of its own still has to state the count and offer a way
  // out and a way to act — otherwise its checkboxes lead nowhere.
  if (actionsSlot) {
    return (
      <BannerShell>
        <span className="font-medium">
          {bulkCountLabel(count, noun)} selected
        </span>
        <Button variant="quiet" icon={<X />} onClick={selection.clear}>
          Clear
        </Button>
        {actionsSlot}
      </BannerShell>
    );
  }

  return null;
}
