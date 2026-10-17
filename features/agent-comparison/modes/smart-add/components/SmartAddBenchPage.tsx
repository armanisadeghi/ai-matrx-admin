"use client";

/**
 * Smart Add truth bench — name a brand you know, cast a wide net, let every system judge every
 * result, mark the truth blind, read the scoreboard. FEATURE.md beside the mode folder.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ErrorNotice, Progress, Skeleton, StatusDot } from "@ai-matrx/design-system";
import Link from "next/link";
import { ExternalLink, ListChecks, Loader2, Search } from "lucide-react";
import {
  Button,
  EmptyState,
  Field,
  RegionSkeleton,
  SegmentedControl,
  Switch,
} from "@ai-matrx/design-system/controls";
import { formatDurationMs, formatUsd } from "@ai-matrx/kit/format";
import { ModelListDropdown } from "@ai-matrx/agents/models/react";
import { AgentListDropdown } from "@ai-matrx/agents/catalog/react";
import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { useBackendApi } from "@/hooks/useBackendApi";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { toast } from "@/lib/toast";
import { BattleHeader } from "@/features/agent-comparison/shared/BattleHeader";
import { SearchReviewBody } from "@/features/search-review/SearchReviewBody";
import type {
  ReviewAnswer,
  SearchReviewSession,
} from "@/features/search-review/types";
import { loadComparisonSet } from "../../../service/comparisonSetsService";
import { listMatrixEntries } from "../../matrix/service";
import { entryToCell, metadataToSetup } from "../../matrix/model";
import type { MatrixCell } from "../../matrix/types";
import {
  SYSTEM_LABEL,
  TRUTH_LABEL,
  defaultQueries,
  applyRunEvent,
  emptyBench,
  expectedCells,
  placeholderCells,
  rowStatus,
  type RowStatus,
  readBench,
  readRuns,
  score,
  type BenchResult,
  type BenchState,
  type SystemAnswer,
  type SystemKey,
  type Truth,
} from "../model";
import {
  castNet,
  loadJevAnswers,
  prepareRun,
  resolveJudges,
  saveTruth,
  streamRun,
  type NetProgress,
} from "../service";
import { isRoundMetadata } from "../round-model";
import { SmartAddRoundPage } from "./SmartAddRoundPage";

const POLL_MS = 2000;
/** The Jev judges are platform (system) agents; the picker opens on them and can still reach the rest. */
/**
 * Results per search: one page is about 30 results (one engine answers 20 a page, the other 10), so
 * the depth a person picks is said in results, never in pages.
 */
const RESULT_DEPTHS = [1, 2, 3, 5].map((pages) => ({ pages, results: pages * 30 }));
const JEV_PICKER_TABS = ["system", "mine", "shared", "all"] as const;
const SYSTEMS: SystemKey[] = ["holder", "jev", "reference"];
const SYSTEM_HINT: Record<SystemKey, string> = {
  holder: "Gemini 3.8 Flash, 25 results per call",
  jev: "Jev 1.13, one result per call",
  reference: "Today's instructions on a model you pick",
};

type View = "truth" | "score";
type Mode = "net" | "round";

