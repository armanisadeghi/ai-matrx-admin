"use client";

/**
 * Smart Add truth bench — name a brand you know, cast a wide net, let every system judge every
 * result, mark the truth blind, read the scoreboard. FEATURE.md beside the mode folder.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ErrorNotice, Progress, Skeleton } from "@ai-matrx/design-system";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import Link from "next/link";
import { ListChecks, Loader2, Search, SquareArrowOutUpRight } from "lucide-react";
import {
  Button,
  EmptyState,
  Field,
  RegionSkeleton,
  SegmentedControl,
  Switch,
} from "@ai-matrx/design-system/controls";
import { formatDurationMs } from "@ai-matrx/kit/format";
import { Cost } from "@/components/cost/Cost";
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
  truthLabels,
  type Subject,
  defaultQueries,
  applyRunEvent,
  batchAnswerUnreadable,
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
  loadFullAnswers,
  loadJevAnswers,
  resolveJevAgent,
  prepareRun,
  resolveJudges,
  saveTruth,
  streamRun,
  type NetProgress,
} from "../service";
import { isRoundMetadata } from "../round-model";
import { SmartAddRoundPage } from "./SmartAddRoundPage";
import { BenchResultsTable } from "./BenchResultsTable";

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
        setCells(entries.map((e) => entryToCell(e)).filter((c): c is MatrixCell => c !== null));
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
      .then(async (j) => {
        // Jev: the one picked on the last bench, else the tagged system agent for this subject.
        const jev = j.jev ?? (await resolveJevAgent("brand"));
        if (alive) setBench((b) => ({ ...b, agents: { ...b.agents, holder: j.holder, jev: b.agents.jev ?? jev } }));
      })
      .catch((err: unknown) => alive && setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => alive && setJudgesLooked(true));
    return () => {
      alive = false;
    };
  }, [setId, userId]);

  // A REOPENED bench whose run is still going has no stream on this page: read its rows until it
  // settles (five quiet minutes at most). A run started here streams instead.
  const live = cells.some((c) => (c.status === "queued" || c.status === "running"));
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
          setCells(rows.map((e) => entryToCell(e)).filter((c): c is MatrixCell => c !== null));
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

  // Today's AI answers 25 results per call; a cell keeps 6,000 characters of that answer, so a full
  // batch is read from its conversation instead (every character is there).
  const [fullAnswers, setFullAnswers] = useState<Map<string, string>>(new Map());
  const cutKey = cells
    .filter((c) => batchAnswerUnreadable(c) && c.conversationId && !fullAnswers.has(c.conversationId))
    .map((c) => c.conversationId)
    .join(",");
  useEffect(() => {
    if (!cutKey) return;
    let alive = true;
    loadFullAnswers(cutKey.split(","))
      .then((found) => alive && setFullAnswers((prev) => new Map([...prev, ...found])))
      .catch((err: unknown) => alive && setLoadError(err instanceof Error ? err.message : String(err)));
    return () => {
      alive = false;
    };
  }, [cutKey]);

  const runs = readRuns(cells, bench, jevStore, fullAnswers);
  const judged = Boolean(activeSetId);
  const brand = bench.brand;
  const patchBrand = (p: Partial<BenchState["brand"]>) => setBench((b) => ({ ...b, brand: { ...b.brand, ...p } }));
  const queries = queriesText.split("\n").map((q) => q.trim()).filter(Boolean);
  const canSearch = !judged && !searching && !starting && Boolean(brand.name.trim() || brand.website.trim());

  const subject: Subject = bench.subject ?? "brand";
  const labels = truthLabels(subject);
  const onPlan = () => setQueriesText(defaultQueries(brand, subject).join("\n"));
  // Brand | Person: the Jev judge follows the subject (its own tagged system agent).
  const onSubject = (next: Subject) => {
    setBench((b) => ({ ...b, subject: next, agents: { ...b.agents, jev: null } }));
    resolveJevAgent(next)
      .then((jev) => setBench((b) => (b.subject === next ? { ...b, agents: { ...b.agents, jev } } : b)))
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : String(err)));
  };

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

  const onAnswer = async (key: string, answer: ReviewAnswer | null) =>
    onTruth(key, answer?.status === "answered" ? (answer.kind as Truth) : null);

  const onTruth = async (key: string, truth: Truth | null) => {
    if (!activeSetId) return;
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
      label: labels[k],
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
        <div className="w-full px-4 py-4 flex flex-col gap-4">
          {loading ? (
            <RegionSkeleton />
          ) : (
            <>
              {modeSwitch}
              <BrandCard brand={brand} patchBrand={patchBrand} locked={judged || searching} subject={subject} onSubject={onSubject} />
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
                  runs={runs}
                  searching={searching}
                  net={net}
                  judged={judged}
                  onTruth={onTruth}
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
                    <span className="type-secondary text-muted-foreground">Answers stay hidden until the scoreboard.</span>
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
  subject,
  onSubject,
}: {
  brand: BenchState["brand"];
  patchBrand: (p: Partial<BenchState["brand"]>) => void;
  locked: boolean;
  subject: Subject;
  onSubject: (s: Subject) => void;
}) {
  const person = subject === "person";
  return (
    <section className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 className="type-title flex-1">{person ? "1 · Person" : "1 · Brand"}</h2>
        {!locked ? (
          <SegmentedControl<Subject>
            aria-label="Who the bench is about"
            value={subject}
            onValueChange={onSubject}
            data={[
              { value: "brand", label: "Brand" },
              { value: "person", label: "Person" },
            ]}
          />
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="type-label">{person ? "Their website" : "Website"}</span>
          {/* ui-exception: a raw address, not prose */}
          <Field
            value={brand.website}
            onChange={(e) => patchBrand({ website: e.target.value })}
            placeholder={person ? "drkian.com" : "ritualcoffee.com"}
            aria-label="Website"
            disabled={locked}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="type-label">Name</span>
          <ProInput
            value={brand.name}
            onChange={(e) => patchBrand({ name: e.target.value })}
            placeholder={person ? "Kian Karimi" : "Ritual Coffee Roasters"}
            aria-label="Name"
            disabled={locked}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="type-label">Place</span>
          <ProInput
            value={brand.place}
            onChange={(e) => patchBrand({ place: e.target.value })}
            placeholder={person ? "Beverly Hills, CA" : "San Francisco, CA"}
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
            placeholder={person ? "instagram.com/drkian" : "instagram.com/ritualcoffee"}
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
        <h2 className="type-title flex-1">2 · Searches</h2>
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
            variant="primary"
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

