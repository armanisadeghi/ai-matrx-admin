"use client";

// features/bindings/batch/PlacesBatchGrid.tsx
//
// THE MIDDLE, TRANSPOSED (UI-STANDARD P17). Places are rows, the holder's
// inputs are columns, and every cell is the same four-source picker the middle
// uses — with an Advanced popover onto the full card.
//
// The grid is the canonical batch matrix (`MatrxBatchGrid`, @ai-matrx/design-system):
// the health icon and its rule, the ADD/UPD badge, the fill-down that states its own
// limits, the per-row refusal sentences and the remove action are its parts; this file
// composes them over this domain's nouns and invents none of them.
//
// Every refusal is printed ON THE ROW THAT CAUSED IT (P7). A red row says, in
// domain words, exactly what stands in the way — the grid never sends a person
// hunting for a coloured dot's meaning.

import {
  MatrxBatchGrid,
  type BatchGridColumn,
  type BatchGridRowStatus,
} from "@ai-matrx/design-system/data-table";

import {
  SurfaceVariableBinding,
  type BindingTarget,
} from "@/features/surfaces/admin/columns/SurfaceVariableBinding";
import type { ValueMapping } from "@ai-matrx/chat/surfaces/types";
import type {
  ConsumptionMap,
  OfferedValue,
} from "@/features/mandates/provision-shapes";
import { PlaceBindingCell } from "./PlaceBindingCell";
import { offeredValuesToSurfaceValues } from "../offered-adapter";
import { sourceLabelsFor, FILL_DOWN_LIMITS } from "../words";
import type { PlaceHealth, PlaceOfferState, PlaceRow } from "./batch-model";
import { displayLabel } from "@ai-matrx/kit/text-case";

export interface PlacesBatchGridProps {
  rows: readonly PlaceRow[];
  holderKind: "agent" | "workflow";
  /** Inputs flipped to per-row — these are the columns. */
  columns: readonly BindingTarget[];
  contextKeys: ReadonlySet<string>;
  offerOf: (key: string) => PlaceOfferState;
  healthOf: (key: string) => PlaceHealth;
  mapOf: (key: string) => ConsumptionMap;
  pinnedContextOf: (key: string) => readonly string[];
  /**
   * Values EVERY place in the batch offers. The fill-down picker shows these
   * and only these, because a value one place has and another does not cannot
   * be promised to every row — the same reason the shortcut grid's fill-down
   * offers baseline values alone.
   */
  commonOffered: readonly OfferedValue[];
  /** Places already written this pass — dimmed, never removed under the eye. */
  appliedKeys: ReadonlySet<string>;
  attentionOnly: boolean;
  disabled?: boolean;
  onMapChange: (key: string, next: ConsumptionMap) => void;
  onRemoveRow: (key: string) => void;
  onFillDown: (targetName: string, mapping: ValueMapping | null) => void;
}

/**
 * The row's TONE decides the icon, so its colour and its sentence can never
 * disagree with the refusal printed beside Apply.
 */
function statusOf(health: PlaceHealth): BatchGridRowStatus {
  if (health.tone === "red") {
    const count =
      health.unmapped + health.problems.length + health.blockers.length;
    const n = count + health.warnings.length;
    return {
      tone: "blocked",
      label: `${n} ${n === 1 ? "thing stands" : "things stand"} in the way of writing this place — the row says what`,
    };
  }
  if (health.tone === "amber") {
    const n = health.unfedRequired.length;
    return {
      tone: "attention",
      label: `${n} required ${n === 1 ? "input has" : "inputs have"} nothing feeding it`,
    };
  }
  return { tone: "ready", label: "This place is ready to write" };
}

/** P7 — the reasons, in domain words, for the row that caused them. */
function sentencesOf(health: PlaceHealth): string[] {
  return [
    ...(health.unmapped > 0
      ? [
          `${health.unmapped} ${health.unmapped === 1 ? "input is" : "inputs are"} waiting for you to pick which offered value feeds ${health.unmapped === 1 ? "it" : "them"}.`,
        ]
      : []),
    // H3 — an unread place says so, and says nothing else.
    ...(health.unknown ? [health.unknown] : []),
    ...health.blockers,
    ...health.warnings.map(
      (warning) => `Contract mismatch (it still saves): ${warning}`,
    ),
    ...health.problems,
    ...health.unfedRequired.map(
      (name) =>
        `"${name}" is required and nothing feeds it, and the Mandate Holder has no default of its own.`,
    ),
  ];
}

