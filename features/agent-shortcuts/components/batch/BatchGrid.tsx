"use client";

// THE SHORTCUT BATCH GRID — surfaces as rows, per-row fields and per-row variable bindings as
// columns, on the canonical batch matrix (`MatrxBatchGrid`, @ai-matrx/design-system). The grid
// owns the gestures (range select, copy, Excel paste into scalar fields, fill handle, undo,
// keyboard); this file owns the nouns and the writes, which go through the same three callbacks
// as before (`onRowOverrideChange`, `onRowMappingChange`, `onRemoveRow`) and the two column fills.

import { BASELINE_VALUES } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import {
  MatrxBatchGrid,
  type BatchGridChange,
  type BatchGridColumn,
} from "@ai-matrx/design-system/data-table";
import {
  SurfaceVariableBinding,
  type BindingTarget,
} from "@/features/surfaces/admin/columns/SurfaceVariableBinding";
import type { SurfaceValue, ValueMapping } from "@ai-matrx/chat/surfaces/types";
import { getSurfaceDisplayLabel } from "@ai-matrx/chat/surfaces/utils/surface-display";
import { ScalarValueControl } from "./BatchFieldControls";
import { BatchBindingCell } from "./BatchBindingCell";
import {
  getFieldDef,
  rowAttention,
  rowInheritedScalar,
  type BatchContext,
  type BatchRow,
  type BatchScalarFieldKey,
} from "./batchModel";
import { displayLabel } from "@ai-matrx/kit/text-case";

const BASELINE_ONLY: SurfaceValue[] = Object.values(BASELINE_VALUES).sort(
  (a, b) => (a.sortOrder ?? 1000) - (b.sortOrder ?? 1000),
);

const FIELD_PREFIX = "field:";

interface Props {
  ctx: BatchContext;
  rows: readonly BatchRow[];
  /** All binding targets — used for per-row attention. */
  targets: readonly BindingTarget[];
  /** Binding targets whose mode is "row" — these become columns. */
  bindingColumns: readonly BindingTarget[];
  perRowFieldKeys: readonly BatchScalarFieldKey[];
  categoryOptions: ReadonlyArray<{ value: string; label: string }>;
  attentionOnly: boolean;
  /** Hide rows already written this session. */
  hideComplete: boolean;
  /** Row keys successfully written this session. */
  appliedKeys: ReadonlySet<string>;
  onRowOverrideChange: (
    rowKey: string,
    fieldKey: BatchScalarFieldKey,
    value: unknown,
  ) => void;
  onRowMappingChange: (
    rowKey: string,
    targetName: string,
    mapping: ValueMapping | null,
  ) => void;
  onRemoveRow: (rowKey: string) => void;
  onFillScalar: (fieldKey: BatchScalarFieldKey, value: unknown) => void;
  onFillBinding: (targetName: string, mapping: ValueMapping | null) => void;
}

/** Pasted text → a scalar field's value; `undefined` refuses it (the grid says so). */
function scalarFromText(
  key: BatchScalarFieldKey,
  text: string,
  categoryOptions: ReadonlyArray<{ value: string; label: string }>,
): unknown {
  const control = getFieldDef(key).control;
  const raw = text.trim();
  switch (control.kind) {
    case "text":
      return text;
    case "number": {
      if (raw === "") return null;
      const n = Number(raw);
      if (!Number.isFinite(n)) return undefined;
      if (control.min !== undefined && n < control.min) return undefined;
      if (control.max !== undefined && n > control.max) return undefined;
      return n;
    }
    case "boolean": {
      const lower = raw.toLowerCase();
      if (["true", "yes", "on", "1"].includes(lower)) return true;
      if (["false", "no", "off", "0"].includes(lower)) return false;
      return undefined;
    }
    case "select":
    case "dynamic-select": {
      const options = control.kind === "select" ? control.options : categoryOptions;
      const lower = raw.toLowerCase();
      return options.find(
        (option) => option.value.toLowerCase() === lower || option.label.toLowerCase() === lower,
      )?.value;
    }
    default:
      return undefined;
  }
}

