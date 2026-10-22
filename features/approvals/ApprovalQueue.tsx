"use client";

/**
 * THE ONE APPROVAL QUEUE (human-in-the-loop policy rule 5).
 *
 * Every pending AI proposal in one scope — whatever produced it — in one list a
 * person works through: accept all, reject all, or one by one (the system has
 * no opinion which), every consequence listed before anything runs, a reason
 * captured wherever the write keeps one, the mode each item is running in, when
 * a mode-3 item applies itself, and a door on every record a row names.
 * Proposal kinds are REGISTERED (`./registry.ts`); this component knows none of
 * them by name.
 *
 * PROMOTED from `features/marketing/seo/value-system/approvals/ApprovalQueue.tsx`
 * on 2026-09-17 (see `./FEATURE.md` § The ruling). The SEO queue now mounts
 * this same component with its own kinds, so there is one engine, not two.
 *
 * 🚨 WHY A BATCH IS ALLOWED HERE. `features/assists/FEATURE.md` refuses bulk
 * accept in `/assists`, because there one click fires unlike actions nobody
 * read. Here the list is open before anything can be selected, every row
 * states its exact write, the confirm dialog re-lists every one of them, and
 * each item still runs through its kind's own single-item writer. Individual
 * AND all — never forced. Items that must be read on their own (a Gmail message
 * whose review card IS the authorization) are never selectable.
 *
 * 🚨 ONE TREE POSITION FOR THE KIND SLOTS AND THE DIALOGS. Deciding the last
 * row empties the queue while its writer is still running. The slots (each
 * kind's reader + writer hooks) and the confirm / chooser dialogs therefore
 * render at the SAME position whether the card is shown or hidden — only the
 * card itself toggles. They used to sit inside the card in one branch and in a
 * bare fragment in the other, so every empty↔non-empty flip unmounted every
 * kind's reader and writer mid-decision, remounted fresh ones, and tore the
 * open dialog down while `run` was still awaiting it (guard:
 * `__tests__/ApprovalQueue.decision-lifecycle.test.tsx`).
 */

import { useSurfaceScopeContribution } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import { isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  X,
} from "lucide-react";
import {
  MatrxDataTable,
  type MatrxColumnDef,
} from "@ai-matrx/design-system/data-table";
import type { MatrxDataTableMobileCardControls } from "@ai-matrx/design-system/data-table/types";
import { Checkbox } from "@/components/ui/checkbox";
import AppLink from "@/components/navigation/AppLink";
import { formatCount, formatRelativeTime, formatAbsoluteDate } from "@ai-matrx/kit/format";
import { Badge as KindBadge, PropertyRow } from "@ai-matrx/design-system/controls";
import { commitUrlParams } from "@ai-matrx/kit/url-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ApprovalLoadError } from "./ApprovalLoadError";
import { readProposalStatus } from "./data";
import { APPROVAL_KINDS } from "./registry";
import { mountedApprovalKinds } from "./rendered";
import {
  AUTONOMY_MODE_LABEL,
  type ApprovalDecisions,
  type ApprovalFocusDetail,
  type ApprovalFocusResolution,
  type ApprovalItem,
  type ApprovalKind,
  type ApprovalScope,
  type ApprovalSource,
} from "./types";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { AGENT_ICON } from "@/components/icons/domain-icons";

import { ProTextarea } from "@/components/official/ProTextarea";
type Decision = "accept" | "reject";

/**
 * WHAT BECAME OF A ROW THIS SCREEN DECIDED, kept on the screen: an open window must say "Approved" (or
 * "Declined") the moment the decision lands, never keep the question and its buttons for a row the store has
 * already closed. `decided` means the store found it already decided and did not say which way.
 */
type DecidedState = Decision | "decided";
const DECIDED_WORD: Record<DecidedState, string> = {
  accept: "Approved",
  reject: "Declined",
  decided: "Already decided",
};

interface Slot {
  source: ApprovalSource;
  decisions: ApprovalDecisions;
}

export interface ApprovalQueueSummary {
  count: number;
  loading: boolean;
  errors: number;
}

/**
 * EVERYTHING THE QUEUE RENDERS FROM ONE SLOT, as one comparable string.
 *
 * 🚨 IT IS DERIVED, NEVER A HAND-LISTED FIELD SET. Until 2026-09-17 the slot
 * reported upward only when the item KEYS changed, so a row that changed STATE
 * under an unchanged key never reached the screen: a Gmail draft still being
 * checked against the unsubscribes published a blocked row under
 * `gmail_send:<id>`, and when the outbound spine allowed the send the queue
 * kept the "checking this recipient" row forever (Bugbot HIGH #1). A
 * per-kind distinct key for the pending state would have fixed that one kind
 * and left the next kind to rediscover it; serialising the whole rendered
 * value cannot recur, because a field a future kind adds is in the signature
 * the moment it exists.
 *
 * React nodes and functions are compared by presence only — they change
 * identity on every render, so comparing them would report on every render and
 * loop through the parent's state. A kind whose ONLY change lives inside a node
 * therefore states that change as data too (`blocked`, `badge`, `headline`), as
 * every registered kind does.
 */
function renderedSignature(source: ApprovalSource): string {
  return JSON.stringify(
    {
      loading: source.loading,
      error: source.error ? String(source.error) : "",
      total: source.total,
      moreHref: source.moreHref ?? null,
      moreLabel: source.moreLabel ?? null,
      items: source.items,
    },
    (_key, value: unknown) => {
      if (isValidElement(value)) return "<node>";
      if (typeof value === "function") return "<fn>";
      return value;
    },
  );
}

/**
 * Calls one kind's hooks in its own fixed slot and reports upward. A kind's
 * reader may use react-query, Redux or a runner hook; the queue never has to.
 */
function KindSlot({
  kind,
  scope,
  onReport,
}: {
  kind: ApprovalKind;
  scope: ApprovalScope;
  onReport: (kindId: string, slot: Slot) => void;
}) {
  const source = kind.useSource(scope);
  const decisions = kind.useDecisions(scope);
  const signature = `${scope.key}|${renderedSignature(source)}`;
  useEffect(() => {
    onReport(kind.id, { source, decisions });
    // Report when what the queue renders changes — not on every render, which
    // would loop through the parent's state.
  }, [signature]);
  return null;
}

