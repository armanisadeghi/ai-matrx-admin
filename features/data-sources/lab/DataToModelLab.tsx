"use client";

/**
 * Data to model — one page that shows fetched records, the two ways a model can get them
 * (HANDED OVER in the first message, or MODEL FETCHES through the `site_data` tool), and a real
 * run of both on one model, so the split between "we provide" and "the model asks" can be decided
 * from numbers. Builder: `./provision.ts`. Model door: `./labServer.ts` (aidream `/ai/manual`).
 */

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ModelListDropdown, useModelCatalog } from "@ai-matrx/agents/models/react";
import { Play, Plus, X } from "lucide-react";
import { Badge, Button, DisclosureHeader, EmptyState, Field, SegmentedControl, Select } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { estimateTokens, estimateTokensForText, formatTokens } from "@ai-matrx/kit/tokens";
import { formatCount, formatDurationMs, formatPoints } from "@ai-matrx/kit/format";
import MarkdownStream from "@ai-matrx/chat/ui/markdown-stream/MarkdownStream";

import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";
import { KpiGrid, KpiTile } from "@/components/official/kpi/KpiTile";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import { useCostDisplay, useSeesDollars } from "@/components/cost/useCostDisplay";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { getTablePage } from "@/features/data-tables/service";

import type { DataFetchResult, DataSource } from "../contract";
import { useDataSources, useFetchedTables } from "../hooks";
import { usePriceText, useLibraryOrganizationId } from "../library/hooks";
import { fetchData } from "../server";
import {
  buildHandedOver,
  charsOf,
  fieldStats,
  fieldsUsed,
  groupByInput,
  modelUsd,
  toolCallsFor,
  type HandedOverKnobs,
  type LabRecord,
  type Ordering,
  type Shape,
  type TokenPrice,
} from "./provision";
import { captureParts, dryRun, recordsBilled, runLab, toolsOf, type CapturedRequest, type LabMode, type LabRunResult } from "./labServer";

const DEFAULT_SOURCE = "trustpilot_reviews";
const DEFAULT_QUESTION = "Compare these companies' reviews.";
const MAX_INPUTS = 5;
const TOOL_TURNS = 4;

const SHAPES = [
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "digest", label: "Digest" },
] as const;

const ORDERS: { value: Ordering; label: string }[] = [
  { value: "as_fetched", label: "As fetched" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "lowest_rated", label: "Lowest rated" },
  { value: "highest_rated", label: "Highest rated" },
];

const CUTS = [
  { value: "0", label: "Full text" },
  { value: "200", label: "200 chars" },
  { value: "400", label: "400 chars" },
  { value: "800", label: "800 chars" },
];

const charsText = (chars: number) => `${formatCount(chars)} chars`;

interface Loaded {
  records: LabRecord[];
  sourceKey: string;
  from: "fetch" | "table";
  result: DataFetchResult | null;
  tableName: string | null;
}

/** "$0.0123 · 246 points" for a dollar seat, "246 points" for a member. */
function useUsdText() {
  const { toPoints } = useCostDisplay();
  const seesDollars = useSeesDollars();
  return (usd: number | null | undefined): string | null => {
    if (usd == null || !Number.isFinite(usd)) return null;
    const points = toPoints(usd);
    const pts = points == null ? null : formatPoints(points);
    if (seesDollars) return pts ? `${formatAdminUsd(usd)} · ${pts}` : formatAdminUsd(usd);
    return pts;
  };
}

