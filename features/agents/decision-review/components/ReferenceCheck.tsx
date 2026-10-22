"use client";

/**
 * ReferenceCheck — run a reference model on an agent's saved decision answers
 * (same judged state, same question), then compare, drill into the
 * disagreements, and label.
 *
 * Champion: Braintrust experiments / LangSmith pairwise comparison — a priced
 * run, rows filling in as they finish, disagreements first, one click into
 * the item with both answers side by side. Ours adds the human label in the
 * same panel, so a disagreement becomes ground truth in one keystroke.
 *
 * The run is durable on the server: every finished item is a
 * `platform.judge_verdict` row (`decision_reference`). A refresh mid-run
 * rejoins the stream through the runtime operations contract; whatever
 * cannot be rejoined still shows from the rows.
 */

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  Scale,
  X,
} from "lucide-react";
import {
  Button,
  DisclosureHeader,
  EmptyState,
  NumberStepper,
  RegionSkeleton,
  Select,
  Switch,
} from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type {
  MatrxColumnDef,
  MatrxDataTableMobileCardControls,
} from "@ai-matrx/design-system/data-table/types";
import { DecisionAnswers } from "@ai-matrx/chat/agents/decision-answers/DecisionAnswers";
import { useAppDispatch } from "@/lib/redux/hooks";
import { rejoinOperationThunk } from "@/lib/api/resume-or-rejoin";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { cn } from "@/lib/utils";
import {
  labelItem,
  loadItemsByIds,
  loadJudgedStates,
  loadReferenceVerdicts,
  openReferenceRun,
  quoteReferenceRun,
  type QueueFacets,
  type ReferenceRunRequest,
} from "../service";
import { CostDoor } from "@/components/cost/CostDoor";
import { optionLabel, queueKeyAction, type ReviewItem } from "../queue";
import {
  EMPTY_RUN,
  REFERENCE_DEFAULT_COUNT,
  REFERENCE_FALLBACK_MAX,
  answerWithPercent,
  applyRunEvent,
  distinctSnippets,
  orderReferenceRows,
  referenceView,
  rowAgrees,
  runEventName,
  storedFailure,
  type ReferenceGroup,
  type ReferenceQuote,
  type ReferenceResultRow,
  type ReferenceRunState,
  type ReferenceVerdict,
} from "../reference";
import { JudgedStateText } from "./JudgedState";
import { ReliabilityCurve } from "./ReliabilityCurve";

const ALL = "__all__";

/** Which run this tab is following — a per-tab convenience; the run itself lives on the server. */
function runKey(agentId: string): string {
  return `decision-review:reference-run:${agentId}`;
}
function readRunKey(agentId: string): string | null {
  try {
    return window.sessionStorage.getItem(runKey(agentId));
  } catch {
    return null;
  }
}
/** The stored key never changes under us within a tab; every render re-reads it. */
function subscribeRunKey(): () => void {
  return () => {};
}

