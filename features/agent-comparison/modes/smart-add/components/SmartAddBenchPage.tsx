"use client";

/**
 * Smart Add truth bench — name a brand you know, cast a wide net, let every system judge every
 * result, mark the truth blind, read the scoreboard. FEATURE.md beside the mode folder.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ErrorNotice } from "@ai-matrx/design-system";
import Link from "next/link";
import { ExternalLink, ListChecks, Search } from "lucide-react";
import {
  Badge,
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
  emptyBench,
  expectedCells,
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
  createAndRun,
  loadJevAnswers,
  resolveJudges,
  saveTruth,
  type NetProgress,
} from "../service";
import { isRoundMetadata } from "../round-model";
import { SmartAddRoundPage } from "./SmartAddRoundPage";

const POLL_MS = 2000;
/** The Jev judges are platform (system) agents; the picker opens on them and can still reach the rest. */
const JEV_PICKER_TABS = ["system", "mine", "shared", "all"] as const;
const SYSTEMS: SystemKey[] = ["holder", "jev", "reference"];
const SYSTEM_HINT: Record<SystemKey, string> = {
  holder: "Gemini 3.8 Flash, 25 results per call",
  jev: "Jev 1.13, one result per call",
  reference: "Opus 5.5 with today's instructions; costs most",
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
  const [loading, setLoading] = useState(Boolean(setId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [net, setNet] = useState<NetProgress | null>(null);
  const [busy, setBusy] = useState(false);
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
        if (!saved)
          throw new Error("This saved battle is not a Smart Add bench.");
        // Who judged is the battle's own columns (a bench saved before it recorded them carries only those).
        const columns = metadataToSetup(
          set.metadata as Record<string, unknown> | null,
        ).columns.variants;
        const agentOf = (id: string) => columns.find((c) => c.id === id)?.patch;
        setBench({
          ...saved,
          agents: {
            holder: agentOf("holder")?.agent_id ?? saved.agents.holder,
            jev: agentOf("jev")?.agent_id ?? saved.agents.jev,
            referenceModel:
              agentOf("reference")?.model_id ?? saved.agents.referenceModel,
          },
        });
        setQueriesText(saved.queries.join("\n"));
        const now = Date.now();
        setCells(
          entries
            .map((e) => entryToCell(e, now))
            .filter((c): c is MatrixCell => c !== null),
        );
      })
      .catch(
        (err: unknown) =>
          alive &&
          setLoadError(err instanceof Error ? err.message : String(err)),
      )
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
          setBench((b) => ({
            ...b,
            agents: { ...b.agents, holder: j.holder, jev: b.agents.jev ?? j.jev },
          })),
      )
      .catch(
        (err: unknown) =>
          alive &&
          setLoadError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => alive && setJudgesLooked(true));
    return () => {
      alive = false;
    };
  }, [setId, userId]);

  // Live while any cell is queued or running; stops after five quiet minutes.
  const live = cells.some(
    (c) => (c.status === "queued" || c.status === "running") && !c.stalled,
  );
  const signature = cells.map((c) => `${c.entryId}:${c.status}`).join("|");
  useEffect(() => {
    lastChange.current = Date.now();
  }, [signature]);
  // Also live until every expected cell exists: the page arrives a moment before the run queues them.
  const awaiting = Boolean(setId) && cells.length < expectedCells(bench);
  useEffect(() => {
    if (!setId || (!live && !busy && !awaiting)) return undefined;
    const t = setInterval(() => {
      if (Date.now() - lastChange.current > 5 * 60_000) return;
      listMatrixEntries(setId)
        .then((rows) => {
          const now = Date.now();
          setCells(
            rows
              .map((e) => entryToCell(e, now))
              .filter((c): c is MatrixCell => c !== null),
          );
        })
        .catch((err: unknown) =>
          setLoadError(err instanceof Error ? err.message : String(err)),
        );
    }, POLL_MS);
    return () => clearInterval(t);
  }, [setId, live, busy, awaiting]);

  // Jev's answers from the decision answer store, for finished cells that carry no answer text.
  const [jevStore, setJevStore] = useState<Map<string, SystemAnswer>>(
    new Map(),
  );
  const missingJev = cells
    .filter(
      (c) =>
        c.columnId === "jev" &&
        c.status === "completed" &&
        !c.result?.answer &&
        !jevStore.has(c.conversationId),
    )
    .map((c) => c.conversationId);
  const missingKey = missingJev.join(",");
  useEffect(() => {
    if (!missingKey) return;
    let alive = true;
    loadJevAnswers(missingKey.split(","))
      .then(
        (found) => alive && setJevStore((prev) => new Map([...prev, ...found])),
      )
      .catch(
        (err: unknown) =>
          alive &&
          setLoadError(err instanceof Error ? err.message : String(err)),
      );
    return () => {
      alive = false;
    };
  }, [missingKey]);
  const runs = readRuns(cells, bench, jevStore);
  const ran = Boolean(setId);
  const brand = bench.brand;
  const patchBrand = (p: Partial<BenchState["brand"]>) =>
    setBench((b) => ({ ...b, brand: { ...b.brand, ...p } }));
  const queries = queriesText
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean);
  const canSearch =
    !ran && !busy && Boolean(brand.name.trim() || brand.website.trim());

  const onPlan = () => setQueriesText(defaultQueries(brand).join("\n"));

  const onCast = async () => {
    const plan = queries.length ? queries : defaultQueries(brand);
    if (!queries.length) setQueriesText(plan.join("\n"));
    setBusy(true);
    setRunError(null);
    try {
      const { results, failures } = await castNet(
        post,
        plan,
        bench.pages,
        setNet,
      );
      setBench((b) => ({ ...b, queries: plan, results }));
      if (failures.length)
        setRunError(
          `${failures.length} searches failed: ${failures.slice(0, 3).join(" · ")}`,
        );
    } finally {
      setBusy(false);
    }
  };

  const onJudge = async () => {
    if (!userId) {
      setRunError("Sign in to run the bench.");
      return;
    }
    setBusy(true);
    setRunError(null);
    try {
      // write-target: the bench is filed in the organization the person works in
      const organizationId = await ensureOrgId(null);
      const { setId: id, finished } = await createAndRun(
        dispatch,
        { ...bench, queries },
        userId,
        organizationId,
      );
      void finished.then(
        (error) => error && toast.error(`The run stopped: ${error}`),
      );
      startTransition(() => router.replace(`/agents/battle/smart-add/${id}`));
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onAnswer = async (key: string, answer: ReviewAnswer | null) => {
    if (!setId) return;
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
      const { labelError } = await saveTruth(
        setId,
        key,
        truth,
        runs.jev.conversations.get(key) ?? null,
      );
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
      result: {
        url: r.url,
        title: r.title,
        description: r.description,
        extra_snippets: r.extraSnippets,
      },
      hits: r.hits.map((h) => ({
        engine: h.engine,
        rank: h.rank,
        query: h.query,
      })),
    })),
    choices: (["ours", "about_us", "not_us"] as Truth[]).map((k) => ({
      key: k,
      label: TRUTH_LABEL[k],
      pinned: true,
      description:
        k === "ours"
          ? "The brand runs it"
          : k === "about_us"
            ? "About or tied to the brand"
            : "Someone or something else",
    })),
    answers: Object.fromEntries(
      Object.entries(bench.truth).map(([k, t]) => [
        k,
        { status: "answered", kind: t, sentiment: null } as ReviewAnswer,
      ]),
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
  if (mode === "round")
    return <SmartAddRoundPage setId={setId} modeSwitch={modeSwitch} />;

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ paddingTop: "var(--shell-header-h)" }}
    >
      <BattleHeader
        battleName={
          ran ? `Smart Add bench · ${brand.name || brand.website}` : null
        }
        fallbackTitle="Smart Add bench"
        actions={[
          {
            icon: "SquarePlus",
            label: "Start a new bench",
            onPress: () =>
              startTransition(() => router.push("/agents/battle/smart-add")),
          },
        ]}
      />
      {(runError || loadError) && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <ErrorNotice message={runError ?? loadError ?? ""} size="compact" />
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto" data-matrx-page-scroll>
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4">
          {loading ? (
            <RegionSkeleton />
          ) : !ran ? (
            <>
              {modeSwitch}
              <SetupPanel
              bench={bench}
              patchBrand={patchBrand}
              setBench={setBench}
              queriesText={queriesText}
              setQueriesText={setQueriesText}
              onPlan={onPlan}
              onCast={onCast}
              onJudge={onJudge}
              canSearch={canSearch}
              busy={busy}
              net={net}
              judgesLooked={judgesLooked}
            />
            </>
          ) : (
            <>
              <ProgressStrip
                runs={runs}
                systems={bench.systems}
                results={bench.results.length}
                marked={marked}
              />
              <JudgedBy bench={bench} />
              <div className="flex flex-wrap items-center gap-3">
                <SegmentedControl<View>
                  aria-label="Bench view"
                  value={view}
                  onValueChange={setView}
                  data={[
                    {
                      value: "truth",
                      label: "Mark the truth",
                      count: bench.results.length - marked,
                    },
                    { value: "score", label: "Scoreboard", count: marked },
                  ]}
                />
                <span className="type-caption text-muted-foreground">
                  Answers stay hidden until the scoreboard.
                </span>
              </div>
              {view === "truth" ? (
                <div className="rounded-lg border border-border bg-card min-h-[420px] flex flex-col">
                  <SearchReviewBody session={session} />
                </div>
              ) : (
                <Scoreboard bench={bench} runs={runs} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SetupPanel({
  bench,
  patchBrand,
  setBench,
  queriesText,
  setQueriesText,
  onPlan,
  onCast,
  onJudge,
  canSearch,
  busy,
  net,
  judgesLooked,
}: {
  bench: BenchState;
  patchBrand: (p: Partial<BenchState["brand"]>) => void;
  setBench: React.Dispatch<React.SetStateAction<BenchState>>;
  queriesText: string;
  setQueriesText: (v: string) => void;
  onPlan: () => void;
  onCast: () => void;
  onJudge: () => void;
  canSearch: boolean;
  busy: boolean;
  net: NetProgress | null;
  judgesLooked: boolean;
}) {
  const brand = bench.brand;
  const toggle = (s: SystemKey, on: boolean) =>
    setBench((b) => ({
      ...b,
      systems: on
        ? [...new Set([...b.systems, s])]
        : b.systems.filter((x) => x !== s),
    }));
  const calls =
    queriesText.split("\n").filter((q) => q.trim()).length * 2 * bench.pages;
  return (
    <>
      <section className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
        <h2 className="type-section">A brand you know</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="type-label">Website</span>
            {/* ui-exception: a raw address, not prose */}
            <Field
              value={brand.website}
              onChange={(e) => patchBrand({ website: e.target.value })}
              placeholder="ritualcoffee.com"
              aria-label="Website"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="type-label">Name</span>
            <ProInput
              value={brand.name}
              onChange={(e) => patchBrand({ name: e.target.value })}
              placeholder="Ritual Coffee Roasters"
              aria-label="Brand name"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="type-label">Place</span>
            <ProInput
              value={brand.place}
              onChange={(e) => patchBrand({ place: e.target.value })}
              placeholder="San Francisco, CA"
              aria-label="Place"
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
            />
          </label>
        </div>
        <p className="type-caption text-muted-foreground">
          Every system sees only these facts.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="type-section flex-1">The net</h2>
          <Button variant="quiet" onClick={onPlan} disabled={!canSearch}>
            Suggest searches
          </Button>
        </div>
        <ProTextarea
          value={queriesText}
          onChange={(e) => setQueriesText(e.target.value)}
          placeholder={
            'One search per line, e.g. "Ritual Coffee" San Francisco'
          }
          aria-label="Searches, one per line"
          rows={5}
        />
        <div className="flex flex-wrap items-center gap-3">
          <span className="type-label">Pages per search</span>
          <SegmentedControl<string>
            aria-label="Pages per search"
            value={String(bench.pages)}
            onValueChange={(v) => setBench((b) => ({ ...b, pages: Number(v) }))}
            data={["1", "2", "3", "5"].map((v) => ({ value: v, label: v }))}
          />
          <span className="type-caption text-muted-foreground">
            {calls
              ? `${calls} searches across two engines`
              : "Two engines, every search"}
          </span>
          <Button
            className="ml-auto"
            onClick={onCast}
            disabled={!canSearch}
            icon={<Search className="w-4 h-4" />}
          >
            {busy && net
              ? `Searching ${net.done}/${net.total}`
              : "Cast the net"}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
        <h2 className="type-section">Who judges</h2>
        <div className="flex flex-col gap-2">
          {SYSTEMS.map((s) => {
            const missing =
              s === "reference"
                ? !bench.agents.referenceModel
                : !bench.agents[s];
            return (
              <div key={s} className="flex flex-wrap items-center gap-3">
                <Switch
                  checked={bench.systems.includes(s) && !missing}
                  disabled={missing}
                  onCheckedChange={(v) => toggle(s, v)}
                  aria-label={SYSTEM_LABEL[s]}
                />
                <span className="type-body font-medium w-28">
                  {SYSTEM_LABEL[s]}
                </span>
                <span className="type-caption text-muted-foreground">
                  {SYSTEM_HINT[s]}
                </span>
                {s === "reference" ? (
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
                        systems: modelId
                          ? [
                              ...new Set([
                                ...b.systems,
                                "reference" as SystemKey,
                              ]),
                            ]
                          : b.systems,
                      }))
                    }
                  />
                ) : s === "jev" ? (
                  <>
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
                    {bench.agents.jev ? (
                      <Link
                        href={`/agents/${bench.agents.jev}`}
                        target="_blank"
                        className="type-caption inline-flex items-center gap-1 underline"
                      >
                        Open agent <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : null}
                  </>
                ) : bench.agents[s] ? (
                  <Link
                    href={`/agents/${bench.agents[s]}`}
                    target="_blank"
                    className="type-caption inline-flex items-center gap-1 underline"
                  >
                    Open agent <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : !judgesLooked ? (
                  <span className="type-caption text-muted-foreground">Finding…</span>
                ) : (
                  <span className="type-caption text-destructive">
                    No agent found
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {bench.results.length > 0 ? (
        <section className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h2 className="type-section flex-1">
              {bench.results.length} unique results
            </h2>
            <Button
              onClick={onJudge}
              disabled={busy || bench.systems.length === 0}
              icon={<ListChecks className="w-4 h-4" />}
            >
              {busy ? "Starting…" : `Judge all ${bench.results.length}`}
            </Button>
          </div>
          <ol className="flex flex-col gap-1 max-h-80 overflow-y-auto">
            {bench.results.map((r) => (
              <ResultLine key={r.key} r={r} />
            ))}
          </ol>
        </section>
      ) : (
        <EmptyState
          icon={<Search className="w-5 h-5" />}
          title="No results yet"
          line="Name a brand, then cast the net."
        />
      )}
    </>
  );
}

function JudgedBy({ bench }: { bench: BenchState }) {
  const { holder, jev, referenceModel } = bench.agents;
  return (
    <div className="flex flex-wrap items-center gap-3 type-caption text-muted-foreground">
      <span>Judged by</span>
      {holder && bench.systems.includes("holder") ? (
        <Link
          href={`/agents/${holder}`}
          target="_blank"
          className="inline-flex items-center gap-1 underline"
        >
          {SYSTEM_LABEL.holder} <ExternalLink className="w-3 h-3" />
        </Link>
      ) : null}
      {jev && bench.systems.includes("jev") ? (
        <Link
          href={`/agents/${jev}`}
          target="_blank"
          className="inline-flex items-center gap-1 underline"
        >
          {SYSTEM_LABEL.jev} <ExternalLink className="w-3 h-3" />
        </Link>
      ) : null}
      {referenceModel && bench.systems.includes("reference") ? (
        <span>{SYSTEM_LABEL.reference} on the picked model</span>
      ) : null}
    </div>
  );
}

function ResultLine({ r }: { r: BenchResult }) {
  return (
    <li className="flex items-baseline gap-2 min-w-0">
      <span className="type-caption text-muted-foreground w-10 shrink-0 tabular-nums">
        {r.hits.length}×
      </span>
      <a
        href={r.url}
        target="_blank"
        rel="noreferrer"
        className="type-body truncate hover:underline"
      >
        {r.title || r.url}
      </a>
      <span className="type-caption text-muted-foreground truncate">
        {r.url}
      </span>
    </li>
  );
}

function ProgressStrip({
  runs,
  systems,
  results,
  marked,
}: {
  runs: ReturnType<typeof readRuns>;
  systems: SystemKey[];
  results: number;
  marked: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="neutral">{results} results</Badge>
      <Badge tone={marked ? "primary" : "neutral"}>{marked} marked</Badge>
      {systems.map((s) => {
        const r = runs[s];
        const left = r.calls - r.done - r.failed;
        return (
          <Badge
            key={s}
            tone={r.failed ? "warning" : left > 0 ? "info" : "success"}
          >
            {SYSTEM_LABEL[s]} {r.done}/{r.calls}
            {r.failed ? ` · ${r.failed} failed` : ""}
          </Badge>
        );
      })}
    </div>
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