export function DataToModelLab() {
  const organizationId = useLibraryOrganizationId();
  const catalog = useDataSources(organizationId);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  return (
    <>
      <RecordPageHeader backHref="/data/library" record={{ name: "Data to model" }} />
      <div className="h-full overflow-hidden pt-[var(--shell-header-h)]">
        <div className="h-full overflow-y-auto" data-matrx-page-scroll="" data-data-lab="">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4">
            {catalog.error ? (
              <ReadFailure error={catalog.error} what="the data sources" onRetry={() => void catalog.refetch()} />
            ) : (
              <DataStep organizationId={organizationId} sources={catalog.data?.sources ?? []} onLoaded={setLoaded} />
            )}
            {loaded && loaded.records.length > 0 ? (
              <Provision organizationId={organizationId} loaded={loaded} source={catalog.data?.sources.find((s) => s.key === loaded.sourceKey) ?? null} />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

// ── 1. Data ──────────────────────────────────────────────────────────────────────────────────

function DataStep({ organizationId, sources, onLoaded }: { organizationId: string | null; sources: DataSource[]; onLoaded: (l: Loaded) => void }) {
  const itemSources = sources.filter((s) => s.records_are !== "entity" && s.input.kind === "url");
  const [sourceKey, setSourceKey] = useState(DEFAULT_SOURCE);
  const source = sources.find((s) => s.key === sourceKey) ?? null;
  const [inputs, setInputs] = useState<string[]>(["", ""]);
  const [perInput, setPerInput] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tableId, setTableId] = useState("");
  const tables = useFetchedTables();
  const price = usePriceText();
  const priceSource = source ? { pointsPerRecord: source.points_per_record ?? null, usd_per_record: source.usd_per_record } : null;
  const urls = inputs.map((u) => u.trim()).filter(Boolean);
  const estimate = priceSource ? price(priceSource, urls.length * perInput) : null;

  const fetchNow = async () => {
    if (!organizationId || !source || urls.length === 0) return;
    setBusy("Starting");
    setError(null);
    try {
      const result = await fetchData(
        { sourceKey: source.key, input: { inputs: urls.map((url) => ({ url })) }, maxRecords: urls.length * perInput, includeRecords: true, tableName: `Data to model · ${source.label}` },
        { organizationId, onProgress: (p) => setBusy(p.label) },
      );
      onLoaded({ records: result.records ?? [], sourceKey: source.key, from: "fetch", result, tableName: result.table_name });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const loadTable = async () => {
    const t = tables.data?.find((x) => x.tableId === tableId);
    if (!t) return;
    setBusy("Reading table");
    setError(null);
    const page = await getTablePage({ tableId: t.tableId, limit: 40, offset: 0 });
    setBusy(null);
    if (!page.success) {
      setError(page.error);
      return;
    }
    onLoaded({ records: page.data.rows.map((r) => r.data), sourceKey: t.sourceKey, from: "table", result: null, tableName: t.tableName });
  };

  return (
    <section className="flex flex-col gap-3" data-lab-step="data">
      <h2 className="text-sm font-semibold text-foreground">Data</h2>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Source"
              value={sourceKey}
              onValueChange={setSourceKey}
              options={(itemSources.length ? itemSources : [{ key: DEFAULT_SOURCE, label: "Trustpilot reviews" } as DataSource]).map((s) => ({ value: s.key, label: s.label }))}
            />
            <span className="text-xs text-muted-foreground">Per input</span>
            {/* ui-exception: a record count is a raw number */}
            <Field type="number" min={1} max={20} value={perInput} onChange={(e) => setPerInput(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} aria-label="Records per input" className="w-20" />
            <Button variant="primary" disabled={!!busy || urls.length === 0 || !organizationId} onClick={() => void fetchNow()} meta={estimate ?? undefined}>
              {busy ?? `Fetch ${urls.length * perInput}`}
            </Button>
          </div>
          {inputs.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <ProInput
                  value={value}
                  placeholder={source?.example_url ?? "https://www.trustpilot.com/review/example.com"}
                  enableCleanup={false}
                  onChange={(e) => setInputs(inputs.map((v, j) => (j === i ? e.target.value : v)))}
                  aria-label={`Input ${i + 1}`}
                />
              </div>
              <Button variant="quiet" removes aria-label="Remove input" icon={<X />} disabled={inputs.length <= 1} onClick={() => setInputs(inputs.filter((_, j) => j !== i))} />
            </div>
          ))}
          <div>
            <Button variant="quiet" icon={<Plus />} disabled={inputs.length >= MAX_INPUTS} onClick={() => setInputs([...inputs, ""])}>
              Add input
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <span className="text-xs text-muted-foreground">Or a fetched table</span>
          <Select
            aria-label="Fetched table"
            value={tableId}
            onValueChange={setTableId}
            options={[{ value: "", label: tables.isLoading ? "Loading tables" : "Choose a table" }, ...(tables.data ?? []).map((t) => ({ value: t.tableId, label: t.tableName }))]}
          />
          <div>
            <Button variant="outline" disabled={!tableId || !!busy} onClick={() => void loadTable()}>
              Use first 40 rows
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 2–4. Provision, run, decide ───────────────────────────────────────────────────────────────

function Provision({ organizationId, loaded, source }: { organizationId: string | null; loaded: Loaded; source: DataSource | null }) {
  const records = loaded.records;
  const stats = fieldStats(records);
  const groups = groupByInput(records);
  const maxPer = Math.max(...groups.map((g) => g.records.length));
  const price = usePriceText();
  const usdText = useUsdText();
  const priceSource = source ? { pointsPerRecord: source.points_per_record ?? null, usd_per_record: source.usd_per_record } : null;
  const recordPrice = (n: number) => (priceSource ? price(priceSource, n) : null);
  const spent = loaded.result ? recordPrice(loaded.result.records_billed) : null;

  const [knobs, setKnobs] = useState<HandedOverKnobs>(() => ({
    fields: stats.filter((s) => s.kind !== "object" && s.filled > 0).map((s) => s.name),
    perInput: maxPer,
    shape: "json",
    ordering: "as_fetched",
    fieldChars: 0,
  }));
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const handed = buildHandedOver(groups, knobs, question);
  const calls = toolCallsFor(groups, knobs.perInput, loaded.sourceKey, source?.label ?? loaded.sourceKey);
  const toolsQuestion = `${question.trim()}\n\n${groups.map((g) => `- ${g.key}`).join("\n")}`;

  // The user model catalog: active models with their points per 1M tokens (dollars = points / rate).
  const catalog = useModelCatalog("user");
  const models = catalog.models;
  const { rate } = useCostDisplay();
  const [modelId, setModelId] = useState("");
  useEffect(() => {
    if (modelId || !models.length) return;
    // Starts on the cheapest priced text model that calls tools (the plumbing-test rule); the picker changes it.
    const priced = models.filter((m) => !m.isDeprecated && (m.pointsInput ?? 0) > 0 && m.input.includes("text") && m.output.length === 1 && m.output[0] === "text" && m.features.raw.some((f) => f === "tool_calling" || f === "function_calling"));
    const cheap = priced.sort((a, b) => (a.pointsInput ?? 0) + (a.pointsOutput ?? 0) - ((b.pointsInput ?? 0) + (b.pointsOutput ?? 0)))[0];
    if (cheap) setModelId(cheap.id);
  }, [models, modelId]);
  const model = models.find((m) => m.id === modelId) ?? null;
  const tokenPrice: TokenPrice | null =
    model && model.pointsInput != null && rate ? { input: model.pointsInput / rate, output: (model.pointsOutput ?? 0) / rate } : null;

  // The real tool definition, from a dry run of the tools mode (never sent).
  const toolCapture = useQuery({
    queryKey: ["data-lab", "dry-run", "tools", modelId, organizationId],
    enabled: Boolean(modelId && organizationId),
    queryFn: () => dryRun({ mode: "tools", modelId, organizationId: organizationId ?? "", text: toolsQuestion, maxIterations: TOOL_TURNS }),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
  const toolDefs = toolCapture.data ? toolsOf(toolCapture.data.request) : [];
  const toolDefText = toolDefs.length ? JSON.stringify(toolDefs, null, 2) : "";
  const toolDefTokens = toolDefText ? estimateTokensForText(JSON.stringify(toolDefs), "structured") : 0;
  const toolResultTokens = calls.reduce((n, c) => n + c.resultTokens, 0);
  const questionTokens = estimateTokensForText(toolsQuestion, "prose");
  // Round 1 sends question + tool def; round 2 re-sends both plus every call and result.
  const toolsInputTokens = 2 * (questionTokens + toolDefTokens) + toolResultTokens + calls.length * 40;

  const [runs, setRuns] = useState<Partial<Record<LabMode, LabRunResult>>>({});
  const [running, setRunning] = useState<Partial<Record<LabMode, boolean>>>({});
  const [captures, setCaptures] = useState<Partial<Record<LabMode, CapturedRequest | string>>>({});
  const abort = useRef<AbortController | null>(null);

  const reqFor = (mode: LabMode) => ({
    mode,
    modelId,
    organizationId: organizationId ?? "",
    text: mode === "handed" ? handed.text : toolsQuestion,
    maxIterations: mode === "handed" ? 1 : TOOL_TURNS,
  });

  const capture = async (mode: LabMode) => {
    try {
      const captured = await dryRun(reqFor(mode));
      setCaptures((c) => ({ ...c, [mode]: captured }));
    } catch (e) {
      setCaptures((c) => ({ ...c, [mode]: e instanceof Error ? e.message : String(e) }));
    }
  };

  const run = async (modes: LabMode[]) => {
    abort.current = new AbortController();
    await Promise.all(
      modes.map(async (mode) => {
        setRunning((r) => ({ ...r, [mode]: true }));
        try {
          const res = await runLab(reqFor(mode), (partial) => setRuns((r) => ({ ...r, [mode]: partial })), abort.current?.signal);
          setRuns((r) => ({ ...r, [mode]: res }));
        } catch (e) {
          setRuns((r) => ({ ...r, [mode]: { answer: "", tokensIn: null, tokensOut: null, costUsd: null, latencyMs: 0, toolCalls: [], error: e instanceof Error ? e.message : String(e), events: [] } }));
        } finally {
          setRunning((r) => ({ ...r, [mode]: false }));
        }
      }),
    );
  };

  const handedUsd = modelUsd(tokenPrice, handed.tokens, 800);
  const toolsUsd = modelUsd(tokenPrice, toolsInputTokens, 900);
  const toolsDataPrice = recordPrice(calls.reduce((n, c) => n + c.records, 0));
  const toggleField = (f: string) =>
    setKnobs((k) => ({ ...k, fields: k.fields.includes(f) ? k.fields.filter((x) => x !== f) : stats.map((s) => s.name).filter((n) => n === f || k.fields.includes(n)) }));

  return (
    <>
      <section className="flex flex-col gap-3" data-lab-step="records">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-foreground">Records</h2>
          <span className="truncate text-xs text-muted-foreground">{loaded.tableName}</span>
        </div>
        <KpiGrid>
          <KpiTile label="Records" value={records.length} />
          <KpiTile label="Inputs" value={groups.length} hint={groups.map((g) => `${g.label} ${g.records.length}`).join(" · ")} />
          <KpiTile label="Fields" value={stats.length} />
          <KpiTile label="Size" value={charsText(charsOf(records))} hint={`≈ ${formatTokens(estimateTokensForText(JSON.stringify(records), "structured"))} tokens as JSON`} />
          <KpiTile label="Spent" value={loaded.from === "table" ? "Already paid" : spent} hint={loaded.result ? `${loaded.result.records_billed} records billed` : undefined} />
        </KpiGrid>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border text-left">
                <th className="px-2 py-1.5 font-medium">Field</th>
                <th className="px-2 py-1.5 font-medium">Type</th>
                <th className="px-2 py-1.5 text-right font-medium">Filled</th>
                <th className="px-2 py-1.5 text-right font-medium">Size</th>
                <th className="px-2 py-1.5 font-medium">Example</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => {
                const ex = records.find((r) => r[s.name] != null && r[s.name] !== "")?.[s.name];
                return (
                  <tr key={s.name} className="border-b border-border/50 last:border-0" data-lab-field={s.name}>
                    <td className="px-2 py-1 font-mono">{s.name}</td>
                    <td className="px-2 py-1 text-muted-foreground">{s.kind}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{s.filled}/{records.length}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{charsText(s.chars)}</td>
                    <td className="max-w-[28rem] truncate px-2 py-1 text-muted-foreground">{ex == null ? "" : typeof ex === "string" ? ex : JSON.stringify(ex)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <RawBlock title="Raw records" meta={charsText(charsOf(records))} text={JSON.stringify(records, null, 2)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" data-lab-step="provision">
        <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3" data-lab-mode="handed">
          <h2 className="text-sm font-semibold text-foreground">Handed over</h2>
          <div className="flex flex-wrap gap-1">
            {stats.map((s) => (
              <Button key={s.name} variant="quiet" pressed={knobs.fields.includes(s.name)} meta={charsText(s.chars)} onClick={() => toggleField(s.name)}>
                {s.name}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl aria-label="Shape" value={knobs.shape} onValueChange={(v: Shape) => setKnobs({ ...knobs, shape: v })} data={SHAPES} />
            <Select aria-label="Order" value={knobs.ordering} onValueChange={(v: Ordering) => setKnobs({ ...knobs, ordering: v })} options={ORDERS} />
            <Select aria-label="Text cut" value={String(knobs.fieldChars)} onValueChange={(v) => setKnobs({ ...knobs, fieldChars: Number(v) })} options={CUTS} />
            <span className="text-xs text-muted-foreground">Per input</span>
            {/* ui-exception: a record count is a raw number */}
            <Field type="number" min={0} max={maxPer} value={knobs.perInput} onChange={(e) => setKnobs({ ...knobs, perInput: Math.max(0, Math.min(maxPer, Number(e.target.value) || 0)) })} aria-label="Records per input" className="w-20" />
          </div>
          <KpiGrid>
            <KpiTile label="Records sent" value={handed.recordsSent} />
            <KpiTile label="Message" value={`≈ ${formatTokens(handed.tokens)}`} hint={`${charsText(handed.chars)} · ${handed.parts.map((p) => `${p.label} ${formatTokens(p.tokens)}`).join(" · ")}`} />
            <KpiTile label="Model cost" value={usdText(handedUsd)} hint="Est. with 800 tokens out" />
            <KpiTile label="Data cost" value={spent ?? recordPrice(records.length)} hint="One fetch, before the model" />
          </KpiGrid>
          <RawBlock title="First message" meta={`≈ ${formatTokens(handed.tokens)} tokens`} text={handed.text} defaultOpen />
        </div>

        <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3" data-lab-mode="tools">
          <h2 className="text-sm font-semibold text-foreground">Model fetches</h2>
          <KpiGrid>
            <KpiTile label="Calls" value={calls.length} hint="One per input" />
            <KpiTile label="Tool definition" value={toolCapture.isLoading ? null : toolDefText ? `≈ ${formatTokens(toolDefTokens)}` : "—"} loading={toolCapture.isLoading} hint="Sent on every model turn" />
            <KpiTile label="Input, 2 turns" value={`≈ ${formatTokens(toolsInputTokens)}`} hint={`Results ≈ ${formatTokens(toolResultTokens)}`} />
            <KpiTile label="Model cost" value={usdText(toolsUsd)} hint="Est. with 900 tokens out" />
            <KpiTile label="Data cost" value={toolsDataPrice} hint="Billed per call, every run" />
          </KpiGrid>
          {toolCapture.error ? <p className="text-sm text-destructive">{(toolCapture.error as Error).message}</p> : null}
          {toolDefText ? <RawBlock title="Tool definition (as sent)" meta={`${toolDefs.length} tool`} text={toolDefText} /> : null}
          <div className="flex flex-col gap-2">
            {calls.map((c, i) => (
              <div key={i} className="rounded-md border border-border p-2" data-lab-call={i}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge>site_data</Badge>
                  <code className="min-w-0 flex-1 truncate font-mono">{JSON.stringify(c.args)}</code>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>{c.records} records</span>
                  <span>≈ {formatTokens(c.resultTokens)} tokens back</span>
                  <span>rendering {charsText(c.renderingChars)} + raw {charsText(c.rawChars)}</span>
                  {c.recordsDropped ? <span>{c.recordsDropped} raw records cut</span> : null}
                  <span>{recordPrice(c.records)}</span>
                </div>
                <RawBlock title="What the model reads back" meta={charsText(c.resultChars)} text={prettyJson(c.resultText)} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3" data-lab-step="run">
        <h2 className="text-sm font-semibold text-foreground">Run</h2>
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <ProTextarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} aria-label="Question" />
          <div className="flex flex-wrap items-center gap-2">
            <ModelListDropdown
              value={modelId}
              onValueChange={setModelId}
              inputModalities={["text"]}
              outputModalities={["text"]}
              selectionPurpose="agent"
              modelOnly
              aria-label="Model"
            />
            <Button variant="outline" disabled={!modelId} onClick={() => void capture("handed")}>
              Exact request · handed
            </Button>
            <Button variant="outline" disabled={!modelId} onClick={() => void capture("tools")}>
              Exact request · tools
            </Button>
            <Button variant="primary" disabled={!modelId || !organizationId || running.handed || running.tools} onClick={() => void run(["handed", "tools"])}>
              {running.handed || running.tools ? "Running" : "Run both"}
            </Button>
            <Button variant="quiet" disabled={!running.handed && !running.tools} onClick={() => abort.current?.abort()}>
              Stop
            </Button>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {(["handed", "tools"] as const).map((mode) => (
            <RunCard
              key={mode}
              mode={mode}
              run={runs[mode] ?? null}
              running={!!running[mode]}
              capture={captures[mode] ?? null}
              dataCost={mode === "handed" ? "Paid once at fetch" : runs.tools && recordsBilled(runs.tools.toolCalls) > 0 ? recordPrice(recordsBilled(runs.tools.toolCalls)) : toolsDataPrice}
              dataHint={mode === "tools" && runs.tools ? `${recordsBilled(runs.tools.toolCalls)} records billed` : undefined}
              usdText={usdText}
            />
          ))}
        </div>
      </section>

      {runs.handed?.answer || runs.tools?.answer ? (
        <Decision fields={stats.map((s) => s.name)} records={records} sent={knobs.fields} handed={runs.handed?.answer ?? ""} tools={runs.tools?.answer ?? ""} />
      ) : null}
    </>
  );
}

function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function RawBlock({ title, meta, text, defaultOpen = false }: { title: string; meta?: string; text: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="min-w-0">
      <DisclosureHeader open={open} onClick={() => setOpen(!open)} title={title} meta={meta} />
      {open ? <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 font-mono text-xs leading-relaxed">{text}</pre> : null}
    </div>
  );
}

function RunCard({
  mode,
  run,
  running,
  capture,
  dataCost,
  dataHint,
  usdText,
}: {
  mode: LabMode;
  run: LabRunResult | null;
  running: boolean;
  capture: CapturedRequest | string | null;
  dataCost: string | null;
  dataHint?: string;
  usdText: (usd: number | null | undefined) => string | null;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3" data-lab-run={mode}>
      <h3 className="text-sm font-semibold text-foreground">{mode === "handed" ? "Handed over" : "Model fetches"}</h3>
      {typeof capture === "string" ? <p className="text-sm text-destructive">{capture}</p> : capture ? <CaptureView capture={capture} /> : null}
      {run ? (
        <>
          <KpiGrid>
            <KpiTile label="Tokens in" value={run.tokensIn} loading={running && run.tokensIn == null} />
            <KpiTile label="Tokens out" value={run.tokensOut} loading={running && run.tokensOut == null} />
            <KpiTile label="Model cost" value={usdText(run.costUsd)} loading={running && run.costUsd == null} />
            <KpiTile label="Data cost" value={dataCost} hint={dataHint} />
            <KpiTile label="Latency" value={formatDurationMs(run.latencyMs, { style: "compact" })} />
          </KpiGrid>
          {run.error ? <p className="text-sm text-destructive">{run.error}</p> : null}
          {run.toolCalls.map((c) => (
            <div key={c.callId} className="rounded-md border border-border p-2 text-xs" data-lab-made-call={c.callId}>
              <div className="flex items-center gap-2">
                <Badge tone={c.status === "error" ? "destructive" : c.status === "done" ? "success" : undefined}>{c.name}</Badge>
                <code className="min-w-0 flex-1 truncate font-mono">{c.args ? JSON.stringify(c.args) : c.message}</code>
              </div>
              {c.result ? <RawBlock title="Result" meta={charsText(c.result.length)} text={prettyJson(c.result)} /> : null}
            </div>
          ))}
          {run.answer ? (
            <div className="min-w-0 text-sm">
              <MarkdownStream content={run.answer} isStreamActive={running} hideCopyButton />
            </div>
          ) : null}
          <RawBlock title="Stream events" meta={String(run.events.length)} text={JSON.stringify(run.events, null, 2)} />
        </>
      ) : (
        <EmptyState icon={<Play />} title="Not run yet" />
      )}
    </div>
  );
}

function CaptureView({ capture }: { capture: CapturedRequest }) {
  const parts = captureParts(capture.request);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <KpiGrid>
        <KpiTile label="System" value={`≈ ${formatTokens(estimateTokens(parts.systemChars, "prose"))}`} hint="Added by the platform" />
        <KpiTile label="User" value={`≈ ${formatTokens(estimateTokens(parts.userChars, "structured"))}`} hint={charsText(parts.userChars)} />
        <KpiTile label="Tools" value={parts.toolChars ? `≈ ${formatTokens(estimateTokens(parts.toolChars, "structured"))}` : "None"} hint={parts.toolChars ? charsText(parts.toolChars) : undefined} />
      </KpiGrid>
      <RawBlock title="Exact request" meta={capture.model ?? undefined} text={JSON.stringify(capture.request, null, 2)} />
    </div>
  );
}

function Decision({ fields, records, sent, handed, tools }: { fields: string[]; records: LabRecord[]; sent: string[]; handed: string; tools: string }) {
  const h = fieldsUsed(handed, records, fields);
  const t = fieldsUsed(tools, records, fields);
  return (
    <section className="flex flex-col gap-3" data-lab-step="decision">
      <h2 className="text-sm font-semibold text-foreground">Fields the answers used</h2>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border text-left">
              <th className="px-2 py-1.5 font-medium">Field</th>
              <th className="px-2 py-1.5 font-medium">Handed over</th>
              <th className="px-2 py-1.5 text-right font-medium">Used · handed</th>
              <th className="px-2 py-1.5 text-right font-medium">Used · tools</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => (
              <tr key={f} className="border-b border-border/50 last:border-0" data-lab-used={f}>
                <td className="px-2 py-1 font-mono">{f}</td>
                <td className="px-2 py-1 text-muted-foreground">{sent.includes(f) ? "Sent" : "Left out"}</td>
                <td className="px-2 py-1 text-right tabular-nums">{handed && sent.includes(f) && h[i].sent ? `${h[i].hits}/${h[i].sent}` : "—"}</td>
                <td className="px-2 py-1 text-right tabular-nums">{tools && t[i].sent ? `${t[i].hits}/${t[i].sent}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
