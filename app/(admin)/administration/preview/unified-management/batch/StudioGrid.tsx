"use client";

import { Workflow } from "lucide-react";
import {
  MatrxBatchGrid,
  type BatchGridColumn,
  type BatchGridRowStatus,
} from "@ai-matrx/design-system/data-table";
import { cn } from "@/lib/utils";
import { BindingCell } from "./BindingCell";
import { TreatmentValueControl } from "./TreatmentControls";
import {
  KNOWN_VALUES,
  TEMPLATE_TREATMENT,
  TREATMENT_FIELDS,
  isExcluded,
  isSettled,
  type Binding,
  type CascadeMode,
  type ConsumedKey,
  type MandateJob,
  type Place,
  type TreatmentKey,
  type TreatmentValue,
} from "./mock-data";

const ALL_KNOWN_VALUES = Object.values(KNOWN_VALUES);

export interface GridHandlers {
  resolveBinding: (
    job: MandateJob,
    place: Place,
    consumed: ConsumedKey,
  ) => Binding;
  resolveTreatment: (
    job: MandateJob,
    place: Place,
    key: TreatmentKey,
  ) => TreatmentValue;
  onCellBindingChange: (
    job: MandateJob,
    place: Place,
    consumed: ConsumedKey,
    next: Binding,
  ) => void;
  onCellTreatmentChange: (
    job: MandateJob,
    place: Place,
    key: TreatmentKey,
    next: TreatmentValue,
  ) => void;
  onFillBindingColumn: (
    job: MandateJob,
    consumed: ConsumedKey,
    next: Binding,
  ) => void;
  onFillTreatmentColumn: (
    job: MandateJob,
    key: TreatmentKey,
    next: TreatmentValue,
  ) => void;
}

/**
 * The grid: one block per job, one row per place, one column per per-cell field.
 * Same interaction grammar as the shortcut batch grid — sticky first column,
 * a fill-down arrow in every column header, a status dot per row, and the
 * whole thing driven by the three-level cascade above it.
 */
export function StudioGrid({
  jobs,
  places,
  bindingModes,
  treatmentModes,
  attentionOnly,
  handlers,
}: {
  jobs: readonly MandateJob[];
  places: readonly Place[];
  bindingModes: Readonly<Record<string, CascadeMode>>;
  treatmentModes: Readonly<Record<TreatmentKey, CascadeMode>>;
  attentionOnly: boolean;
  handlers: GridHandlers;
}) {
  if (jobs.length === 0 || places.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
        Pick at least one job and one place above to build the grid.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobBlock
          key={job.key}
          job={job}
          places={places}
          bindingModes={bindingModes}
          treatmentModes={treatmentModes}
          attentionOnly={attentionOnly}
          handlers={handlers}
        />
      ))}
    </div>
  );
}