/** `kinds` entries are `kindId` or `kindId:subKind`. */
function matches(filter: readonly string[] | undefined, item: ApprovalItem) {
  if (!filter) return true;
  return filter.some((entry) => {
    const [kindId, subKind] = entry.split(":");
    return (
      kindId === item.kindId &&
      (subKind === undefined || subKind === item.subKind)
    );
  });
}

/**
 * 🚨 THE ONE ANSWER TO "MAY ANY CONTROL ON THIS ROW STILL DO SOMETHING?"
 *
 * Five row states mean no: the apply is IN FLIGHT on the server, this build
 * cannot read the row at all, the proposal is past the organization's review
 * window (the door answers 403), the change already reached Google with the
 * answer lost (no retry, ever — an append is not idempotent), and the last
 * attempt is in a receipt state this build has never heard of (§ V14-4).
 *
 * It lives here, once, because the queue's generic Approve was not the only live
 * control: a kind's `individualReview` can carry its OWN action, and Gmail's does
 * — its Send posts straight to the reviewed-send endpoint. `expired` dropped the
 * Approve button and left that card mounted, so an expired draft stayed sendable
 * until the server refused it (Bugbot round 11, frontend PR 228). Asking one
 * predicate at every gate means a kind cannot forget, and a state added to this
 * list reaches every kind at once.
 */
export function noLiveAction(item: ApprovalItem): boolean {
  return noDecisionControls(item) || Boolean(item.expired);
}

/**
 * The three states in which the row offers NEITHER decision: the apply is in
 * flight, the row is unreadable, or the outcome is unconfirmed (approving again
 * could duplicate the change and rejecting cannot call back a write Google may
 * already have taken). `expired` is deliberately NOT here — the server still
 * allows a reject, which is exactly what its sentence asks for.
 */
function noDecisionControls(item: ApprovalItem): boolean {
  return (
    Boolean(item.inFlight) ||
    Boolean(item.unreadable) ||
    // 🚨 A RECEIPT STATE THIS BUILD HAS NEVER HEARD OF (§ V14-4). It is not the
    // same as no receipt: something was attempted and this build cannot say what
    // happened, so neither door may be live — approving could duplicate a write
    // and rejecting could deny a change that already landed.
    Boolean(item.unknownState) ||
    item.lastAttempt?.state === "applied_unconfirmed"
  );
}


interface PendingDecision {
  decision: Decision;
  items: ApprovalItem[];
  choice: string | null;
}

/**
 * The sentence under a row: which mode it is running in and, in mode 3, the
 * exact instant it applies itself (policy rule 4 — visible BEFORE it fires).
 * A mode-3 item with no instant is a defect in its reader, and says so rather
 * than reading as a calm "waiting".
 */
function ModeLine({ item }: { item: ApprovalItem }) {
  // A row this build cannot read has no mode to print, and inventing one would
  // be the guess policy rule 1 forbids (`ApprovalItem.mode`).
  if (item.mode === "unresolved") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        Nothing on the record says how this proposal is meant to be decided.
      </span>
    );
  }
  const auto = item.mode === "mode_3";
  const when = item.autoApplyAt ? new Date(item.autoApplyAt) : null;
  const broken = auto && (!when || Number.isNaN(when.getTime()));
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        broken ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {auto ? <Clock className="size-3 shrink-0" /> : null}
      {broken
        ? "Set to apply itself, but nothing says when — treat it as needing your decision."
        : auto && when
          ? `Applies itself ${when.toLocaleString()} unless you decide`
          : AUTONOMY_MODE_LABEL[item.mode]}
    </span>
  );
}

interface QueueSection {
  kind: ApprovalKind;
  slot: Slot | undefined;
  items: ApprovalItem[];
  total: number;
}

/** One short word for the row's state; its full sentence is in the row's window. */
function statusLabel(item: ApprovalItem): string {
  if (item.unreadable) return "Can't show";
  if (item.unknownState) return "Unknown state";
  if (item.inFlight) return "Applying";
  if (item.lastAttempt?.state === "applied_unconfirmed") return "May be made";
  if (item.lastAttempt?.state === "failed") return "Failed";
  if (item.expired) return "Expired";
  if (item.blocked) return "Not yours";
  // Mode 3 applies itself — the row says so before it fires (policy rule 4);
  // the exact instant is in the window.
  if (item.mode === "mode_3") return "Auto-applies";
  return "Waiting";
}

/** The sentences a row carries about its state — never hidden (THE NO-SILENT-FAILURE LAW). */
function statusSentence(item: ApprovalItem): string | null {
  if (item.blocked) return `${item.blocked.reason} ${item.blocked.whoCan}`;
  return (
    item.inFlight?.sentence ??
    item.lastAttempt?.sentence ??
    item.unreadable?.sentence ??
    item.unknownState?.sentence ??
    item.expired?.sentence ??
    null
  );
}

function modeText(item: ApprovalItem): string {
  return item.mode === "unresolved" ? "Unresolved" : AUTONOMY_MODE_LABEL[item.mode];
}

/** The deep-linked row opens in its window — the URL key the table reads (rule 14). */
const URL_TABLE_ID = /^[a-z][a-z0-9-]{0,63}$/;

/**
 * The row's own decision buttons, in the kind's words ("Approve" / "Archive" /
 * "Decline"; "Try again" after a failed apply). Shared by the row and its window.
 */
function DecisionButtons({
  item,
  kind,
  busy,
  decided,
  onDecide,
}: {
  item: ApprovalItem;
  kind: ApprovalKind;
  busy: boolean;
  decided?: DecidedState | undefined;
  onDecide: (decision: Decision, items: ApprovalItem[]) => void;
}) {
  if (decided || noDecisionControls(item)) return null;
  return (
    <span
      className="inline-flex items-center gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      {item.individualReview || item.blocked || item.expired ? null : (
        <Button variant="quiet" disabled={busy} onClick={() => onDecide("accept", [item])}>
          {/* After a failed apply the same door IS the retry, and the label says so. */}
          {item.lastAttempt?.state === "failed" ? "Try again" : kind.accept.label}
        </Button>
      )}
      <Button variant="quiet" disabled={busy} onClick={() => onDecide("reject", [item])}>
        {kind.reject.label}
      </Button>
    </span>
  );
}