export function PlacesBatchGrid({
  rows,
  holderKind,
  columns,
  contextKeys,
  commonOffered,
  offerOf,
  healthOf,
  mapOf,
  pinnedContextOf,
  appliedKeys,
  attentionOnly,
  disabled,
  onMapChange,
  onRemoveRow,
  onFillDown,
}: PlacesBatchGridProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
        No places in this batch yet — pick the jobs this Mandate Holder should fulfil
        above, and they become rows here.
      </div>
    );
  }

  const commonSurfaceValues = offeredValuesToSurfaceValues(commonOffered);
  const visible = attentionOnly
    ? rows.filter((row) => healthOf(row.key).tone !== "green")
    : rows;

  const gridColumns: BatchGridColumn<PlaceRow>[] = columns.map((target) => ({
    id: target.name,
    header: displayLabel(target.label, target.name),
    helpText: target.name,
    width: 240,
    caption: (
      <>
        {target.required ? (
          <span className="text-destructive-ink">Required</span>
        ) : (
          <span>Optional</span>
        )}
        <span> · {contextKeys.has(target.name) ? "context slot" : "variable"}</span>
      </>
    ),
    read: (row) => mapOf(row.key)[target.name] ?? null,
    render: (row) => (
      <PlaceBindingCell
        placeLabel={row.label}
        holderKind={holderKind}
        offerState={offerOf(row.key)}
        target={target}
        isContext={contextKeys.has(target.name)}
        pinnedContext={pinnedContextOf(row.key)}
        map={mapOf(row.key)}
        disabled={Boolean(disabled) || appliedKeys.has(row.key)}
        onChange={(next) => onMapChange(row.key, next)}
      />
    ),
    fill: {
      label: "Fill down",
      title: "Feed this input the same way at every place",
      limits: FILL_DOWN_LIMITS,
      applyLabel: "Fill every place",
      width: 384,
      onApply: (value) =>
        onFillDown(target.name, (value as ValueMapping | undefined) ?? null),
      renderControl: (value, set) => (
        <SurfaceVariableBinding
          target={target}
          mapping={(value as ValueMapping | undefined) ?? undefined}
          availableSurfaceValues={commonSurfaceValues}
          sourceLabels={sourceLabelsFor(holderKind)}
          valueFieldLabel="Offered value"
          onChange={(next) => set(next)}
        />
      ),
    },
  }));

  return (
    <MatrxBatchGrid<PlaceRow>
      tableId="bindings-places-batch"
      rows={visible}
      getRowId={(row) => row.key}
      rowHeader={{
        header: "Place",
        width: 260,
        label: (row) => row.label,
        render: (row) => (
          <span className="block min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {row.label}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="truncate font-mono">{row.mandateKey}</span>
              {row.offeredCount !== null ? (
                <span className="shrink-0">· offers {row.offeredCount}</span>
              ) : null}
            </span>
          </span>
        ),
      }}
      columns={gridColumns}
      // Every cell here is a picker; nothing reaches the grid as typed or pasted text.
      onChange={() => undefined}
      status={(row) => statusOf(healthOf(row.key))}
      kind={(row) => row.kind}
      kindWords={{
        add: "No answer at this rung yet — this writes a new one",
        update: "This replaces the answer already written at this rung",
      }}
      notes={(row) => {
        const health = healthOf(row.key);
        const tone = health.tone === "red" ? "blocked" : "attention";
        return sentencesOf(health).map((text) => ({ tone, text }));
      }}
      doneRowIds={appliedKeys}
      onRemoveRow={(row) => onRemoveRow(row.key)}
      removeLabel={(row) => `Remove ${row.label} from this batch`}
      emptyState={{ title: "Every place in this batch is ready to write." }}
      {...(columns.length === 0
        ? {
            footnote:
              "No per-place columns yet — flip an input to Per place above to vary it here.",
          }
        : {})}
    />
  );
}