function JobBlock({
  job,
  places,
  bindingModes,
  treatmentModes,
  attentionOnly,
  handlers,
}: {
  job: MandateJob;
  places: readonly Place[];
  bindingModes: Readonly<Record<string, CascadeMode>>;
  treatmentModes: Readonly<Record<TreatmentKey, CascadeMode>>;
  attentionOnly: boolean;
  handlers: GridHandlers;
}) {
  const bindingColumns = job.consumes.filter(
    (c) => (bindingModes[c.key] ?? "cell") === "cell",
  );
  const treatmentColumns = TREATMENT_FIELDS.filter(
    (f) => treatmentModes[f.key] === "cell",
  );
  const hasColumns = bindingColumns.length > 0 || treatmentColumns.length > 0;

  const visiblePlaces = places.filter((place) => {
    if (!attentionOnly) return true;
    if (isExcluded(job, place)) return false;
    return rowAttention(job, place, handlers).unsettled > 0;
  });

  const placeOf = new Map(places.map((place) => [place.name, place]));
  // Categories curate; exclusions are the only thing that removes a pair.
  const excludedCell = (
    <span className="text-[11px] italic text-muted-foreground">Excluded</span>
  );

  const columns: BatchGridColumn<Place>[] = [
    ...treatmentColumns.map(
      (f): BatchGridColumn<Place> => ({
        id: `treatment:${f.key}`,
        header: f.label,
        helpText: f.hint,
        width: 160,
        read: (place) => handlers.resolveTreatment(job, place, f.key),
        render: (place) =>
          isExcluded(job, place) ? (
            excludedCell
          ) : (
            <TreatmentValueControl
              def={f}
              value={handlers.resolveTreatment(job, place, f.key)}
              onChange={(v) => handlers.onCellTreatmentChange(job, place, f.key, v)}
              compact
            />
          ),
        fill: {
          title: "Set this treatment on every place",
          limits: "Treatments fill cleanly — every place can render any mode.",
          applyLabel: "Apply to every place",
          onApply: (v) =>
            handlers.onFillTreatmentColumn(
              job,
              f.key,
              (v ?? TEMPLATE_TREATMENT[f.key]) as TreatmentValue,
            ),
          renderControl: (value, set) => (
            <TreatmentValueControl
              def={f}
              value={(value as TreatmentValue | undefined) ?? TEMPLATE_TREATMENT[f.key]}
              onChange={set}
            />
          ),
        },
      }),
    ),
    ...bindingColumns.map(
      (c): BatchGridColumn<Place> => {
        const template = (): Binding =>
          c.templateValueId
            ? { kind: "known_value", valueId: c.templateValueId }
            : { kind: "prompt_user", prompt: `Enter ${c.label}` };
        return {
          id: `binding:${c.key}`,
          header: c.label,
          ...(c.required ? { required: true } : {}),
          width: 240,
          read: (place) => handlers.resolveBinding(job, place, c),
          render: (place) =>
            isExcluded(job, place) ? (
              excludedCell
            ) : (
              <BindingCell
                consumed={c}
                binding={handlers.resolveBinding(job, place, c)}
                candidates={place.provides}
                placeLabel={place.label}
                onChange={(b) => handlers.onCellBindingChange(job, place, c, b)}
              />
            ),
          fill: {
            title: "Set this input on every place",
            limits:
              "Direct values and prompts fill cleanly; a known value only lands where that identity exists.",
            applyLabel: "Apply to every place",
            width: 360,
            onApply: (v) =>
              handlers.onFillBindingColumn(job, c, (v as Binding | undefined) ?? template()),
            renderControl: (value, set) => (
              <BindingCell
                consumed={c}
                binding={(value as Binding | undefined) ?? template()}
                candidates={ALL_KNOWN_VALUES}
                placeLabel="Every place in this block"
                onChange={set}
                compact={false}
              />
            ),
          },
        };
      },
    ),
  ];

  return (
    <section className="space-y-1.5">
      <header className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-sm font-semibold text-foreground">
          {job.label}
        </span>
        <span
          className={cn(
            "inline-flex h-4 items-center rounded px-1 text-[9px] font-semibold uppercase tracking-wide",
            job.meeting === "discovered"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-muted text-muted-foreground",
          )}
        >
          {job.meeting}
        </span>
        <span className="inline-flex h-4 items-center gap-0.5 rounded bg-primary/10 px-1 text-[9px] font-semibold uppercase tracking-wide text-primary-ink">
          {job.holder === "workflow" && <Workflow className="h-2.5 w-2.5" />}
          {job.holderLabel}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          → {job.outputKind}
        </span>
      </header>

      <MatrxBatchGrid<Place>
        tableId={`unified-batch-studio-${job.key}`}
        rows={visiblePlaces}
        getRowId={(place) => place.name}
        rowHeader={{
          header: "Place",
          width: 240,
          label: (place) => place.label,
          render: (place) => (
            <span className="block min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {place.label}
              </span>
              <span className="block truncate font-mono text-[10px] text-muted-foreground">
                {place.name}
              </span>
            </span>
          ),
        }}
        columns={columns}
        // Every cell is a picker; nothing arrives as typed or pasted text.
        onChange={() => undefined}
        status={(place) => {
          const row = placeOf.get(place.name) ?? place;
          return isExcluded(job, row)
            ? { tone: "blocked", label: `Excluded here: ${job.label}` }
            : statusOf(rowAttention(job, row, handlers));
        }}
        notes={(place) =>
          isExcluded(job, place)
            ? [{ tone: "attention", text: `Excluded here: ${job.label}` }]
            : []
        }
        emptyState={{ title: "Every place is settled for this job." }}
        {...(hasColumns
          ? {}
          : { footnote: "No per-cell columns; set a row to Per-cell to edit." })}
      />
    </section>
  );
}

function rowAttention(
  job: MandateJob,
  place: Place,
  handlers: GridHandlers,
): { unsettled: number; red: number } {
  let unsettled = 0;
  let red = 0;
  for (const c of job.consumes) {
    const b = handlers.resolveBinding(job, place, c);
    if (b.kind === "unresolved") {
      red += 1;
      unsettled += 1;
    } else if (!isSettled(b)) {
      unsettled += 1;
    }
  }
  return { unsettled, red };
}

function statusOf(att: { unsettled: number; red: number }): BatchGridRowStatus {
  if (att.red > 0) return { tone: "blocked", label: `${att.red} with nothing available` };
  if (att.unsettled > 0)
    return { tone: "attention", label: `${att.unsettled} awaiting confirmation` };
  return { tone: "ready", label: "Every input is settled" };
}