function writeRunKey(agentId: string, requestId: string | null): void {
  try {
    if (requestId) window.sessionStorage.setItem(runKey(agentId), requestId);
    else window.sessionStorage.removeItem(runKey(agentId));
  } catch {
    // Storage blocked: a refresh then shows the durable rows instead of rejoining.
  }
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function pct(v: number | null | undefined): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

// ── Table ────────────────────────────────────────────────────────────────────

function failureText(row: ReferenceResultRow): string {
  switch (row.failure?.status) {
    case "unanswerable":
      return "Unanswerable";
    case "in_flight":
      return "Checking elsewhere";
    default:
      return "Failed";
  }
}

function agreeText(row: ReferenceResultRow): string {
  if (row.failure) return failureText(row);
  if (row.pending) return "Checking";
  const agrees = rowAgrees(row);
  return agrees == null ? "—" : agrees ? "Agrees" : "Disagrees";
}

function referenceText(row: ReferenceResultRow): string {
  if (row.failure) return failureText(row);
  if (row.pending || !row.reference) return "—";
  return answerWithPercent(referenceView(row.item, row.reference), row.reference.pAnswer);
}

function resultColumns(): MatrxColumnDef<ReferenceResultRow>[] {
  const mono = "font-mono";
  return [
    {
      // table-filter-off: holds the quoted snippet text, not a set of states
      id: "state",
      header: "State",
      accessorFn: (r) => r.snippet ?? "",
      filter: "text",
      width: 280,
      cell: (r) => (
        <span className={cn("block truncate", !r.snippet && "text-muted-foreground")} title={r.snippet ?? undefined}>
          {r.snippet ?? "Not readable"}
        </span>
      ),
    },
    {
      id: "question",
      header: "Question",
      accessorFn: (r) => r.item.question,
      filter: "select",
      width: 150,
      cell: (r) => <span className={mono}>{r.item.question}</span>,
    },
    {
      id: "decision",
      header: "Decision model",
      accessorFn: (r) => answerWithPercent(r.item.view, r.item.pAnswer),
      sortValue: (r) => r.item.confidence ?? r.item.pAnswer ?? -1,
      filter: "text",
      width: 150,
      cell: (r) => <span className={mono}>{answerWithPercent(r.item.view, r.item.pAnswer)}</span>,
    },
    {
      id: "reference",
      header: "Reference",
      accessorFn: referenceText,
      sortValue: (r) => r.reference?.pAnswer ?? -1,
      filter: "text",
      width: 170,
      cell: (r) =>
        r.pending ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Spinner size="xs" label="Checking" />
            Checking
          </span>
        ) : r.failure ? (
          <span className="flex min-w-0 items-center gap-1 text-destructive-ink" title={r.failure.error}>
            <span className="truncate">{r.failure.error}</span>
            <ErrorAlchemyMenu error={r.failure.error} />
          </span>
        ) : (
          <span className={mono}>{referenceText(r)}</span>
        ),
    },
    {
      id: "agree",
      header: "Agree",
      accessorFn: agreeText,
      filter: "select",
      width: 110,
      cell: (r) => {
        const text = agreeText(r);
        if (text === "Agrees") return <Check className="h-4 w-4 text-success" aria-label="Agrees" />;
        if (text === "Disagrees") return <X className="h-4 w-4 text-destructive" aria-label="Disagrees" />;
        if (text === "Failed") return <AlertTriangle className="h-4 w-4 text-warning" aria-label="Failed" />;
        if (text === "Unanswerable") return <span className="text-muted-foreground">Unanswerable</span>;
        return <span className="text-muted-foreground">{text}</span>;
      },
    },
    {
      id: "label",
      header: "Human label",
      accessorFn: (r) => (r.item.label == null ? "" : optionLabel(r.item, r.item.label)),
      filter: "select",
      width: 130,
      cell: (r) =>
        r.item.label == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className={mono}>{optionLabel(r.item, r.item.label)}</span>
        ),
    },
    {
      id: "version",
      header: "Version",
      accessorFn: (r) => r.item.version,
      filter: "number",
      width: 90,
      cell: (r) => <span className={mono}>v{r.item.version}</span>,
    },
    {
      id: "cost",
      header: "Cost",
      accessorFn: (r) => r.reference?.costUsd ?? null,
      filter: "number",
      width: 90,
      align: "right",
      cell: (r) => <CostDoor usd={r.reference?.costUsd ?? null} iconOnly />,
    },
  ];
}

/** A result on a phone: what was judged, both answers, and whether they agree. */
function ResultCard({ row, controls }: { row: ReferenceResultRow; controls: MatrxDataTableMobileCardControls }) {
  const open = controls.open;
  return (
    <div
      role={open ? "button" : undefined}
      tabIndex={open ? 0 : undefined}
      data-clickable={open ? "" : undefined}
      onClick={open}
      onKeyDown={(event) => {
        if (open && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          open();
        }
      }}
      className="flex w-full min-w-0 flex-col gap-1 border-b border-border px-3 py-2"
    >
      <span className={cn("block w-full truncate type-secondary", !row.snippet && "text-muted-foreground")}>
        {row.snippet ?? "Not readable"}
      </span>
      <span className="flex w-full min-w-0 items-center gap-2 font-mono type-meta">
        <span className="truncate text-muted-foreground">{row.item.question}</span>
        <span className="truncate">{answerWithPercent(row.item.view, row.item.pAnswer)}</span>
        <span className="text-muted-foreground">vs</span>
        <span className="truncate">{referenceText(row)}</span>
        <span className="ml-auto shrink-0">{controls.renderCell("agree")}</span>
      </span>
    </div>
  );
}

// ── Drill-in ─────────────────────────────────────────────────────────────────