function ResultsCard({
  bench,
  cells,
  runs,
  searching,
  net,
  judged,
  onTruth,
}: {
  bench: BenchState;
  cells: MatrixCell[];
  runs: ReturnType<typeof readRuns>;
  searching: boolean;
  net: NetProgress | null;
  judged: boolean;
  onTruth: (key: string, truth: Truth | null) => Promise<void>;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <h2 className="type-title">3 · Results</h2>
        {searching && net ? (
          <>
            <Progress value={net.total ? (100 * net.done) / net.total : 0} className="flex-1 max-w-md" />
            <span className="type-secondary text-muted-foreground tabular-nums">
              {net.done} of {net.total} searches · {bench.results.length} results
            </span>
          </>
        ) : null}
      </div>
      {searching && bench.results.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} width="full" height="sm" />
          ))}
        </div>
      ) : (
        <BenchResultsTable
          bench={bench}
          cells={cells}
          runs={runs}
          systems={judged ? bench.systems : []}
          onTruth={onTruth}
        />
      )}
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
      <h2 className="type-title">4 · Judge</h2>
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
                  <span className="type-secondary text-muted-foreground tabular-nums w-40 text-right">
                    {r.done} of {r.calls} calls{r.failed ? ` · ${r.failed} failed` : ""}
                  </span>
                </>
              ) : (
                <span className="type-secondary text-muted-foreground">{SYSTEM_HINT[s]}</span>
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
                  className="type-secondary inline-flex items-center gap-1 underline"
                >
                  Open agent <SquareArrowOutUpRight className="w-3.5 h-3.5" aria-hidden />
                </Link>
              ) : s !== "reference" && !bench.agents[s] ? (
                !judgesLooked ? (
                  <span className="type-secondary text-muted-foreground">Finding…</span>
                ) : (
                  <span className="type-secondary text-destructive">No agent found</span>
                )
              ) : null}
            </div>
          );
        })}
      </div>
      {!judged ? (
        <div className="flex justify-end">
          <Button
            variant="primary"
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

interface ScoreRow {
  system: SystemKey;
  sc: ReturnType<typeof score>;
}

function Scoreboard({ bench, runs }: { bench: BenchState; runs: ReturnType<typeof readRuns> }) {
  const marked = Object.keys(bench.truth).length;
  if (!marked) {
    return (
      <EmptyState
        icon={<ListChecks className="w-5 h-5" />}
        title="Nothing marked yet"
        line="Mark results first; the score counts only those."
      />
    );
  }
  const rows: ScoreRow[] = bench.systems.map((system) => ({ system, sc: score(runs[system], bench.truth) }));
  const rate = (r: ScoreRow) => (r.sc.marked ? r.sc.right / r.sc.marked : 0);
  const money = (v: number) => <Cost usd={v} short />;
  const columns: MatrxColumnDef<ScoreRow>[] = [
    { id: "system", header: "System", accessorFn: (r) => SYSTEM_LABEL[r.system], filter: "select", width: 140 },
    {
      id: "right",
      header: "Right",
      accessorFn: (r) => rate(r),
      filter: "number",
      align: "right",
      width: 130,
      cell: (r) => `${r.sc.right}/${r.sc.marked} (${Math.round(100 * rate(r))}%)`,
    },
    { id: "wrong", header: "Wrong", accessorFn: (r) => r.sc.wrong, filter: "number", align: "right", width: 90 },
    { id: "cant", header: "Can't tell", accessorFn: (r) => r.sc.cantTell, filter: "number", align: "right", width: 100 },
    { id: "missing", header: "No answer", accessorFn: (r) => r.sc.missing, filter: "number", align: "right", width: 100 },
    { id: "false-ours", header: bench.subject === "person" ? "Namesake marked them" : "Stranger marked ours", accessorFn: (r) => r.sc.falseOurs, filter: "number", align: "right", width: 170 },
    { id: "missed-us", header: bench.subject === "person" ? "Them marked someone else" : "Us marked not us", accessorFn: (r) => r.sc.missedUs, filter: "number", align: "right", width: 150 },
    {
      id: "p50",
      header: "Typical call",
      accessorFn: (r) => r.sc.p50,
      filter: "number",
      align: "right",
      width: 120,
      cell: (r) => formatDurationMs(r.sc.p50, { style: "compact" }),
    },
    {
      id: "p90",
      header: "Slow call",
      accessorFn: (r) => r.sc.p90,
      filter: "number",
      align: "right",
      width: 110,
      cell: (r) => formatDurationMs(r.sc.p90, { style: "compact" }),
    },
    { id: "calls", header: "Calls", accessorFn: (r) => r.sc.calls, filter: "number", align: "right", width: 80 },
    {
      id: "cost",
      header: "Cost, all results",
      accessorFn: (r) => r.sc.cost,
      filter: "number",
      align: "right",
      width: 140,
      cell: (r) => money(r.sc.cost),
    },
    {
      id: "cost-per",
      header: "Cost per call",
      accessorFn: (r) => (r.sc.calls ? r.sc.cost / r.sc.calls : 0),
      filter: "number",
      align: "right",
      width: 130,
      cell: (r) => money(r.sc.calls ? r.sc.cost / r.sc.calls : 0),
    },
  ];
  return (
    <MatrxDataTable<ScoreRow>
      tableId="agents/battle/smart-add/scoreboard"
      data={rows}
      columns={columns}
      getRowId={(r) => r.system}
      pageSize={0}
      detail={{ enabled: false }}
      toolbar={{ title: `Against your ${marked} marks` }}
    />
  );
}