/**
 * THE QUEUE'S LIST, on the shared table: ONE LINE PER PROPOSAL (Linear's inbox,
 * GitHub's review queue) — type, what, where, who, when, and the kind's own
 * decision words. Everything else a row used to print under itself (its full
 * change, its state sentences, its body, its review card) lives in the row's
 * window, opened by a row click. Search, sort, filters, one collapsible band per
 * kind, URL state, paging and batch decisions are the table's.
 */
function ApprovalTable({
  tableId,
  sections,
  selectable,
  selectedKeys,
  onSelectedKeysChange,
  busy,
  batchRejectNeedsOneKind,
  focusedKey,
  decidedByKey,
  onDecide,
}: {
  tableId: string;
  sections: QueueSection[];
  selectable: ApprovalItem[];
  selectedKeys: ReadonlySet<string>;
  onSelectedKeysChange: (keys: ReadonlySet<string>) => void;
  busy: boolean;
  batchRejectNeedsOneKind: boolean;
  focusedKey: string | null;
  decidedByKey: ReadonlyMap<string, DecidedState>;
  onDecide: (decision: Decision, items: ApprovalItem[]) => void;
}) {
  const sectionByKind = new Map(sections.map((section) => [section.kind.id, section]));
  const rows = sections.flatMap((section) => section.items);
  const selectableKeys = new Set(selectable.map((item) => item.key));
  const kindLabel = (item: ApprovalItem) =>
    sectionByKind.get(item.kindId)?.kind.label ?? item.kindId;

  // A deep link (`?item=`) opens its row's window once — the table already pages
  // to and rings it (`focusRowId`). Written to the URL the table reads.
  const openedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusedKey || focusedKey === openedForRef.current || !URL_TABLE_ID.test(tableId)) return;
    openedForRef.current = focusedKey;
    commitUrlParams({ [`table.${tableId}.window`]: focusedKey }, "replace");
  }, [focusedKey, tableId]);

  const columns: MatrxColumnDef<ApprovalItem>[] = [
    {
      // The band each row sits in (the group header names it, so the column steps aside).
      id: "kind",
      header: "Kind",
      accessorFn: kindLabel,
      format: { id: "choice" },
      width: 160,
    },
    {
      id: "badge",
      header: "Type",
      accessorFn: (item) => item.badge ?? kindLabel(item),
      format: { id: "choice" },
      width: 120,
      cell: (item) => (
        <KindBadge className="shrink-0">{item.badge ?? kindLabel(item)}</KindBadge>
      ),
    },
    {
      id: "headline",
      header: "What",
      accessorKey: "headline",
      // What takes most of the row (the table fits its width; widths are shares).
      width: 520,
      // A row in any state but waiting says so on its title (Status is a hidden column).
      tone: (item) =>
        item.lastAttempt?.state === "failed"
          ? "danger"
          : statusLabel(item) === "Waiting"
            ? undefined
            : "warning",
      cell: (item) => (
        <span className="block min-w-0 truncate text-foreground" title={item.headline}>
          {item.headline}
        </span>
      ),
    },
    {
      // The records a row names, each with its door (THE DOOR LAW).
      id: "records",
      header: "Where",
      accessorFn: () => null,
      sortable: false,
      // table-filter-off: the cell is the record doors themselves; What carries the words
      filter: false,
      width: 160,
      cell: (item) =>
        item.doors ? (
          <span
            className="block min-w-0 overflow-hidden whitespace-nowrap"
            onClick={(event) => event.stopPropagation()}
          >
            {item.doors}
          </span>
        ) : null,
    },
    {
      id: "status",
      header: "Status",
      accessorFn: statusLabel,
      format: { id: "choice" },
      width: 100,
      // Hidden by default: on most rows it only says "Waiting"; Columns brings it back.
      hidden: true,
      tone: (item) =>
        item.lastAttempt?.state === "failed"
          ? "danger"
          : statusLabel(item) === "Waiting"
            ? "muted"
            : "warning",
    },
    {
      id: "mode",
      header: "Mode",
      accessorFn: modeText,
      format: { id: "choice" },
      width: 200,
      hidden: true,
    },
    {
      id: "proposedBy",
      header: "Proposed by",
      accessorFn: (item) => item.proposedBy ?? null,
      width: 130,
      // Shown when any row in view names who proposed it.
      hidden: !rows.some((item) => item.proposedBy),
    },
    {
      id: "proposedAt",
      header: "When",
      accessorFn: (item) => item.proposedAt ?? null,
      format: { id: "relative_time" },
      width: 125,
    },
    {
      // The decision words are each kind's own ("Approve", "Archive", "Decline").
      // Headed "Actions": it REPLACES the built-in column and keeps its open/copy controls.
      id: "decide",
      header: "Actions",
      sortable: false,
      // table-filter-off: the Status column already filters on what this column reads
      filter: false,
      width: 200,
      customActions: (item) => {
        const section = sectionByKind.get(item.kindId);
        return section ? (
          <DecisionButtons item={item} kind={section.kind} busy={busy} onDecide={onDecide} />
        ) : null;
      },
    },
  ];

  return (
    <MatrxDataTable<ApprovalItem>
      tableId={tableId}
      data={rows}
      columns={columns}
      getRowId={(item) => item.key}
      searchText={(item) =>
        [
          item.headline,
          item.acceptEffect,
          item.rejectEffect,
          kindLabel(item),
          item.badge ?? "",
          item.proposedBy ?? "",
          statusSentence(item) ?? "",
        ].join(" ")
      }
      defaultSort={{ id: "proposedAt", direction: "desc" }}
      grouping={{
        columnId: "kind",
        order: "value-asc",
        rowNoun: "proposal",
        selectable: true,
        groupFacts: (group) => {
          const section = sections.find(
            (entry) => entry.kind.label === group.label,
          );
          return section && section.total > section.items.length
            ? { count: section.total }
            : undefined;
        },
        renderLabel: (group) => {
          const section = sections.find(
            (entry) => entry.kind.label === group.label,
          );
          const more =
            section &&
            section.total > section.items.length &&
            section.slot?.source.moreHref
              ? section.slot.source
              : null;
          return (
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="truncate">{group.label}</span>
              {section && section.total > section.items.length ? (
                <span className="type-meta text-muted-foreground">
                  {`${section.items.length} of ${formatCount(section.total)} loaded`}
                </span>
              ) : null}
              {more?.moreHref ? (
                <AppLink
                  href={more.moreHref}
                  className="inline-flex items-center gap-1 type-meta text-primary underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                >
                  {more.moreLabel ?? "See them all"}
                  <ExternalLink className="size-3" />
                </AppLink>
              ) : null}
            </span>
          );
        },
      }}
      selection={{
        selectedIds: [...selectedKeys],
        onSelectedIdsChange: (ids) =>
          onSelectedKeysChange(new Set(ids.filter((id) => selectableKeys.has(id)))),
        // ONE predicate with the batch: reviewed-alone, blocked and no-live-action
        // rows are never part of a batch (`selectable`, computed by the queue).
        isRowSelectable: (item) => selectableKeys.has(item.key) && !busy,
        noun: "proposal",
        actions: (selected) => {
          const items = selected.filter((item) => selectableKeys.has(item.key));
          if (items.length === 0) return null;
          return (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {batchRejectNeedsOneKind ? (
                <span className="type-meta text-muted-foreground">
                  Reject needs one kind
                </span>
              ) : null}
              <Button
                icon={<Check />}
                variant="primary"
                disabled={busy}
                onClick={() => onDecide("accept", items)}
              >
                Approve {items.length}
              </Button>
              <Button
                icon={<X />}
                variant="outline"
                disabled={busy || batchRejectNeedsOneKind}
                onClick={() => onDecide("reject", items)}
              >
                Reject {items.length}
              </Button>
            </span>
          );
        },
      }}
      focusRowId={focusedKey}
      window={{
        title: (item) => item.headline,
        renderView: (item) => {
          const section = sectionByKind.get(item.kindId);
          return (
            <ApprovalRowDetail
              item={item}
              kindLabel={kindLabel(item)}
              decided={decidedByKey.get(item.key)}
              decide={
                section ? (
                  <DecisionButtons item={item} kind={section.kind} busy={busy} decided={decidedByKey.get(item.key)} onDecide={onDecide} />
                ) : null
              }
            />
          );
        },
        renderEdit: false,
        width: 560,
        height: 560,
      }}
      fitToWidth
      mobileCards={(item, _index, controls) => {
        const section = sectionByKind.get(item.kindId);
        return (
          <ApprovalCard
            item={item}
            controls={controls}
            decide={
              section ? (
                <DecisionButtons item={item} kind={section.kind} busy={busy} decided={decidedByKey.get(item.key)} onDecide={onDecide} />
              ) : null
            }
          />
        );
      }}
      mobileCardsBreakpoint="sm"
      cardsLayout="list"
      pageSize={50}
      emptyState={{ title: "No proposals match" }}
    />
  );
}