export function SmartAddBenchPage({ setId = null }: { setId?: string | null }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const userId = useAppSelector(selectUserId);
  const { post } = useBackendApi();
  const [bench, setBench] = useState<BenchState>(emptyBench);
  const [queriesText, setQueriesText] = useState("");
  const [cells, setCells] = useState<MatrixCell[]>([]);
  // The battle this page shows: the saved one it opened, or the one it just filed (the URL follows,
  // the page never reloads, so the run streams straight onto the rows).
  const [activeSetId, setActiveSetId] = useState<string | null>(setId);
  const [loading, setLoading] = useState(Boolean(setId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [net, setNet] = useState<NetProgress | null>(null);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [view, setView] = useState<View>("truth");
  const [mode, setMode] = useState<Mode>("net");
  const [, startTransition] = useTransition();
  const lastChange = useRef(0); // set on mount by the signature effect below

  // Open a saved bench.
  useEffect(() => {
    if (!setId || !userId) return;
    let alive = true;
    loadComparisonSet(setId)
      .then(({ set, entries }) => {
        if (!alive) return;
        // A real-round bench has its own page.
        if (isRoundMetadata(set.metadata as Record<string, unknown> | null)) {
          setMode("round");
          return;
        }
        const saved = readBench(set.metadata as Record<string, unknown> | null);
        if (!saved) throw new Error("This saved battle is not a Smart Add bench.");
        // Who judged is the battle's own columns (a bench saved before it recorded them carries only those).
        const columns = metadataToSetup(set.metadata as Record<string, unknown> | null).columns.variants;
        const agentOf = (id: string) => columns.find((c) => c.id === id)?.patch;
        setBench({
          ...saved,
          agents: {
            holder: agentOf("holder")?.agent_id ?? saved.agents.holder,
            jev: agentOf("jev")?.agent_id ?? saved.agents.jev,
            referenceModel: agentOf("reference")?.model_id ?? saved.agents.referenceModel,
          },
        });
        setQueriesText(saved.queries.join("\n"));
        const now = Date.now();
        setCells(entries.map((e) => entryToCell(e, now)).filter((c): c is MatrixCell => c !== null));
      })
      .catch((err: unknown) => alive && setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [setId, userId]);

  // Who judges, from data: the web-result job's holder, and the Jev agent picked on the last bench.
  // Until the lookup answers, the row says "Finding…", never "No agent found".
  const [judgesLooked, setJudgesLooked] = useState(false);
  useEffect(() => {
    // Only once the person is known: a read sent before sign-in hydrates goes out as anon.
    if (setId || !userId) return;
    let alive = true;
    resolveJudges(userId)
      .then(
        (j) =>
          alive &&
          setBench((b) => ({ ...b, agents: { ...b.agents, holder: j.holder, jev: b.agents.jev ?? j.jev } })),
      )
      .catch((err: unknown) => alive && setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => alive && setJudgesLooked(true));
    return () => {
      alive = false;
    };
  }, [setId, userId]);

  // A REOPENED bench whose run is still going has no stream on this page: read its rows until it
  // settles (five quiet minutes at most). A run started here streams instead.
  const live = cells.some((c) => (c.status === "queued" || c.status === "running") && !c.stalled);
  const signature = cells.map((c) => `${c.entryId}:${c.status}`).join("|");
  useEffect(() => {
    lastChange.current = Date.now();
  }, [signature]);
  const awaiting = Boolean(activeSetId) && cells.length < expectedCells(bench);
  useEffect(() => {
    if (!activeSetId || streaming || (!live && !awaiting)) return undefined;
    const t = setInterval(() => {
      if (Date.now() - lastChange.current > 5 * 60_000) return;
      listMatrixEntries(activeSetId)
        .then((rows) => {
          const now = Date.now();
          setCells(rows.map((e) => entryToCell(e, now)).filter((c): c is MatrixCell => c !== null));
        })
        .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : String(err)));
    }, POLL_MS);
    return () => clearInterval(t);
  }, [activeSetId, streaming, live, awaiting]);

  // Jev's answers from the decision answer store, for finished cells that carry no answer text.
  const [jevStore, setJevStore] = useState<Map<string, SystemAnswer>>(new Map());
  const missingKey = cells
    .filter((c) => c.columnId === "jev" && c.status === "completed" && !c.result?.answer && c.conversationId && !jevStore.has(c.conversationId))
    .map((c) => c.conversationId)
    .join(",");
  useEffect(() => {
    if (!missingKey) return;
    let alive = true;
    loadJevAnswers(missingKey.split(","))
      .then((found) => alive && setJevStore((prev) => new Map([...prev, ...found])))
      .catch((err: unknown) => alive && setLoadError(err instanceof Error ? err.message : String(err)));
    return () => {
      alive = false;
    };
  }, [missingKey]);

  const runs = readRuns(cells, bench, jevStore);
  const judged = Boolean(activeSetId);
  const brand = bench.brand;
  const patchBrand = (p: Partial<BenchState["brand"]>) => setBench((b) => ({ ...b, brand: { ...b.brand, ...p } }));
  const queries = queriesText.split("\n").map((q) => q.trim()).filter(Boolean);
  const canSearch = !judged && !searching && !starting && Boolean(brand.name.trim() || brand.website.trim());

  const onPlan = () => setQueriesText(defaultQueries(brand).join("\n"));

  const onSearch = async () => {
    const plan = queries.length ? queries : defaultQueries(brand);
    if (!queries.length) setQueriesText(plan.join("\n"));
    setSearching(true);
    setRunError(null);
    setBench((b) => ({ ...b, queries: plan, results: [] }));
    try {
      // Every engine page lands on the list the moment it returns.
      const { results, failures } = await castNet(post, plan, bench.pages, setNet, undefined, (live) =>
        setBench((b) => ({ ...b, results: live })),
      );
      setBench((b) => ({ ...b, queries: plan, results }));
      if (failures.length) setRunError(`${failures.length} searches failed: ${failures.slice(0, 3).join(" · ")}`);
    } finally {
      setSearching(false);
    }
  };

  const onJudge = async () => {
    if (!userId) {
      setRunError("Sign in to run the bench.");
      return;
    }
    setStarting(true);
    setRunError(null);
    try {
      // write-target: the bench is filed in the organization the person works in
      const organizationId = await ensureOrgId(null);
      const prepared = await prepareRun({ ...bench, queries }, userId, organizationId);
      setBench(prepared.bench);
      setCells(placeholderCells(prepared.cells));
      setActiveSetId(prepared.setId);
      // The address becomes the saved bench's; the page stays (no reload), so the stream lands here.
      replaceAddressWithoutNavigating(`/agents/battle/smart-add/${prepared.setId}`);
      setStreaming(true);
      setStarting(false);
      const error = await streamRun(dispatch, prepared.setId, organizationId, prepared.cells, (e) =>
        setCells((prev) => applyRunEvent(prev, e, new Date().toISOString())),
      );
      if (error) setRunError(`The run stopped: ${error}`);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
      setStreaming(false);
    }
  };

  const onAnswer = async (key: string, answer: ReviewAnswer | null) => {
    if (!activeSetId) return;
    const truth = answer?.status === "answered" ? (answer.kind as Truth) : null;
    const before = bench.truth[key] ?? null;
    const apply = (t: Truth | null) =>
      setBench((b) => {
        const next = { ...b.truth };
        if (t) next[key] = t;
        else delete next[key];
        return { ...b, truth: next };
      });
    apply(truth);
    try {
      const { labelError } = await saveTruth(activeSetId, key, truth, runs.jev.conversations.get(key) ?? null);
      if (labelError) toast.error(labelError);
    } catch (err) {
      apply(before);
      throw err;
    }
  };

  const session: SearchReviewSession = {
    title: "Mark the truth",
    subject: { type: "brand", name: brand.name || brand.website },
    results: bench.results.map((r) => ({
      key: r.key,
      result: { url: r.url, title: r.title, description: r.description, extra_snippets: r.extraSnippets },
      hits: r.hits.map((h) => ({ engine: h.engine, rank: h.rank, query: h.query })),
    })),
    choices: (["ours", "about_us", "not_us"] as Truth[]).map((k) => ({
      key: k,
      label: TRUTH_LABEL[k],
      pinned: true,
      description: k === "ours" ? "The brand runs it" : k === "about_us" ? "About or tied to the brand" : "Someone or something else",
    })),
    answers: Object.fromEntries(
      Object.entries(bench.truth).map(([k, t]) => [k, { status: "answered", kind: t, sentiment: null } as ReviewAnswer]),
    ),
    onAnswer,
  };

  const marked = Object.keys(bench.truth).length;

  // Wide net | Real round — offered only on a new bench (a saved one is one or the other).
  const modeSwitch = setId ? null : (
    <SegmentedControl<Mode>
      aria-label="Bench kind"
      value={mode}
      onValueChange={setMode}
      data={[
        { value: "net", label: "Wide net" },
        { value: "round", label: "Real round" },
      ]}
    />
  );
  if (mode === "round") return <SmartAddRoundPage setId={setId} modeSwitch={modeSwitch} />;

  const judgeable = bench.results.length > 0 && !searching && !judged;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ paddingTop: "var(--shell-header-h)" }}>
      <BattleHeader
        battleName={judged ? `Smart Add bench · ${brand.name || brand.website}` : null}
        fallbackTitle="Smart Add bench"
        actions={[
          {
            icon: "SquarePlus",
            label: "Start a new bench",
            onPress: () => startTransition(() => router.push("/agents/battle/smart-add")),
          },
        ]}
      />
      {(runError || loadError) && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <ErrorNotice message={runError ?? loadError ?? ""} size="compact" />
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto" data-matrx-page-scroll>
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-4">
          {loading ? (
            <RegionSkeleton />
          ) : (
            <>
              {modeSwitch}
              <BrandCard brand={brand} patchBrand={patchBrand} locked={judged || searching} />
              <SearchCard
                bench={bench}
                setBench={setBench}
                queriesText={queriesText}
                setQueriesText={setQueriesText}
                onPlan={onPlan}
                onSearch={onSearch}
                canSearch={canSearch}
                searching={searching}
                net={net}
                locked={judged}
              />
              {searching || bench.results.length > 0 ? (
                <ResultsCard
                  bench={bench}
                  cells={cells}
                  searching={searching}
                  net={net}
                  judged={judged}
                />
              ) : null}
              {bench.results.length > 0 ? (
                <JudgeCard
                  bench={bench}
                  setBench={setBench}
                  runs={runs}
                  judgesLooked={judgesLooked}
                  judged={judged}
                  judgeable={judgeable}
                  starting={starting}
                  onJudge={onJudge}
                />
              ) : null}
              {judged ? (
                <section className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <SegmentedControl<View>
                      aria-label="Bench view"
                      value={view}
                      onValueChange={setView}
                      data={[
                        { value: "truth", label: "Mark the truth", count: bench.results.length - marked },
                        { value: "score", label: "Scoreboard", count: marked },
                      ]}
                    />
                    <span className="type-caption text-muted-foreground">Answers stay hidden until the scoreboard.</span>
                  </div>
                  {view === "truth" ? (
                    <div className="rounded-lg border border-border bg-card min-h-[420px] flex flex-col">
                      <SearchReviewBody session={session} />
                    </div>
                  ) : (
                    <Scoreboard bench={bench} runs={runs} />
                  )}
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandCard({
  brand,
  patchBrand,
  locked,
}: {
  brand: BenchState["brand"];
  patchBrand: (p: Partial<BenchState["brand"]>) => void;
  locked: boolean;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
      <h2 className="type-section">1 · Brand</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="type-label">Website</span>
          {/* ui-exception: a raw address, not prose */}
          <Field
            value={brand.website}
            onChange={(e) => patchBrand({ website: e.target.value })}
            placeholder="ritualcoffee.com"
            aria-label="Website"
            disabled={locked}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="type-label">Name</span>
          <ProInput
            value={brand.name}
            onChange={(e) => patchBrand({ name: e.target.value })}
            placeholder="Ritual Coffee Roasters"
            aria-label="Brand name"
            disabled={locked}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="type-label">Place</span>
          <ProInput
            value={brand.place}
            onChange={(e) => patchBrand({ place: e.target.value })}
            placeholder="San Francisco, CA"
            aria-label="Place"
            disabled={locked}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="type-label">Accounts you know are theirs</span>
          {/* ui-exception: raw addresses, comma separated */}
          <Field
            value={brand.accounts}
            onChange={(e) => patchBrand({ accounts: e.target.value })}
            placeholder="instagram.com/ritualcoffee"
            aria-label="Known accounts"
            disabled={locked}
          />
        </label>
      </div>
    </section>
  );
}

function SearchCard({
  bench,
  setBench,
  queriesText,
  setQueriesText,
  onPlan,
  onSearch,
  canSearch,
  searching,
  net,
  locked,
}: {
  bench: BenchState;
  setBench: React.Dispatch<React.SetStateAction<BenchState>>;
  queriesText: string;
  setQueriesText: (v: string) => void;
  onPlan: () => void;
  onSearch: () => void;
  canSearch: boolean;
  searching: boolean;
  net: NetProgress | null;
  locked: boolean;
}) {
  const searched = bench.results.length > 0;
  return (
    <section className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="type-section flex-1">2 · Searches</h2>
        <Button variant="quiet" onClick={onPlan} disabled={!canSearch}>
          Suggest searches
        </Button>
      </div>
      <ProTextarea
        value={queriesText}
        onChange={(e) => setQueriesText(e.target.value)}
        placeholder={'One search per line, e.g. "Ritual Coffee" San Francisco'}
        aria-label="Searches, one per line"
        rows={5}
        disabled={locked || searching}
      />
      <div className="flex flex-wrap items-center gap-3">
        <span className="type-label">Results per search</span>
        <SegmentedControl<string>
          aria-label="Results per search"
          value={String(bench.pages)}
          onValueChange={(v) => setBench((b) => ({ ...b, pages: Number(v) }))}
          data={RESULT_DEPTHS.map((d) => ({ value: String(d.pages), label: String(d.results) }))}
        />
        {!locked ? (
          <Button
            className="ml-auto"
            onClick={onSearch}
            disabled={!canSearch}
            icon={searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          >
            {searching && net ? `Searching ${net.done} of ${net.total}` : searched ? "Search again" : "Search"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

const STATUS_VIEW: Record<RowStatus, { tone: "neutral" | "info" | "success" | "danger"; label: string } | null> = {
  idle: null,
  waiting: { tone: "neutral", label: "Waiting" },
  judging: { tone: "info", label: "Judging…" },
  done: { tone: "success", label: "Done" },
  failed: { tone: "danger", label: "Failed" },
};

function ResultsCard({
  bench,
  cells,
  searching,
  net,
  judged,
}: {
  bench: BenchState;
  cells: MatrixCell[];
  searching: boolean;
  net: NetProgress | null;
  judged: boolean;
}) {
  const systems = judged ? bench.systems : [];
  return (
    <section className="rounded-lg border border-border bg-card flex flex-col">
      <div className="p-4 flex flex-col gap-2 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="type-section flex-1">3 · Results</h2>
          <span className="type-body tabular-nums">{bench.results.length}</span>
        </div>
        {searching && net ? (
          <div className="flex items-center gap-3">
            <Progress value={net.total ? (100 * net.done) / net.total : 0} className="flex-1" />
            <span className="type-caption text-muted-foreground tabular-nums">
              {net.done} of {net.total} searches
            </span>
          </div>
        ) : null}
      </div>
      <ol className="max-h-[420px] overflow-y-auto divide-y divide-border">
        {bench.results.map((r) => (
          <li key={r.key} className="px-4 py-2 flex items-center gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <a href={r.url} target="_blank" rel="noreferrer" className="type-body block truncate hover:underline">
                {r.title || r.url}
              </a>
              <span className="type-caption text-muted-foreground block truncate">{r.url}</span>
            </div>
            {systems.map((s) => {
              const v = STATUS_VIEW[rowStatus(cells, bench, r.key, s)];
              return v ? (
                <span key={s} className="type-caption inline-flex items-center gap-1.5 shrink-0 w-32">
                  <StatusDot tone={v.tone} />
                  <span className="text-muted-foreground">{SYSTEM_LABEL[s]}</span>
                  <span className={v.tone === "info" ? "animate-pulse" : undefined}>{v.label}</span>
                </span>
              ) : null;
            })}
          </li>
        ))}
        {searching && bench.results.length === 0
          ? Array.from({ length: 6 }, (_, i) => (
              <li key={`s${i}`} className="px-4 py-3 flex flex-col gap-1.5">
                <Skeleton width="1/2" height="sm" />
                <Skeleton width="1/3" height="sm" />
              </li>
            ))
          : null}
      </ol>
    </section>
  );
}

function JudgeCard({
  bench,
  setBench,
  runs,
  judgesLooked,
  judged,
  judgeable,
  starting,
  onJudge,
}: {
  bench: BenchState;
  setBench: React.Dispatch<React.SetStateAction<BenchState>>;
  runs: ReturnType<typeof readRuns>;
  judgesLooked: boolean;
  judged: boolean;
  judgeable: boolean;
  starting: boolean;
  onJudge: () => void;
}) {
  const toggle = (s: SystemKey, on: boolean) =>
    setBench((b) => ({ ...b, systems: on ? [...new Set([...b.systems, s])] : b.systems.filter((x) => x !== s) }));
  const shown = judged ? SYSTEMS.filter((s) => bench.systems.includes(s)) : SYSTEMS;
  return (
    <section className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
      <h2 className="type-section">4 · Judge</h2>
      <div className="flex flex-col gap-3">
        {shown.map((s) => {
          const missing = s === "reference" ? !bench.agents.referenceModel : !bench.agents[s];
          const r = runs[s];
          return (
            <div key={s} className="flex flex-wrap items-center gap-3">
              {!judged ? (
                <Switch
                  checked={bench.systems.includes(s) && !missing}
                  disabled={missing}
                  onCheckedChange={(v) => toggle(s, v)}
                  aria-label={SYSTEM_LABEL[s]}
                />
              ) : null}
              <span className="type-body font-medium w-24">{SYSTEM_LABEL[s]}</span>
              {judged ? (
                <>
                  <Progress
                    value={r.calls ? (100 * (r.done + r.failed)) / r.calls : 0}
                    tone={r.failed ? "warning" : r.done === r.calls && r.calls ? "success" : "default"}
                    className="flex-1 min-w-32"
                  />
                  <span className="type-caption text-muted-foreground tabular-nums w-40 text-right">
                    {r.done} of {r.calls} calls{r.failed ? ` · ${r.failed} failed` : ""}
                  </span>
                </>
              ) : (
                <span className="type-caption text-muted-foreground">{SYSTEM_HINT[s]}</span>
              )}
              {s === "reference" && !judged ? (
                <ModelListDropdown
                  value={bench.agents.referenceModel}
                  modelOnly
                  inputModalities={["text"]}
                  outputModalities={["text"]}
                  placeholder="Pick a reference model"
                  aria-label="Reference model"
                  onValueChange={(modelId) =>
                    setBench((b) => ({
                      ...b,
                      agents: { ...b.agents, referenceModel: modelId },
                      systems: modelId ? [...new Set([...b.systems, "reference" as SystemKey])] : b.systems,
                    }))
                  }
                />
              ) : s === "jev" && !judged ? (
                <AgentListDropdown
                  consumerId="smart-add-bench-jev"
                  initialTab="system"
                  visibleTabs={JEV_PICKER_TABS}
                  activeAgentId={bench.agents.jev}
                  label={bench.agents.jev ? "Change Jev agent" : "Pick the Jev agent"}
                  onSelect={(agentId) =>
                    setBench((b) => ({
                      ...b,
                      agents: { ...b.agents, jev: agentId },
                      systems: [...new Set([...b.systems, "jev" as SystemKey])],
                    }))
                  }
                />
              ) : null}
              {s !== "reference" && bench.agents[s] ? (
                <Link
                  href={`/agents/${bench.agents[s]}`}
                  target="_blank"
                  className="type-caption inline-flex items-center gap-1 underline"
                >
                  Open agent <ExternalLink className="w-3 h-3" />
                </Link>
              ) : s !== "reference" && !bench.agents[s] ? (
                !judgesLooked ? (
                  <span className="type-caption text-muted-foreground">Finding…</span>
                ) : (
                  <span className="type-caption text-destructive">No agent found</span>
                )
              ) : null}
            </div>
          );
        })}
      </div>
      {!judged ? (
        <div className="flex justify-end">
          <Button
            onClick={onJudge}
            disabled={!judgeable || starting || bench.systems.length === 0}
            icon={starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
          >
            {starting ? "Starting…" : `Judge ${bench.results.length} results`}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function Scoreboard({
  bench,
  runs,
}: {
  bench: BenchState;
  runs: ReturnType<typeof readRuns>;
}) {
  const [onlySplit, setOnlySplit] = useState(true);
  const scores = bench.systems.map((s) => ({
    s,
    sc: score(runs[s], bench.truth),
  }));
  const marked = Object.keys(bench.truth).length;
  const rows = bench.results.filter((r) => bench.truth[r.key]);
  const shown = onlySplit
    ? rows.filter((r) =>
        bench.systems.some(
          (s) => runs[s].answers.get(r.key)?.stance !== bench.truth[r.key],
        ),
      )
    : rows;
  if (!marked) {
    return (
      <EmptyState
        icon={<ListChecks className="w-5 h-5" />}
        title="Nothing marked yet"
        line="Mark results first; the score counts only those."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full type-body tabular-nums whitespace-nowrap">
          <thead>
            <tr className="border-b border-border text-left type-label text-muted-foreground">
              <th className="p-2">System</th>
              <th className="p-2 text-right">Right</th>
              <th className="p-2 text-right">Wrong</th>
              <th className="p-2 text-right">Can't tell</th>
              <th className="p-2 text-right">No answer</th>
              <th className="p-2 text-right">Stranger marked ours</th>
              <th className="p-2 text-right">Us marked not us</th>
              <th className="p-2 text-right">Typical call</th>
              <th className="p-2 text-right">Slow call</th>
              <th className="p-2 text-right">Calls</th>
              <th className="p-2 text-right">Cost, all results</th>
            </tr>
          </thead>
          <tbody>
            {scores.map(({ s, sc }) => (
              <tr key={s} className="border-b border-border last:border-0">
                <td className="p-2 font-medium">{SYSTEM_LABEL[s]}</td>
                <td className="p-2 text-right">
                  {sc.right}/{sc.marked} (
                  {Math.round((100 * sc.right) / Math.max(1, sc.marked))}%)
                </td>
                <td className="p-2 text-right">{sc.wrong}</td>
                <td className="p-2 text-right">{sc.cantTell}</td>
                <td className="p-2 text-right">{sc.missing}</td>
                <td className="p-2 text-right">{sc.falseOurs}</td>
                <td className="p-2 text-right">{sc.missedUs}</td>
                <td className="p-2 text-right">
                  {formatDurationMs(sc.p50, { style: "compact" })}
                </td>
                <td className="p-2 text-right">
                  {formatDurationMs(sc.p90, { style: "compact" })}
                </td>
                <td className="p-2 text-right">{sc.calls}</td>
                <td className="p-2 text-right">
                  {formatUsd(sc.cost, { digits: "adaptive" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={onlySplit}
          onCheckedChange={setOnlySplit}
          aria-label="Only results a system got wrong"
        />
        <span className="type-body">Only results a system got wrong</span>
        <span className="type-caption text-muted-foreground ml-auto">
          {shown.length} shown
        </span>
      </div>
      {shown.length > 0 ? (
        <ol className="rounded-lg border border-border bg-card divide-y divide-border">
          {shown.map((r) => (
            <li
              key={r.key}
              className="p-3 grid gap-2 md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] items-start"
            >
              <div className="min-w-0">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="type-body font-medium hover:underline break-words"
                >
                  {r.title || r.url}
                </a>
                <div className="type-caption text-muted-foreground break-all">
                  {r.url}
                </div>
                {r.description ? (
                  <div className="type-caption text-muted-foreground line-clamp-2">
                    {r.description}
                  </div>
                ) : null}
              </div>
              <div>
                <div className="type-label text-muted-foreground">Truth</div>
                <div className="type-body font-medium">
                  {TRUTH_LABEL[bench.truth[r.key]]}
                </div>
              </div>
              {bench.systems.map((s) => {
                const a = runs[s].answers.get(r.key);
                const ok = a?.stance === bench.truth[r.key];
                const conv =
                  s === "jev" ? runs.jev.conversations.get(r.key) : null;
                return (
                  <div key={s} className="min-w-0">
                    <div className="type-label text-muted-foreground">
                      {SYSTEM_LABEL[s]}
                    </div>
                    <div
                      className={
                        ok
                          ? "type-body"
                          : "type-body text-destructive font-medium"
                      }
                    >
                      {a ? TRUTH_LABEL[a.stance] : "No answer"}
                    </div>
                    <div className="type-caption text-muted-foreground break-words">
                      {[
                        a?.label,
                        a?.probability != null
                          ? `${Math.round(a.probability * 100)}%`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {conv ? (
                        <>
                          {" · "}
                          <Link
                            href={`/work/conversations/${conv}`}
                            target="_blank"
                            className="underline"
                          >
                            run
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