function ItemDrill({
  rows,
  startId,
  onLabel,
  onRecheck,
}: {
  rows: ReferenceResultRow[];
  startId: string;
  onLabel: (item: ReviewItem, key: string) => Promise<void>;
  onRecheck: (itemIds: string[]) => void;
}) {
  const [currentId, setCurrentId] = useState(startId);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stateOpen, setStateOpen] = useState(true);
  const index = Math.max(0, rows.findIndex((r) => r.id === currentId));
  const row = rows[index] ?? null;

  const move = (delta: number) => {
    const next = rows[Math.min(rows.length - 1, Math.max(0, index + delta))];
    if (next) setCurrentId(next.id);
  };

  const apply = async (key: string) => {
    if (!row || saving) return;
    setSaving(key);
    setError(null);
    try {
      await onLabel(row.item, key);
    } catch (err) {
      console.error("[decision-review] label failed", err);
      setError(errorText(err, "That label was not saved."));
    } finally {
      setSaving(null);
    }
  };

  const refAnswer = row?.reference?.answer ?? null;
  const refIsOption = refAnswer != null && (row?.item.options.some((o) => o.key === refAnswer) ?? false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target?.closest("input, textarea, select, [contenteditable='true'], [role='combobox'], [role='listbox']")
      ) {
        return;
      }
      if (event.key === "r" && refIsOption && refAnswer) {
        event.preventDefault();
        void apply(refAnswer);
        return;
      }
      const action = queueKeyAction(row?.item ?? null, event.key);
      if (!action) return;
      event.preventDefault();
      if (action.type === "next" || action.type === "skip") move(1);
      else if (action.type === "previous") move(-1);
      else void apply(action.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!row) return <p className="p-4 type-secondary text-muted-foreground">This item is no longer in the list.</p>;
  const item = row.item;
  const refView = row.reference ? referenceView(item, row.reference) : null;
  const instructions = item.instructions ? { [item.question]: item.instructions } : undefined;

  return (
    <div className="@container flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <span className="font-mono type-meta text-muted-foreground">
          {item.question} · v{item.version}
        </span>
        <span className="ml-auto font-mono type-meta text-muted-foreground">
          {index + 1} / {rows.length}
        </span>
        <Button variant="quiet" icon={<ChevronLeft />} aria-label="Previous item" onClick={() => move(-1)} />
        <Button variant="quiet" icon={<ChevronRight />} aria-label="Next item" onClick={() => move(1)} />
      </div>

      <div className="line-clamp-2 type-title" title={item.instructions ?? undefined}>
        {item.instructions ?? "Question text not recorded"}
      </div>

      {/* The two answers and the labels first: the judged input is long and sits below. */}
      <div className="grid gap-3 @md:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-1">
          <div className="type-meta font-medium text-muted-foreground">
            Decision model{item.model ? ` · ${item.model}` : ""}
          </div>
          {item.view ? (
            <DecisionAnswers view={item.view} instructions={instructions} showInstructions={false} showCost />
          ) : (
            <span className="type-secondary text-muted-foreground">Answer not readable</span>
          )}
        </section>
        <section className="flex min-w-0 flex-col gap-1">
          <div className="type-meta font-medium text-muted-foreground">
            Reference (AI){row.reference?.referenceModel ? ` · ${row.reference.referenceModel}` : ""}
          </div>
          {row.failure ? (
            <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 type-secondary text-destructive-ink">
              <span className="flex items-start gap-1.5">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">{row.failure.error}</span>
                <ErrorAlchemyMenu error={row.failure.error} />
              </span>
              {row.failure.status !== "in_flight" && (
                <Button icon={<RotateCcw />} onClick={() => onRecheck([item.id])}>
                  Re-check
                </Button>
              )}
            </div>
          ) : row.pending ? (
            <span className="inline-flex items-center gap-1.5 type-secondary text-muted-foreground">
              <Spinner size="xs" label="Checking" />
              The reference is answering
            </span>
          ) : refView ? (
            <DecisionAnswers view={refView} instructions={instructions} showInstructions={false} showCost />
          ) : (
            <span className="type-secondary text-muted-foreground">Not checked yet</span>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2 type-meta text-muted-foreground">
          <span className="font-medium text-foreground">True answer</span>
          {item.label != null && (
            <span>
              labeled {optionLabel(item, item.label)}
              {item.agreed ? " — model agrees" : " — model disagrees"}
            </span>
          )}
          <span className="ml-auto">j / k move · r reference</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {item.options.map((option, i) => {
            const isModel = option.key === item.verdict;
            const isRef = option.key === refAnswer;
            return (
              <Button
                key={option.key}
                variant={option.key === item.label ? "primary" : "outline"}
                disabled={saving != null}
                onClick={() => void apply(option.key)}
                meta={[i < 9 ? String(i + 1) : null, isModel ? "model" : null, isRef ? "reference" : null]
                  .filter(Boolean)
                  .join(" · ")}
              >
                {item.answerType === "choice" ? option.key : optionLabel(item, option.key)}
              </Button>
            );
          })}
          {refIsOption && refAnswer && (
            <Button
              variant="quiet"
              icon={<Scale />}
              disabled={saving != null}
              onClick={() => void apply(refAnswer)}
            >
              Use reference answer
            </Button>
          )}
        </div>
        {item.options.length === 0 && (
          <p className="type-secondary text-warning">
            No recorded options, so it cannot be labeled here.
          </p>
        )}
        {error && (
          <p className="flex items-start gap-1.5 type-secondary text-destructive-ink">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <ErrorAlchemyMenu error={error} />
          </p>
        )}
      </section>

      <section className="flex flex-col gap-1">
        <DisclosureHeader open={stateOpen} title="What the model judged" onClick={() => setStateOpen((v) => !v)} />
        {stateOpen && (
          <div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-card px-3 py-2 type-secondary leading-relaxed">
            <JudgedStateText item={item} />
          </div>
        )}
      </section>
    </div>
  );
}

// ── Reliability against the reference ────────────────────────────────────────

/** An agreement row on a phone: which question, how many checked, how often they agree. */
function AgreementCard({ group, controls }: { group: ReferenceGroup; controls: MatrxDataTableMobileCardControls }) {
  const open = controls.open;
  return (
    <div
      role={open ? "button" : undefined}
      tabIndex={open ? 0 : undefined}
      data-clickable={open ? "" : undefined}
      onClick={open}
      onKeyDown={(event) => {
        if (open && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          open();
        }
      }}
      className="flex w-full min-w-0 items-center gap-2 border-b border-border px-3 py-2 font-mono type-meta"
    >
      <span className="shrink-0 text-muted-foreground">v{group.version}</span>
      <span className="truncate">{group.question}</span>
      <span className="ml-auto shrink-0">{pct(group.agreementRate)} agree</span>
      <span className="shrink-0 text-muted-foreground">n={group.n}</span>
    </div>
  );
}

export function ReferenceReliability({ groups }: { groups: ReferenceGroup[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const key = (g: ReferenceGroup) => `${g.version}:${g.question}`;
  const selected = groups.find((g) => key(g) === selectedKey) ?? groups[0] ?? null;
  const columns: MatrxColumnDef<ReferenceGroup>[] = [
    { id: "version", header: "Version", accessorFn: (g) => g.version, filter: "number", width: 90, cell: (g) => <span className="font-mono">v{g.version}</span> },
    { id: "question", header: "Question", accessorFn: (g) => g.question, filter: "text", width: 160, cell: (g) => <span className="font-mono">{g.question}</span> },
    { id: "checked", header: "Checked", accessorFn: (g) => g.n, filter: "number", width: 100, align: "right", cell: (g) => <span className="font-mono">{g.n}</span> },
    { id: "agreement", header: "Agreement", accessorFn: (g) => g.agreementRate, filter: "number", width: 110, align: "right", cell: (g) => <span className="font-mono">{pct(g.agreementRate)}</span> },
    { id: "unanswerable", header: "Unanswerable", accessorFn: (g) => g.unanswerable, filter: "number", width: 120, align: "right", cell: (g) => <span className="font-mono">{g.unanswerable}</span> },
    { id: "reference", header: "Reference model", accessorFn: (g) => g.referenceModel ?? "", filter: "select", width: 180, cell: (g) => <span className="font-mono">{g.referenceModel ?? "—"}</span> },
  ];
  // Nothing checked yet: the results' own empty state already says so.
  if (groups.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <MatrxDataTable<ReferenceGroup>
        tableId="agents/decision-review/reference-agreement"
        data={groups}
        columns={columns}
        getRowId={key}
        selectedId={selected ? key(selected) : null}
        onSelectedIdChange={setSelectedKey}
        onRowOpen={(g) => setSelectedKey(key(g))}
        detail={{ enabled: false }}
        pageSize={0}
        toolbar={{ title: "Agreement with the reference model (AI)" }}
        emptyState={{ title: "No reference checks yet" }}
        mobileCards={(g, _index, controls) => <AgreementCard group={g} controls={controls} />}
        mobileCardsBreakpoint="sm"
      />
      {selected && (
        <div>
          <div className="mb-1 type-secondary font-medium">
            v{selected.version} · {selected.question} · vs reference (AI)
          </div>
          {selected.probabilityBins.length === 0 ? (
            <p className="type-secondary text-muted-foreground">Too few checks for a curve.</p>
          ) : (
            <ReliabilityCurve
              bins={selected.probabilityBins}
              threshold={null}
              yLabel="Agrees with reference"
              unit="checks"
              label="Agreement with the reference model"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Reads ────────────────────────────────────────────────────────────────────

async function fetchItems(ids: string[]): Promise<{ items: ReviewItem[]; states: Record<string, string[] | null> }> {
  const items = await loadItemsByIds(ids);
  const states: Record<string, string[] | null> = {};
  try {
    const loaded = await loadJudgedStates(items);
    for (const it of items) states[it.id] = loaded.get(it.id) ?? null;
  } catch (err) {
    // The table still shows every answer; only the state column reads "Not readable".
    console.error("[decision-review] judged states failed", err);
  }
  return { items, states };
}

/** Every stored reference verdict of an agent, with the items it checked. */
async function fetchStoredTable(agentId: string) {
  const verdicts = await loadReferenceVerdicts(agentId);
  const { items, states } = await fetchItems(verdicts.map((v) => v.itemId));
  return { verdicts, items, states };
}

function byItemId(verdicts: ReferenceVerdict[]): Record<string, ReferenceVerdict> {
  const out: Record<string, ReferenceVerdict> = {};
  for (const v of verdicts) out[v.itemId] = v;
  return out;
}

// ── The section ──────────────────────────────────────────────────────────────

export function ReferenceCheck({
  agentId,
  facets,
  referenceGroups,
  onRunSettled,
}: {
  agentId: string;
  facets: QueueFacets | null;
  referenceGroups: ReferenceGroup[];
  /** A run finished — the calibration's reference block is now stale. */
  onRunSettled: () => void;
}) {
  const dispatch = useAppDispatch();
  const [question, setQuestion] = useState<string | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [count, setCount] = useState(REFERENCE_DEFAULT_COUNT);
  const [onlyUnlabeled, setOnlyUnlabeled] = useState(false);
  const [skipChecked, setSkipChecked] = useState(true);

  const [quote, setQuote] = useState<ReferenceQuote | null>(null);
  /** Exact items to quote (a re-check); null samples from the controls. */
  const [recheckIds, setRecheckIds] = useState<string[] | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [maxItems, setMaxItems] = useState(REFERENCE_FALLBACK_MAX);

  const [items, setItems] = useState<Record<string, ReviewItem>>({});
  /** Each item's judged state (text parts); the State column shows what sets it apart. */
  const [states, setStates] = useState<Record<string, string[] | null>>({});
  const [stored, setStored] = useState<Record<string, ReferenceVerdict>>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [run, setRun] = useState<ReferenceRunState>(EMPTY_RUN);
  const [streaming, setRunning] = useState(false);
  // A run this tab is following (started here, or rejoined after a refresh) is active
  // from the first render: Estimate and Run stay off until it settles, so a refresh can
  // never start a second run over the same answers. Server snapshot: none.
  const followedRunId = useSyncExternalStore(subscribeRunKey, () => readRunKey(agentId), () => null);
  const running = streaming || followedRunId != null;
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  /** Item ids already loaded or loading — read and written in handlers only. */
  const knownIds = useRef<Set<string>>(new Set());

  /** Merge loaded decision items and their judged states. */
  const mergeItems = (loadedItems: ReviewItem[], loadedStates: Record<string, string[] | null>) => {
    setItems((current) => {
      const next = { ...current };
      for (const it of loadedItems) next[it.id] = it;
      return next;
    });
    setStates((current) => ({ ...current, ...loadedStates }));
  };

  /** Load decision items (and their judged states) the table does not have yet. */
  const ensureItems = async (ids: string[]) => {
    const missing = [...new Set(ids)].filter((id) => !knownIds.current.has(id));
    if (missing.length === 0) return;
    for (const id of missing) knownIds.current.add(id);
    const loadedItems = await fetchItems(missing);
    mergeItems(loadedItems.items, loadedItems.states);
  };

  const reloadStored = async () => {
    const verdicts = await loadReferenceVerdicts(agentId);
    await ensureItems(verdicts.map((v) => v.itemId));
    setStored(byItemId(verdicts));
  };

  // The durable rows.
  useEffect(() => {
    let cancelled = false;
    fetchStoredTable(agentId)
      .then((table) => {
        if (cancelled) return;
        knownIds.current = new Set(table.items.map((i) => i.id));
        mergeItems(table.items, table.states);
        setStored(byItemId(table.verdicts));
        setLoadError(null);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        console.error("[decision-review] reference rows failed", err);
        if (!cancelled) {
          setLoadError(err);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [agentId, reloadKey]);

  const follow = async (
    events: AsyncIterable<{ event: string; data: unknown }>,
    requestId: string | null,
  ) => {
    for await (const envelope of events) {
      setRun((state) => applyRunEvent(state, envelope));
      const data = envelope.data as { item_id?: unknown } | null;
      if (typeof data?.item_id === "string") {
        void ensureItems([data.item_id]).catch((err: unknown) =>
          console.error("[decision-review] item load failed", err),
        );
      }
      // Only a finished run forgets its id: a dropped stream stays rejoinable after a refresh.
      if (runEventName(envelope) === "run_done" && requestId) writeRunKey(agentId, null);
    }
  };

  const settle = async () => {
    setRunning(false);
    abortRef.current = null;
    try {
      await reloadStored();
    } catch (err) {
      console.error("[decision-review] reference rows failed", err);
    }
    setPendingIds([]);
    onRunSettled();
  };

  const followEvent = useEffectEvent(
    (events: AsyncIterable<{ event: string; data: unknown }>, requestId: string) => follow(events, requestId),
  );
  const settleEvent = useEffectEvent(() => settle());

  // A refresh mid-run: rejoin the run this tab started.
  useEffect(() => {
    const requestId = readRunKey(agentId);
    if (!requestId) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const queue: Array<{ event: string; data: unknown }> = [];
    let wake: (() => void) | null = null;
    let ended = false;
    const events: AsyncIterable<{ event: string; data: unknown }> = {
      async *[Symbol.asyncIterator]() {
        for (;;) {
          if (queue.length > 0) {
            yield queue.shift() as { event: string; data: unknown };
            continue;
          }
          if (ended) return;
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        }
      },
    };
    const push = (e: { event: string; data: unknown }) => {
      if (queue.length === 0) setRunning(true);
      queue.push(e);
      wake?.();
    };
    const followed = followEvent(events, requestId);
    dispatch(
      rejoinOperationThunk({
        requestId,
        signal: controller.signal,
        onEvent: (event) => push(event as unknown as { event: string; data: unknown }),
      }),
    )
      .catch((err: unknown) => {
        // Nothing to rejoin (finished, expired): the durable rows are the answer.
        if (!controller.signal.aborted) {
          console.warn("[decision-review] reference run rejoin unavailable", err);
          writeRunKey(agentId, null);
        }
      })
      .finally(() => {
        ended = true;
        wake?.();
        void followed.finally(() => {
          if (!controller.signal.aborted) void settleEvent();
        });
      });
    return () => controller.abort();
  }, [agentId, dispatch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const request = (): ReferenceRunRequest =>
    recheckIds
      ? { item_ids: recheckIds }
      : {
          sample: {
            n: count,
            question,
            agent_version_id: version == null ? null : (facets?.versionIds[version] ?? null),
            only_unlabeled: onlyUnlabeled,
            only_without_reference: skipChecked,
          },
        };

  const estimate = async (ids: string[] | null = recheckIds) => {
    setQuoting(true);
    setActionError(null);
    setQuote(null);
    try {
      // A re-check asks again on purpose: a failure or refusal is a stored check.
      const next = await quoteReferenceRun(agentId, ids ? { item_ids: ids, rerun: true } : request());
      if (next.maxItems) setMaxItems(next.maxItems);
      setQuote(next);
    } catch (err) {
      console.error("[decision-review] reference quote failed", err);
      setActionError(errorText(err, "The estimate could not be made."));
    } finally {
      setQuoting(false);
    }
  };

  const recheck = (ids: string[]) => {
    setRecheckIds(ids);
    void estimate(ids);
  };

  const start = async () => {
    if (!quote || running) return;
    const ids = quote.items.map((i) => i.itemId);
    const rerun = recheckIds != null;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setActionError(null);
    setRun(EMPTY_RUN);
    setPendingIds(ids);
    void ensureItems(ids).catch((err: unknown) => console.error("[decision-review] item load failed", err));
    let requestId: string | null = null;
    try {
      const stream = await openReferenceRun(agentId, { item_ids: ids, rerun }, controller.signal);
      requestId = stream.requestId;
      writeRunKey(agentId, requestId);
      setQuote(null);
      setRecheckIds(null);
      await follow(stream, requestId);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("[decision-review] reference run failed", err);
      setActionError(errorText(err, "The reference run stopped."));
      writeRunKey(agentId, null);
    }
    if (!controller.signal.aborted) await settle();
  };

  const onLabel = async (item: ReviewItem, key: string) => {
    const saved = await labelItem(item, key);
    setItems((current) => ({
      ...current,
      [item.id]: { ...item, label: saved.authority_verdict, agreed: saved.agreed },
    }));
  };

  // The State column: what tells each item apart from the agent's other loaded items.
  const snippets = distinctSnippets(states);
  // Rows: every stored verdict, every item of the current run, every live result.
  const ids = new Set<string>([
    ...Object.keys(stored),
    ...pendingIds,
    ...Object.keys(run.verdicts),
    ...Object.keys(run.failures),
  ]);
  const rows = orderReferenceRows(
    [...ids].flatMap((id) => {
      const item = items[id];
      if (!item) return [];
      const live = run.verdicts[id] ?? null;
      const saved = stored[id] ?? null;
      const failure = live ? null : (run.failures[id] ?? (saved ? storedFailure(saved) : null));
      const pending =
        !live && !failure && ((running && pendingIds.includes(id)) || saved?.status === "pending");
      return [
        {
          id,
          item,
          reference: live ?? (pending || saved?.status !== "answered" ? null : saved),
          failure,
          pending,
          snippet: snippets[id] ?? null,
        },
      ];
    }),
  );
  const failedIds = rows.filter((r) => r.failure && r.failure.status !== "in_flight").map((r) => r.id);
  const finishedCount = Object.keys(run.verdicts).length + Object.keys(run.failures).length;
  const sampleChanged = () => {
    setQuote(null);
    setRecheckIds(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls. */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Question"
          value={question ?? ALL}
          onValueChange={(v) => {
            setQuestion(v === ALL ? null : v);
            sampleChanged();
          }}
          options={[
            { value: ALL, label: "All questions" },
            ...(facets?.questions ?? []).map((q) => ({ value: q, label: q })),
          ]}
        />
        <Select
          aria-label="Version"
          value={version == null ? ALL : String(version)}
          onValueChange={(v) => {
            setVersion(v === ALL ? null : Number(v));
            sampleChanged();
          }}
          options={[
            { value: ALL, label: "All versions" },
            ...(facets?.versions ?? []).map((v) => ({
              value: String(v),
              label: `v${v}`,
              disabled: !facets?.versionIds[v],
            })),
          ]}
        />
        <label className="flex items-center gap-1.5 type-secondary">
          Items
          <NumberStepper
            value={count}
            min={1}
            max={maxItems}
            onChange={(v) => {
              setCount(v);
              sampleChanged();
            }}
          />
        </label>
        <label className="flex items-center gap-1.5 type-secondary">
          <Switch
            checked={onlyUnlabeled}
            onCheckedChange={(v) => {
              setOnlyUnlabeled(v);
              sampleChanged();
            }}
          />
          Only unlabeled
        </label>
        <label className="flex items-center gap-1.5 type-secondary">
          <Switch
            checked={skipChecked}
            onCheckedChange={(v) => {
              setSkipChecked(v);
              sampleChanged();
            }}
          />
          Skip checked
        </label>
        <Button icon={<Calculator />} disabled={quoting || running} onClick={() => void estimate()}>
          {quoting ? "Estimating" : "Estimate"}
        </Button>
      </div>

      {/* The quote: what a run would check, and what it costs, before anything is spent. */}
      {quote && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
          {quote.itemCount === 0 ? (
            <span className="type-secondary text-muted-foreground">
              {quote.inFlight > 0
                ? `${quote.inFlight} being checked by another run.`
                : quote.unbuildable.length > 0
                  ? `${quote.unbuildable.length} with input the reference cannot read.`
                  : quote.skippedExisting > 0
                    ? `All ${quote.skippedExisting} already checked.`
                    : "No answers match these settings."}
            </span>
          ) : (
            <>
              <span
                className="type-secondary"
                title={
                  quote.unbuildable.length > 0
                    ? quote.unbuildable.map((u) => `${u.question ?? u.itemId}: ${u.reason}`).join("\n")
                    : undefined
                }
              >
                {quote.itemCount} {quote.itemCount === 1 ? "answer" : "answers"} · {quote.referenceModel.name}
                {quote.skippedExisting > 0 ? ` · ${quote.skippedExisting} already checked` : ""}
                {quote.inFlight > 0 ? ` · ${quote.inFlight} in another run` : ""}
                {quote.unbuildable.length > 0 ? ` · ${quote.unbuildable.length} unreadable` : ""}
              </span>
              <CostDoor
                rows={[
                  { label: "Estimate", usd: quote.estimatedCostUsd, prefix: "~" },
                  ...(quote.maxCostUsd != null && quote.maxCostUsd > (quote.estimatedCostUsd ?? 0)
                    ? [{ label: "Most", usd: quote.maxCostUsd, prefix: "up to " }]
                    : []),
                ]}
              />
              <Button variant="primary" icon={<Play />} disabled={running} onClick={() => void start()}>
                Run
              </Button>
              <Button variant="quiet" onClick={sampleChanged}>
                Cancel
              </Button>
            </>
          )}
        </div>
      )}

      {/* Progress: the rows fill in below; this line says how far. */}
      {(running || run.finished) && (
        <div className="flex items-center gap-2 type-secondary text-muted-foreground">
          {running && <Spinner size="xs" label="Running" />}
          {run.finished && run.summary
            ? `Done · ${run.summary.done} checked · ${run.summary.failed} failed${run.summary.unanswerable > 0 ? ` · ${run.summary.unanswerable} unanswerable` : ""} · ${pct(run.summary.agreementRate)} agree`
            : run.itemCount == null && pendingIds.length === 0
              ? "Rejoining the active run"
              : `${finishedCount} of ${run.itemCount ?? pendingIds.length} checked${run.referenceModel ? ` · ${run.referenceModel}` : ""}`}
        </div>
      )}

      {(actionError || run.error) && (
        <p className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 type-secondary text-destructive-ink">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{actionError ?? run.error}</span>
          <ErrorAlchemyMenu error={actionError ?? run.error ?? ""} />
        </p>
      )}

      {/* Results. */}
      {!loaded ? (
        <RegionSkeleton shape="rows" count={6} aria-label="Loading reference checks" />
      ) : loadError != null ? (
        <ReadFailure
          error={loadError}
          what="the reference checks"
          onRetry={() => setReloadKey((k) => k + 1)}
          size="compact"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Scale />}
          title="No reference checks yet"
          line="Estimate a small batch, then run it."
        />
      ) : (
        <MatrxDataTable<ReferenceResultRow>
          tableId="agents/decision-review/reference-results"
          data={rows}
          columns={resultColumns()}
          getRowId={(r) => r.id}
          pageSize={0}
          toolbar={{
            title: "Reference check",
            refresh: { onRefresh: () => setReloadKey((k) => k + 1), label: "Reload" },
            ...(failedIds.length > 0 && !running
              ? {
                  actions: (
                    <Button icon={<RotateCcw />} onClick={() => recheck(failedIds)}>
                      {`Re-check failed (${failedIds.length})`}
                    </Button>
                  ),
                }
              : {}),
          }}
          detail={{
            title: (r) => r.item.question,
            defaultWidth: 640,
            render: (r) => <ItemDrill key={r.id} rows={rows} startId={r.id} onLabel={onLabel} onRecheck={recheck} />,
          }}
          emptyState={{ title: "No reference checks yet" }}
          mobileCards={(r, _index, controls) => <ResultCard row={r} controls={controls} />}
          mobileCardsBreakpoint="sm"
        />
      )}

      <ReferenceReliability groups={referenceGroups} />
    </div>
  );
}