/**
 * A proposal on a phone: one card, no sideways scroll — the title, where it
 * points, when, and the kind's own decision words. A tap opens the window.
 */
function ApprovalCard({
  item,
  controls,
  decide,
}: {
  item: ApprovalItem;
  controls: MatrxDataTableMobileCardControls;
  decide: ReactNode;
}) {
  const flagged = statusLabel(item) !== "Waiting";
  return (
    <div className="flex min-w-0 items-start gap-2 px-3 py-2">
      {controls.selectable ? (
        <label
          className="matrx-tap-area mt-0.5 flex shrink-0 items-center"
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={controls.selected}
            aria-label={`Select ${item.headline}`}
            onCheckedChange={(next) => controls.onSelectedChange(next === true)}
          />
        </label>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1">
        <button
          type="button"
          className="block w-full min-w-0 text-left type-title leading-snug text-foreground line-clamp-2"
          onClick={() => controls.open?.()}
        >
          {item.headline}
        </button>
        <div className="flex min-w-0 items-center gap-2 type-meta text-muted-foreground">
          {item.doors ? (
            <span className="min-w-0 overflow-hidden whitespace-nowrap">{item.doors}</span>
          ) : null}
          {item.proposedAt ? (
            <span className="shrink-0">{formatRelativeTime(new Date(item.proposedAt))}</span>
          ) : null}
          {flagged ? <span className="shrink-0 text-warning">{statusLabel(item)}</span> : null}
        </div>
        {decide ? <div className="-ml-2 flex">{decide}</div> : null}
      </div>
    </div>
  );
}

/** Everything one proposal says, in its window: nothing a row used to show is lost. */
export function ApprovalRowDetail({
  item,
  kindLabel,
  decide,
  decided,
}: {
  item: ApprovalItem;
  kindLabel: string;
  decide: ReactNode;
  /** Set once this screen decided the row: the window then says so, and the question and its buttons are gone. */
  decided?: DecidedState | undefined;
}) {
  const proposedAt = item.proposedAt ? new Date(item.proposedAt) : null;
  const proposedLabel =
    proposedAt && !Number.isNaN(proposedAt.getTime()) ? formatAbsoluteDate(proposedAt) : null;
  return (
    <div className="min-w-0 space-y-3 p-3">
      <div className="flex min-w-0 items-start gap-2">
        <KindBadge className="mt-0.5 shrink-0">{item.badge ?? kindLabel}</KindBadge>
        <p className="min-w-0 flex-1 break-words type-heading text-foreground">{item.headline}</p>
      </div>
      {decided ? (
        <p className="break-words type-secondary font-medium text-foreground" role="status">
          {DECIDED_WORD[decided]}
        </p>
      ) : decide ? (
        <div className="flex justify-end">{decide}</div>
      ) : null}

      {/* Not yours to approve — but never hidden, and never a disabled control
          with no reason (THE NO-SILENT-FAILURE LAW). */}
      {item.blocked ? (
        <p className="break-words type-secondary text-warning">
          {item.blocked.reason} {item.blocked.whoCan}
        </p>
      ) : null}
      {/* An approve is running on the server RIGHT NOW: no decision controls. */}
      {item.inFlight ? (
        <p className="break-words type-secondary text-muted-foreground">{item.inFlight.sentence}</p>
      ) : null}
      {/* 🚨 THE LAST APPROVE FAILED AND THE CHANGE WAS NOT MADE (§ A-iii). */}
      {item.lastAttempt?.state === "failed" ? (
        <p className="break-words type-secondary font-medium text-destructive">
          {item.lastAttempt.sentence}
          <ErrorAlchemyMenu />
        </p>
      ) : null}
      {/* 🚨 THE WRITE REACHED GOOGLE AND THE ANSWER WAS LOST (§ A-N1): the
          server's sentence, and no retry anywhere on the row. */}
      {item.lastAttempt?.state === "applied_unconfirmed" ? (
        <p className="break-words type-secondary font-medium text-warning">{item.lastAttempt.sentence}</p>
      ) : null}
      {/* 🚨 SOMETHING IS WAITING AND THIS BUILD CANNOT SHOW IT (§ A-N6). */}
      {item.unreadable ? (
        <p className="break-words type-secondary font-medium text-warning">{item.unreadable.sentence}</p>
      ) : null}
      {/* 🚨 A RECEIPT STATE THIS BUILD HAS NEVER HEARD OF (§ V14-4). */}
      {item.unknownState ? (
        <p className="break-words type-secondary font-medium text-warning">{item.unknownState.sentence}</p>
      ) : null}
      {/* 🚨 PAST THE ORGANIZATION'S REVIEW WINDOW (§ A-N7). */}
      {item.expired ? (
        <p className="break-words type-secondary font-medium text-warning">{item.expired.sentence}</p>
      ) : null}

      <div className="space-y-2">
        <PropertyRow label="If approved" value={item.acceptEffect} />
        <PropertyRow label="If rejected" value={item.rejectEffect} />
        <PropertyRow label="Records" value={item.doors ?? null} {...(item.doors ? {} : { missing: "None" })} />
        <PropertyRow
          label="Proposed by"
          value={item.proposedBy ?? null}
          {...(item.proposedBy ? {} : { missing: "Unknown" })}
        />
        <PropertyRow
          label="Proposed"
          value={proposedLabel}
          {...(proposedLabel ? {} : { missing: "Unknown" })}
        />
        <PropertyRow label="Mode" value={decided ? DECIDED_WORD[decided] : <ModeLine item={item} />} />
      </div>

      {item.body ? <div className="min-w-0">{item.body}</div> : null}
      {/* 🚨 A ROW THAT CANNOT BE ACTED ON MOUNTS NO KIND'S ACTION EITHER
          (Bugbot round 11, frontend PR 228): one gate, here, for every kind. */}
      {item.individualReview && !noLiveAction(item) ? (
        <div className="min-w-0">{item.individualReview}</div>
      ) : null}
    </div>
  );
}

export function ApprovalQueue({
  scope,
  registry,
  kinds,
  title,
  defaultExpanded = false,
  hideWhenEmpty = true,
  onSummary,
  focusItemId,
  onFocusResolved,
  tableId,
  className,
  surfaceName = null,
}: {
  /**
   * The page surface this queue is the body of (`matrx-user/approvals` on /approvals): the queue
   * contributes what is waiting there. Read-only — an agent never decides an approval.
   */
  surfaceName?: string | null;
  scope: ApprovalScope;
  /**
   * Override the registry — tests only. Production mounts use THE registry so
   * that every kind reaches every queue; a host narrows with `kinds`, never by
   * handing in a shorter list (that is how a second queue starts).
   */
  registry?: readonly ApprovalKind[];
  /** Narrow to some kinds (`kindId` or `kindId:subKind`); omit for all. */
  kinds?: readonly string[];
  /** Header title; defaults to "Waiting on your approval". */
  title?: ReactNode;
  defaultExpanded?: boolean;
  /** Render nothing while there is nothing to decide (and nothing failed). */
  hideWhenEmpty?: boolean;
  /** For a host that aggregates many queues (a cross-scope console). */
  onSummary?: (scopeKey: string, summary: ApprovalQueueSummary) => void;
  /**
   * A row to open at and point to — the id in `/approvals?item=<id>`, which is
   * where an assist chip and every deep link land. The queue expands, scrolls
   * to it and rings it.
   */
  focusItemId?: string | null;
  /**
   * Told what became of that row once it is known — shown, decided, still
   * pending but outside this page, not an approval item at all, or unconfirmed.
   * A host that asked for one must SAY which of those it is rather than showing
   * a list and letting the person hunt, and must never call a row decided on
   * its absence alone.
   *
   * 🚨 IT REPORTS THE ID IT IS ANSWERING ABOUT. A verdict with no id attached
   * outlives the question: `?item=` changed, the next read took a moment, and
   * the banner kept labeling the NEW row with the previous row's verdict
   * (Bugbot MEDIUM, frontend PR 228). The host renders a verdict only while its
   * id is still the one it is asking about.
   */
  onFocusResolved?: (
    itemId: string,
    resolution: ApprovalFocusResolution,
    /**
     * What the verdict cannot invent: where a row that is NOT in this list
     * lives, and the refusal a failed apply came back with (THE DOOR LAW).
     */
    detail?: ApprovalFocusDetail,
  ) => void;
  /**
   * The list's stable table id — its search, sort, filters, page and collapsed
   * groups live in the URL under `table.<id>.*`. Defaults to one derived from
   * the kinds and scope, so two queues on one page never share a namespace.
   */
  tableId?: string;
  className?: string;
}) {
  const all = registry ?? APPROVAL_KINDS;
  const requested = all.filter(
    (kind) => !kinds || kinds.some((entry) => entry.split(":")[0] === kind.id),
  );
  // A kind that needs a dimension this mount does not carry is NOT quietly
  // dropped — it is named, with the door to where its proposals live. THE ONE
  // PREDICATE decides what is mounted (`./rendered.ts`), and the badge asks it
  // over the same list, so the two can never disagree (§ A-i).
  const mounted = mountedApprovalKinds(requested, scope);
  const elsewhere = requested.filter((kind) => !mounted.includes(kind));
  const [slots, setSlots] = useState<Record<string, Slot>>({});
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState<PendingDecision | null>(null);
  const [chooser, setChooser] = useState<{
    kind: ApprovalKind;
    items: ApprovalItem[];
  } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [decidedByKey, setDecidedByKey] = useState<ReadonlyMap<string, DecidedState>>(() => new Map());

  const report = (kindId: string, slot: Slot) =>
    setSlots((previous) => ({ ...previous, [kindId]: slot }));

  const kindById = new Map(mounted.map((kind) => [kind.id, kind]));
  const sections = mounted.map((kind) => {
    const slot = slots[kind.id];
    const items = (slot?.source.items ?? []).filter((item) =>
      matches(kinds, item),
    );
    const narrowed = kinds?.some((entry) => entry === kind.id) === false;
    return {
      kind,
      slot,
      items,
      // A sub-kind filter only knows the page it filtered.
      total: narrowed
        ? items.length
        : Math.max(slot?.source.total ?? 0, items.length),
    };
  });
  const allItems = sections.flatMap((section) => section.items);
  const count = sections.reduce((sum, section) => sum + section.total, 0);
  const loading = mounted.some(
    (kind) => !slots[kind.id] || slots[kind.id]?.source.loading,
  );
  const failed = sections.filter((section) => section.slot?.source.error);

  // LAYOUT SHIFT: kinds read one by one, so the list used to grow section by section — a late kind
  // sorting ABOVE an earlier one pushed it down (CLS 0.89 at 375px), and the "shown elsewhere" notes
  // were drawn first and pushed away by the rows. The body below the header draws once, when every
  // mounted kind has answered the first time; later refetches keep what is on screen.
  const [firstSettled, setFirstSettled] = useState(false);
  if (!loading && !firstSettled) setFirstSettled(true);
  const bodyReady = firstSettled || !loading;

  const summarySignature = `${count}|${loading}|${failed.length}`;
  useEffect(() => {
    onSummary?.(scope.key, { count, loading, errors: failed.length });
  }, [summarySignature, scope.key]);

  // Reviewed-alone rows and rows this reader cannot act on are never part of
  // a batch: one is a decision that needs its body read, the other is not the
  // reader's to make.
  //
  // 🚨 THIS MUST ASK THE SAME PREDICATE AS THE ROW CHECKBOX AND `individualReview`
  // — `noLiveAction(item)`, not a second hand-listed set of states. Until
  // 2026-09-18 this filter named `inFlight`/`unreadable`/`unknownState`/`expired`
  // by hand and left out `applied_unconfirmed` — a write that already reached
  // Google with the answer lost. The row itself correctly refused its own
  // checkbox and its own Approve/Reject over that state (`noDecisionControls`),
  // but Select All still ticked it and batch Approve resubmitted it, appending
  // or creating a second copy of a change Google may already have made
  // (Bugbot PR 228, comment 4042916419 — the exact class B-18/B-25 closed on the
  // server). One predicate, asked once, so a state added to `noLiveAction`
  // reaches select-all, batch approve/reject, and the row's own controls at the
  // same moment.
  const selectable = allItems.filter(
    (item) => !item.individualReview && !item.blocked && !noLiveAction(item),
  );
  const selectedItems = selectable.filter((item) => selected.has(item.key));
  const allSelected =
    selectable.length > 0 && selectedItems.length === selectable.length;
  const selectedKindIds = new Set(selectedItems.map((item) => item.kindId));
  const batchRejectNeedsOneKind =
    selectedKindIds.size > 1 &&
    [...selectedKindIds].some((id) => kindById.get(id)?.RejectChooser);

  const begin = (decision: Decision, items: ApprovalItem[]) => {
    if (items.length === 0) return;
    if (decision === "reject") {
      const kind = kindById.get(items[0]?.kindId ?? "");
      if (kind?.RejectChooser) {
        setChooser({ kind, items });
        return;
      }
    }
    setReason("");
    setPending({ decision, items, choice: null });
  };

  const copyFor = (decision: Decision, kindId: string) => {
    const kind = kindById.get(kindId);
    return kind ? kind[decision] : undefined;
  };

  const run = async (decision: PendingDecision) => {
    setBusy(true);
    const note = reason.trim() || null;
    let applied = 0;
    const failures: string[] = [];
    /**
     * Items the writer found ALREADY DECIDED — neither applied nor refused.
     * They get their own sentence: a door that answers idempotently must not be
     * reported as having done the thing (Bugbot MEDIUM, frontend PR 228).
     */
    const alreadyDecided: string[] = [];
    /**
     * 🚨 ITEMS WHOSE OUTCOME NOBODY KNOWS — the change reached Google and the
     * answer was lost (aidream lane B-10, `receipt.state ===
     * "applied_unconfirmed"`). Their own list, because both other sentences
     * would be false: "Approved n" claims the change landed, and "could not be
     * saved and is still waiting for you" claims it did not and invites the
     * retry that appends the same block twice.
     */
    const unconfirmed: string[] = [];
    // Kind by kind, in queue order; each kind's writer runs its items itself.
    for (const section of sections) {
      const items = decision.items.filter(
        (item) => item.kindId === section.kind.id,
      );
      if (items.length === 0 || !section.slot) continue;
      const writer =
        decision.decision === "accept"
          ? section.slot.decisions.acceptItems(
              items,
              section.kind.accept.keepsReason ? note : null,
            )
          : section.slot.decisions.rejectItems(
              items,
              section.kind.reject.keepsReason ? note : null,
              decision.choice,
            );
      try {
        const outcome = await writer;
        applied += outcome.applied;
        // Every item this writer did not refuse or leave unconfirmed is closed in the store: say so on the
        // screen at once, so an open window never keeps asking about it.
        const notClosed = new Set([
          ...outcome.failures.map((failure) => failure.key),
          ...(outcome.unconfirmed ?? []).map((entry) => entry.key),
        ]);
        const refused = new Set((outcome.alreadyDecided ?? []).map((entry) => entry.key));
        setDecidedByKey((held) => {
          const next = new Map(held);
          for (const item of items) {
            if (notClosed.has(item.key)) continue;
            next.set(item.key, refused.has(item.key) ? "decided" : decision.decision);
          }
          return next;
        });
        failures.push(...outcome.failures.map((failure) => failure.message));
        alreadyDecided.push(
          ...(outcome.alreadyDecided ?? []).map((entry) => entry.message),
        );
        unconfirmed.push(
          ...(outcome.unconfirmed ?? []).map((entry) => entry.message),
        );
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
      section.slot.source.refetch();
    }
    setBusy(false);
    setPending(null);
    setSelected(new Set());
    if (applied > 0) {
      toast.success(
        `${decision.decision === "accept" ? "Approved" : "Rejected"} ${applied} proposal${applied === 1 ? "" : "s"}.`,
      );
    }
    // Said BEFORE the failures and after the successes, because it is the answer
    // to "what happened to the rest" — never folded into either count.
    if (alreadyDecided.length > 0) {
      toast.info(
        alreadyDecided.length === 1
          ? "One of those was already decided, so this did not change it."
          : `${alreadyDecided.length} of those were already decided, so this did not change them.`,
        { description: alreadyDecided[0] },
      );
    }
    /**
     * 🚨 NEVER "could not be saved", and never a count of successes: the change
     * MAY have been made, and the only honest instruction is to go and look. The
     * words are the server's own (`unconfirmed_sentence`), carried through the
     * one adapter.
     */
    if (unconfirmed.length > 0) {
      toast.warning(
        unconfirmed.length === 1
          ? "One of those may have been made — check it before asking for it again."
          : `${unconfirmed.length} of those may have been made — check them before asking for them again.`,
        { description: unconfirmed[0] },
      );
    }
    if (failures.length > 0) {
      toast.error(
        `${failures.length} could not be saved and ${failures.length === 1 ? "is" : "are"} still waiting for you.`,
        { description: failures[0] },
      );
    }
  };

  const pendingCopies = pending
    ? [...new Set(pending.items.map((item) => item.kindId))].flatMap((id) => {
        const copy = copyFor(pending.decision, id);
        return copy ? [{ id, copy }] : [];
      })
    : [];
  const asksReason = pendingCopies.some(({ copy }) => copy.keepsReason);
  const reasonRequired = pendingCopies.some(
    ({ copy }) => copy.keepsReason && copy.reasonRequired,
  );
  const reasonDropped = pendingCopies
    .filter(({ copy }) => !copy.keepsReason)
    .map(({ id }) => kindById.get(id)?.label ?? id);
  const pendingLabel =
    pendingCopies.length === 1
      ? (pendingCopies[0]?.copy.label ?? "")
      : pending?.decision === "accept"
        ? "Approve"
        : "Reject";



  // The row a deep link points at (`?item=<assist id>`), matched on the id half
  // of the item key so a kind never has to know about linking.
  const focusedKey = focusItemId
    ? (allItems.find((item) => item.key.endsWith(`:${focusItemId}`))?.key ??
      null)
    : null;
  // A deep link into a collapsed list expands it FIRST. Rows exist in the DOM
  // only once `expanded` is true, so the scroll cannot ride in this same turn
  // (Bugbot LOW #3, 2026-09-17).
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  if (focusedKey && focusedKey !== expandedFor) {
    setExpandedFor(focusedKey);
    if (!expanded) setExpanded(true);
  }

  // The table pages to, scrolls to and rings the focused row itself (`focusRowId`).

  /**
   * EVERY INPUT THE DEEP-LINK RESOLUTION READS, as one comparable string — the
   * mount's whole scope plus the kinds it carries and the registry it judges
   * against. Derived, never a hand-listed field set, for the same reason
   * `renderedSignature` is (a field a future kind reads is in it already).
   */
  const resolutionKey = JSON.stringify({
    scope,
    mounted: mounted.map((kind) => kind.id),
    all: all.map((kind) => kind.id),
  });

  /**
   * WHAT HAPPENED TO THE ROW THE LINK NAMED — answered by evidence, never by
   * absence. Each kind reads ONE page (`approvals.queue_page_size`), so a row that is
   * not on screen may simply be row 51 and still waiting; saying "already
   * decided" there is the screen lying (Bugbot MEDIUM #2, 2026-09-17). The
   * queue therefore reads that id directly and reports what the store says.
   */
  useSurfaceScopeContribution(surfaceName, "approval-queue", () =>
    ({
      approvals_load_status: loading ? "loading" : failed.length ? "partly_failed" : "loaded",
      approvals_waiting_count: count,
      approvals: allItems.slice(0, 40).map((item) => ({
        key: item.key,
        kind: sections.find((section) => section.kind.id === item.kindId)?.kind.label ?? item.kindId,
        headline: item.headline,
        approve_does: item.acceptEffect,
        reject_does: item.rejectEffect,
        proposed_by: item.proposedBy ?? null,
        proposed_at: item.proposedAt ?? null,
        auto_applies_at: item.autoApplyAt ?? null,
        blocked: item.blocked?.reason ?? null,
        decided: decidedByKey.get(item.key) ?? null,
      })),
      focused_approval_key: focusedKey,
    }) as SurfaceScopePayload,
  );

  useEffect(() => {
    if (!focusItemId) return;
    if (focusedKey) {
      onFocusResolved?.(focusItemId, "shown");
      return;
    }
    // Only once the read has settled is "not here" a question worth asking.
    if (loading) return;
    let cancelled = false;
    void (async () => {
      // THE SAME PREDICATE the list and the badge ask — so "not here" can be
      // told apart from "not in this list at all" (Bugbot round 9 #9), and a
      // FAILED or in-flight apply is never called "decided" (§ A-iii).
      const read = await readProposalStatus({
        userId: scope.userId,
        proposalId: focusItemId,
        mounted,
        allKinds: all,
        scope,
      });
      if (cancelled) return;
      const resolution: ApprovalFocusResolution =
        read.status === "pending"
          ? "pending_elsewhere"
          : read.status === "not_in_this_list"
            ? "not_in_this_list"
            : read.status === "no_screen"
              ? "no_screen"
              : read.status === "apply_failed"
                ? "apply_failed"
                : // 🚨 The write reached Google and the answer was lost: its own
                  // verdict, because "decided" and "failed" are both false here.
                  read.status === "applied_unconfirmed"
                  ? "applied_unconfirmed"
                  : read.status === "applying"
                    ? "applying"
                    : // 🚨 A receipt state this build cannot read is its own
                      // verdict too (Bugbot round 17): it used to fall through
                      // to `decided` below.
                      read.status === "unknown_state"
                      ? "unknown_state"
                      : read.status === "decided"
                        ? "decided"
                        : read.status === "not_a_proposal"
                          ? "not_an_approval"
                          : "unconfirmed";
      onFocusResolved?.(focusItemId, resolution, {
        ...(read.explain ? { explain: read.explain } : {}),
        ...(read.where ? { where: read.where } : {}),
        ...(read.error !== undefined ? { error: read.error } : {}),
        ...(read.state !== undefined ? { state: read.state } : {}),
      });
    })();
    return () => {
      cancelled = true;
    };
    // 🚨 EVERY INPUT THE RESOLUTION READS IS IN THIS KEY. It used to list
    // `scope.userId` alone, so a mount that switched SITE (or kinds, or subject)
    // kept the previous mount's verdict and the previous mount's door on screen
    // for the same `?item=` — the console mounts a queue per site, and a row
    // resolved against site A stayed resolved against site A (Bugbot round 10,
    // finding 3). Deriving the key means a scope field a future kind reads is in
    // it the moment it exists.
  }, [focusItemId, focusedKey, loading, resolutionKey]);

  const hidden =
    hideWhenEmpty &&
    allItems.length === 0 &&
    failed.length === 0 &&
    elsewhere.length === 0;

  return (
    <>
      {mounted.map((kind) => (
        <KindSlot key={kind.id} kind={kind} scope={scope} onReport={report} />
      ))}

      {hidden ? null : (
        <div
          className={cn(
            "rounded-lg border border-border bg-card px-3 py-2.5",
            className,
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <AGENT_ICON className="size-4 shrink-0 text-muted-foreground" />
            <span className="type-title text-foreground">
              {title ?? "Waiting on your approval"}
            </span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
              {count.toLocaleString()}
            </Badge>
            <span className="type-secondary text-muted-foreground">
              Nothing here changes until you decide.
            </span>
            <Button
              icon={expanded ? (
                <ChevronDown />
              ) : (
                <ChevronRight />
              )}
              variant="quiet"
              className="ml-auto"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Hide the list" : `Review ${count.toLocaleString()}`}
            </Button>
          </div>

          {failed.map((section) => (
            <ApprovalLoadError
              key={section.kind.id}
              what={`the ${section.kind.label.toLowerCase()} proposals`}
              error={section.slot?.source.error}
              onRetry={() => section.slot?.source.refetch()}
            />
          ))}

          {expanded && bodyReady && allItems.length > 0 ? (
            <div className="mt-2.5 border-t border-border pt-2">
              <ApprovalTable
                tableId={tableId ?? `approvals.${(kinds ?? ["all"]).join("+")}.${scope.key}`}
                sections={sections}
                selectable={selectable}
                selectedKeys={selected}
                onSelectedKeysChange={setSelected}
                busy={busy}
                batchRejectNeedsOneKind={batchRejectNeedsOneKind}
                focusedKey={focusedKey}
                decidedByKey={decidedByKey}
                onDecide={begin}
              />
            </div>
          ) : null}

          {/* Kinds this mount cannot read for, named with their door — a queue
              that silently omits a whole kind is the scattered-inbox failure
              wearing a single-queue costume. */}
          {(bodyReady ? elsewhere : []).map((kind) => {
            const requirement = kind.scopeRequirement;
            if (!requirement) return null;
            return (
              <p
                key={kind.id}
                className="mt-1.5 break-words type-meta text-muted-foreground"
              >
                {kind.label}: {requirement.explain}{" "}
                <AppLink
                  href={requirement.where.href}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {requirement.where.label}
                </AppLink>
              </p>
            );
          })}
        </div>
      )}

      {chooser?.kind.RejectChooser ? (
        <chooser.kind.RejectChooser
          scope={scope}
          items={chooser.items}
          onCancel={() => setChooser(null)}
          onChosen={(choice, chosenReason) => {
            const items = chooser.items;
            setChooser(null);
            setReason(chosenReason ?? "");
            setPending({ decision: "reject", items, choice });
          }}
        />
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null);
        }}
        title={`${pendingLabel} ${pending?.items.length ?? 0} proposal${pending?.items.length === 1 ? "" : "s"}?`}
        description={
          pending?.items.length === 1
            ? "This makes the following change:"
            : "This makes each of the following changes:"
        }
        content={
          pending ? (
            <div className="space-y-2">
              <div className="max-h-56 space-y-1.5 overflow-y-auto overscroll-contain rounded-md border border-border p-2">
                {pending.items.map((item) => (
                  <div key={item.key}>
                    <span className="block break-words type-title text-foreground">
                      {item.headline}
                    </span>
                    <span className="block break-words type-secondary text-muted-foreground">
                      {pending.decision === "accept"
                        ? item.acceptEffect
                        : item.rejectEffect}
                    </span>
                  </div>
                ))}
              </div>
              {asksReason ? (
                <ProTextarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  placeholder={
                    pendingCopies.find(({ copy }) => copy.keepsReason)?.copy
                      .reasonPrompt ?? "Why? (optional)"
                  }
                  aria-label="Your reason"
                />
              ) : null}
              {asksReason && reasonDropped.length > 0 ? (
                <p className="type-meta text-muted-foreground">
                  Reason not kept on {reasonDropped.join(", ")}
                </p>
              ) : null}
            </div>
          ) : null
        }
        confirmLabel={`${pendingLabel} ${pending?.items.length ?? 0}`}
        busy={busy}
        confirmDisabled={reasonRequired && reason.trim().length === 0}
        onConfirm={() => {
          if (pending) void run(pending);
        }}
      />
    </>
  );
}