export function BatchGrid({
  ctx,
  rows,
  targets,
  bindingColumns,
  perRowFieldKeys,
  categoryOptions,
  attentionOnly,
  hideComplete,
  appliedKeys,
  onRowOverrideChange,
  onRowMappingChange,
  onRemoveRow,
  onFillScalar,
  onFillBinding,
}: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
        Select surfaces above to build the grid.
      </div>
    );
  }

  const visibleRows = rows.filter((r) => {
    if (hideComplete && appliedKeys.has(r.key)) return false;
    if (attentionOnly && rowAttention(ctx, r, targets).unmapped === 0)
      return false;
    return true;
  });

  const scalarValue = (row: BatchRow, key: BatchScalarFieldKey) =>
    row.overrides[key] !== undefined
      ? row.overrides[key]
      : rowInheritedScalar(ctx, row, key);

  const dynamicOptionsFor = (key: BatchScalarFieldKey) =>
    getFieldDef(key).control.kind === "dynamic-select"
      ? categoryOptions
      : undefined;

  const scalarColumns: BatchGridColumn<BatchRow>[] = perRowFieldKeys.map(
    (key) => {
      const def = getFieldDef(key);
      return {
        id: `${FIELD_PREFIX}${key}`,
        header: def.label,
        width: 170,
        read: (row) => scalarValue(row, key),
        render: (row) => (
          <ScalarValueControl
            def={def}
            value={scalarValue(row, key)}
            onChange={(v) => onRowOverrideChange(row.key, key, v)}
            dynamicOptions={dynamicOptionsFor(key)}
            compact
          />
        ),
        fromText: (text) => scalarFromText(key, text, categoryOptions),
        fill: {
          title: "Fill this column for every row",
          limits: "Set this value on every row.",
          width: 256,
          onApply: (v) => onFillScalar(key, v),
          renderControl: (value, set) => (
            <ScalarValueControl
              def={def}
              value={value}
              onChange={set}
              dynamicOptions={dynamicOptionsFor(key)}
            />
          ),
        },
      };
    },
  );

  const bindingGridColumns: BatchGridColumn<BatchRow>[] = bindingColumns.map(
    (t) => ({
      id: t.name,
      header: displayLabel(t.label, t.name),
      helpText: t.name,
      ...(t.required ? { required: true } : {}),
      width: 220,
      read: (row) => row.valueMappings[t.name] ?? null,
      render: (row) => (
        <BatchBindingCell
          surfaceName={row.surfaceName}
          target={t}
          mapping={row.valueMappings[t.name]}
          onChange={(m) => onRowMappingChange(row.key, t.name, m)}
        />
      ),
      fill: {
        title: "Fill this variable for every row",
        limits:
          "Apply one binding to every row. Direct values, prompts, and defaults fill cleanly; surface values only match where the name exists.",
        width: 320,
        onApply: (m) => onFillBinding(t.name, (m ?? null) as ValueMapping | null),
        renderControl: (value, set) => (
          <SurfaceVariableBinding
            target={t}
            mapping={(value as ValueMapping | undefined) ?? undefined}
            availableSurfaceValues={BASELINE_ONLY}
            onChange={(next) => set(next)}
          />
        ),
      },
    }),
  );

  // Pasted scalars arrive here; bindings are set with their picker (the grid refuses paste there).
  const applyChanges = (changes: BatchGridChange[]) => {
    for (const change of changes) {
      if (change.columnId.startsWith(FIELD_PREFIX)) {
        onRowOverrideChange(
          change.rowId,
          change.columnId.slice(FIELD_PREFIX.length) as BatchScalarFieldKey,
          change.value,
        );
      }
    }
  };

  return (
    <MatrxBatchGrid<BatchRow>
      tableId="agent-shortcuts-batch"
      rows={visibleRows}
      getRowId={(row) => row.key}
      rowHeader={{
        header: "Surface",
        width: 240,
        label: (row) => row.existingLabel || getSurfaceDisplayLabel(row.surfaceName),
        render: (row) => (
          <span className="block min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {row.existingLabel || getSurfaceDisplayLabel(row.surfaceName)}
            </span>
            <span className="block truncate font-mono text-[10px] text-muted-foreground">
              {row.surfaceName}
            </span>
          </span>
        ),
      }}
      columns={[...scalarColumns, ...bindingGridColumns]}
      onChange={applyChanges}
      status={(row) => {
        const att = rowAttention(ctx, row, targets);
        if (att.requiredUnmapped > 0)
          return { tone: "blocked", label: `${att.requiredUnmapped} required unmapped` };
        if (att.unmapped > 0)
          return { tone: "attention", label: `${att.unmapped} unmapped` };
        return { tone: "ready", label: "Every input on this row is answered" };
      }}
      kind={(row) => row.kind}
      kindWords={{
        add: "Will create a new shortcut",
        update: "Will update the existing shortcut",
      }}
      doneRowIds={appliedKeys}
      onRemoveRow={(row) => onRemoveRow(row.key)}
      removeLabel={() => "Remove from batch"}
      emptyState={{ title: "Every row is fully mapped." }}
      {...(perRowFieldKeys.length === 0 && bindingColumns.length === 0
        ? { footnote: "No per-row columns yet — flip a field to Per-row above to edit it here." }
        : {})}
    />
  );
}
