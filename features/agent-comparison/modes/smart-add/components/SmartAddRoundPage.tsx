"use client";

/**
 * Smart Add truth bench — "Real round" tab. Name a brand you know, run ONE real Smart Add round,
 * replay its per-round judgments (is this account ours, business or person, we think) through Jev,
 * mark the truth blind, read the per-judgment scoreboard. FEATURE.md beside the mode folder.
 */

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ErrorNotice } from "@ai-matrx/design-system";
import { ListChecks, Play, SquareArrowOutUpRight } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  RegionSkeleton,
  SegmentedControl,
  Select,
  Switch,
} from "@ai-matrx/design-system/controls";
import { formatDurationMs } from "@ai-matrx/kit/format";
import { Cost } from "@/components/cost/Cost";
import { ProInput } from "@/components/official/ProInput";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { toast } from "@/lib/toast";
import { BattleHeader } from "@/features/agent-comparison/shared/BattleHeader";
import { runHref } from "@/features/workflow-runtime/run-doors";
import { loadComparisonSet } from "../../../service/comparisonSetsService";
import { listMatrixEntries } from "../../matrix/service";
import { entryToCell } from "../../matrix/model";
import type { MatrixCell } from "../../matrix/types";
import {
  CANT_TELL,
  COSTLY,
  JUDGMENTS,
  JUDGMENT_LABEL,
  ROUND_SYSTEM_LABEL,
  TRUTH_OPTIONS,
  emptyRoundBench,
  holderCallsFor,
  jevCallsFor,
  readJevRun,
  readRoundBench,
  readSteps,
  roundCellsToRun,
  buildRoundSetup,
  scoreRound,
  type DecisionAnswers,
  type HolderCall,
  type Judgment,
  type JevRun,
  type RoundAnswer,
  type RoundBench,
  type RoundItem,
  type RoundSystem,
  type RoundTruth,
} from "../round-model";
import {
  TERMINAL_RUN,
  captureAndRunJev,
  labelJevAnswer,
  loadDecisionAnswers,
  loadRoundEvents,
  loadRunStatus,
  resolveRoundJudges,
  runJevCells,
  saveRoundTruth,
  startRoundBench,
} from "../round-service";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

const POLL_MS = 3000;
const SYSTEMS: RoundSystem[] = ["holder", "jev"];

type View = "truth" | "score";

const errText = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

function answerLabel(
  judgment: Judgment,
  a: RoundAnswer | null | undefined,
): string {
  if (!a) return "No answer";
  if (a.value === CANT_TELL) return "Can't tell";
  return (
    TRUTH_OPTIONS[judgment].find((o) => o.value === a.value)?.label ?? a.value
  );
}

export function SmartAddRoundPage({
  setId = null,
  modeSwitch,
}: {
  setId?: string | null;
  /** The Wide net | Real round control, shown on a new bench. */
  modeSwitch?: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const userId = useAppSelector(selectUserId);
  const [bench, setBench] = useState<RoundBench>(emptyRoundBench);
  const [cells, setCells] = useState<MatrixCell[]>([]);
  const [loading, setLoading] = useState(Boolean(setId));
  const [error, setError] = useState<string | null>(null);
  // A saved round that could not be read shows only its error, never an empty bench.
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<HolderCall[]>([]);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [view, setView] = useState<View>("truth");
  const [, startTransition] = useTransition();
  const capturing = useRef(false);
  const [jevStarting, setJevStarting] = useState(false);

  // Open a saved round.
  useEffect(() => {
    if (!setId) return;
    let alive = true;
    loadComparisonSet(setId)
      .then(({ set, entries }) => {
        if (!alive) return;
        const saved = readRoundBench(
          set.metadata as Record<string, unknown> | null,
        );
        if (!saved)
          throw new Error("This saved battle is not a Smart Add round.");
        setBench(saved);
        setRunStatus(saved.runStatus);
        const now = Date.now();
        setCells(
          entries
            .map((e) => entryToCell(e, now))
            .filter((c): c is MatrixCell => c !== null),
        );
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setLoadFailed(true);
        setError(errText(err));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [setId]);

  // Who judges, from data: each Jev decision agent by its tags — only once the person is known
  // (a read sent before sign-in hydrates goes out as anon and finds nothing).
  const [judgesLooked, setJudgesLooked] = useState(false);
  useEffect(() => {
    if (setId || !userId) return;
    let alive = true;
    resolveRoundJudges()
      .then(
        (j) =>
          alive &&
          setBench((b) => ({
            ...b,
            agents: j.agents,
            relationOptions: j.relationOptions,
          })),
      )
      .catch((err: unknown) => alive && setError(errText(err)))
      .finally(() => alive && setJudgesLooked(true));
    return () => {
      alive = false;
    };
  }, [setId, userId]);

  // While the round runs: watch its steps; once it ends, capture it and start Jev (once — the
  // capture is also claimed in the saved row, so a second page never starts Jev twice).
  const waiting = Boolean(setId && bench.runId && !bench.captured && !loading);
  useEffect(() => {
    if (!waiting || !setId || !bench.runId) return undefined;
    const runId = bench.runId;
    let alive = true;
    const tick = async () => {
      try {
        const [status, events] = await Promise.all([
          loadRunStatus(runId),
          loadRoundEvents(runId),
        ]);
        if (!alive) return;
        setRunStatus(status);
        setSteps(readSteps(events).map((s) => s.call));
        if (status && TERMINAL_RUN.has(status) && !capturing.current) {
          capturing.current = true;
          const organizationId = await ensureOrgId(null);
          setJevStarting(true);
          const { bench: next, finished } = await captureAndRunJev(
            dispatch,
            setId,
            bench,
            status,
            organizationId,
          );
          void finished.then((e) => {
            setJevStarting(false);
            if (e) toast.error(`Jev's run stopped: ${e}`);
          });
          if (!alive) return;
          setBench(next);
        }
      } catch (err) {
        capturing.current = false;
        setJevStarting(false);
        if (alive) setError(errText(err));
      }
    };
    void tick();
    const t = setInterval(() => void tick(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [waiting, setId, bench, dispatch]);

  // Jev's cells while any is queued or running, or while a start is in flight.
  const live = cells.some(
    (c) => (c.status === "queued" || c.status === "running") && !c.stalled,
  );
  useEffect(() => {
    if (!setId || !bench.captured || (!live && !jevStarting)) return undefined;
    const t = setInterval(() => {
      listMatrixEntries(setId)
        .then((rows) => {
          const now = Date.now();
          setCells(
            rows
              .map((e) => entryToCell(e, now))
              .filter((c): c is MatrixCell => c !== null),
          );
        })
        .catch((err: unknown) => setError(errText(err)));
    }, POLL_MS);
    return () => clearInterval(t);
  }, [setId, bench.captured, live, jevStarting]);

  // Jev's answers from the answer store, for finished cells that carry no answer text.
  const [store, setStore] = useState<Map<string, DecisionAnswers>>(new Map());
  const missingKey = cells
    .filter(
      (c) =>
        c.status === "completed" &&
        c.conversationId &&
        !c.result?.answer &&
        !store.has(c.conversationId),
    )
    .map((c) => c.conversationId)
    .join(",");
  useEffect(() => {
    if (!missingKey) return;
    let alive = true;
    loadDecisionAnswers(missingKey.split(","))
      .then(
        (found) => alive && setStore((prev) => new Map([...prev, ...found])),
      )
      .catch((err: unknown) => alive && setError(errText(err)));
    return () => {
      alive = false;
    };
  }, [missingKey]);

  const jev = readJevRun(cells, bench.items, store);
  const brand = bench.brand;
  const patchBrand = (p: Partial<RoundBench["brand"]>) =>
    setBench((b) => ({ ...b, brand: { ...b.brand, ...p } }));
  const missingAgents = JUDGMENTS.filter((j) => !bench.agents[j]);

  // Each mark labels Jev's answer once Jev's cell has finished — a mark made while Jev was still
  // running is labeled when the answer lands. The label door is idempotent; each pair goes once per visit.
  const labelled = useRef(new Set<string>());
  const pending = bench.items.flatMap((item) => {
    const t = bench.truth[item.id];
    const conv = jev.conversations.get(item.id);
    if (!t || !conv || jev.status.get(item.id) !== "completed") return [];
    return [
      {
        item,
        t,
        conv,
        key: `${item.id}|${conv}|${t.value}|${t.relation ?? ""}`,
      },
    ];
  });
  // Every labelable pair; the effect skips the ones already sent this visit.
  const pendingKey = pending.map((x) => x.key).join(",");
  const labelPending = useEffectEvent(() => {
    for (const { item, t, conv, key } of pending) {
      if (labelled.current.has(key)) continue;
      labelled.current.add(key);
      void labelJevAnswer(item, t, conv).then(
        (problem) => problem && toast.error(problem),
      );
    }
  });
  useEffect(() => {
    if (pendingKey) labelPending();
  }, [pendingKey]);

  // Items Jev never started (the page closed between capture and start, or the start failed).
  const cellRows = new Set(cells.map((c) => c.rowId));
  const notStarted = bench.captured
    ? roundCellsToRun(buildRoundSetup(bench)).filter(
        (c) => !cellRows.has(c.row_id),
      )
    : [];
  const onRunLeft = async () => {
    if (!setId) return;
    setJevStarting(true);
    try {
      const organizationId = await ensureOrgId(null);
      const e = await runJevCells(dispatch, setId, organizationId, notStarted);
      if (e) toast.error(`Jev's run stopped: ${e}`);
    } catch (err) {
      setError(errText(err));
    } finally {
      setJevStarting(false);
    }
  };

  const onStart = async () => {
    if (!userId) {
      setError("Sign in to run a round.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // write-target: the round and its bench are filed in the organization the person works in
      const organizationId = await ensureOrgId(null);
      const id = await startRoundBench(dispatch, bench, userId, organizationId);
      startTransition(() => router.replace(`/agents/battle/smart-add/${id}`));
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const onMark = async (item: RoundItem, truth: RoundTruth | null) => {
    if (!setId) return;
    const before = bench.truth[item.id] ?? null;
    const apply = (t: RoundTruth | null) =>
      setBench((b) => {
        const next = { ...b.truth };
        if (t) next[item.id] = t;
        else delete next[item.id];
        return { ...b, truth: next };
      });
    apply(truth);
    try {
      await saveRoundTruth(setId, item.id, truth);
    } catch (err) {
      apply(before);
      toast.error(`The mark was not saved: ${errText(err)}`);
    }
  };

  const marked = Object.keys(bench.truth).length;

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ paddingTop: "var(--shell-header-h)" }}
    >
      <BattleHeader
        battleName={
          setId ? `Smart Add round · ${brand.name || brand.website}` : null
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
      {error && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <ErrorNotice message={error} size="compact" />
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto" data-matrx-page-scroll>
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4">
          {loading ? (
            <RegionSkeleton />
          ) : loadFailed ? null : !setId ? (
            <>
              {modeSwitch}
              <section className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
                <h2 className="type-title">A brand you know</h2>
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
                    <span className="type-label">
                      Accounts you know are theirs
                    </span>
                    {/* ui-exception: raw addresses, comma separated */}
                    <Field
                      value={brand.accounts}
                      onChange={(e) => patchBrand({ accounts: e.target.value })}
                      placeholder="instagram.com/ritualcoffee"
                      aria-label="Known accounts"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="type-label">Started as</span>
                  <SegmentedControl<RoundBench["brand"]["entryKind"]>
                    aria-label="Started as"
                    value={brand.entryKind}
                    onValueChange={(v) => patchBrand({ entryKind: v })}
                    data={[
                      { value: "company", label: "Business" },
                      { value: "person", label: "Person" },
                    ]}
                  />
                  <Button
                    className="ml-auto"
                    onClick={onStart}
                    disabled={
                      busy ||
                      !(brand.name.trim() || brand.website.trim()) ||
                      missingAgents.length === JUDGMENTS.length
                    }
                    icon={<Play className="w-4 h-4" />}
                  >
                    {busy ? "Starting…" : "Run a real round"}
                  </Button>
                </div>
              </section>
              <section className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
                <h2 className="type-title">Jev replays</h2>
                {JUDGMENTS.map((j) => (
                  <div key={j} className="flex flex-wrap items-center gap-3">
                    <span className="type-body font-medium w-48">
                      {JUDGMENT_LABEL[j]}
                    </span>
                    {bench.agents[j] ? (
                      <Link
                        href={`/agents/${bench.agents[j]}`}
                        target="_blank"
                        className="type-secondary inline-flex items-center gap-1 underline"
                      >
                        Open agent <SquareArrowOutUpRight className="w-3.5 h-3.5" aria-hidden />
                      </Link>
                    ) : !judgesLooked && !setId ? (
                      <span className="type-secondary text-muted-foreground">Finding…</span>
                    ) : (
                      <span className="type-secondary text-destructive">
                        No agent found
                      </span>
                    )}
                  </div>
                ))}
              </section>
            </>
          ) : !bench.captured ? (
            <RoundProgress
              status={runStatus}
              steps={steps}
              runId={bench.runId}
            />
          ) : (
            <>
              <RoundStrip bench={bench} jev={jev} marked={marked} />
              {notStarted.length > 0 && !live && !jevStarting ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="type-body">
                    Jev has not started on {notStarted.length} items.
                  </span>
                  <Button
                    onClick={onRunLeft}
                    icon={<Play className="w-4 h-4" />}
                  >
                    Run Jev on them
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <SegmentedControl<View>
                  aria-label="Bench view"
                  value={view}
                  onValueChange={setView}
                  data={[
                    {
                      value: "truth",
                      label: "Mark the truth",
                      count: bench.items.length - marked,
                    },
                    { value: "score", label: "Scoreboard", count: marked },
                  ]}
                />
                <span className="type-secondary text-muted-foreground">
                  Answers stay hidden until the scoreboard.
                </span>
              </div>
              {bench.items.length === 0 ? (
                <EmptyState
                  icon={<ListChecks className="w-5 h-5" />}
                  title="Nothing to judge this round"
                  line="No judgment step ran this round."
                />
              ) : view === "truth" ? (
                <TruthList bench={bench} onMark={onMark} />
              ) : (
                <RoundScoreboard bench={bench} jev={jev} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function stepTone(s: HolderCall): "success" | "destructive" | "info" {
  return s.status === "completed"
    ? "success"
    : s.status === "failed"
      ? "destructive"
      : "info";
}

function RoundProgress({
  status,
  steps,
  runId,
}: {
  status: string | null;
  steps: HolderCall[];
  runId: string | null;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="type-title flex-1">The round is running</h2>
        <Badge tone="info">{status ?? "starting"}</Badge>
        {runId ? (
          <Link
            href={runHref(runId)}
            target="_blank"
            className="type-secondary inline-flex items-center gap-1 underline"
          >
            Open run <SquareArrowOutUpRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.length === 0 ? (
          <span className="type-secondary text-muted-foreground">
            No judgment step has started yet.
          </span>
        ) : (
          steps.map((s) => (
            <Badge key={s.step} tone={stepTone(s)}>
              {s.step} · {s.status}
            </Badge>
          ))
        )}
      </div>
      <RegionSkeleton />
    </section>
  );
}

function RoundStrip({
  bench,
  jev,
  marked,
}: {
  bench: RoundBench;
  jev: JevRun;
  marked: number;
}) {
  const ran = bench.items.filter((i) => bench.agents[i.judgment]).length;
  const done = [...jev.status.values()].filter((s) => s === "completed").length;
  const failed = [...jev.status.values()].filter(
    (s) => s === "failed" || s === "cancelled",
  ).length;
  const holderFailed = bench.holderCalls.filter((c) => c.status === "failed");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{bench.items.length} items</Badge>
        <Badge tone={marked ? "primary" : "neutral"}>{marked} marked</Badge>
        <Badge tone={bench.runStatus === "completed" ? "success" : "warning"}>
          Round {bench.runStatus ?? "unknown"}
        </Badge>
        <Badge tone={failed ? "warning" : done < ran ? "info" : "success"}>
          Jev {done}/{ran}
          {failed ? ` · ${failed} failed` : ""}
        </Badge>
        {JUDGMENTS.map((j) => {
          const n = bench.items.filter((i) => i.judgment === j).length;
          return (
            <Badge key={j} tone={n ? "neutral" : "warning"}>
              {JUDGMENT_LABEL[j]} {n ? n : "did not run"}
            </Badge>
          );
        })}
        {bench.unreadable.length ? (
          <Badge tone="warning">
            {bench.unreadable.length} steps unreadable
          </Badge>
        ) : null}
        {bench.runId ? (
          <Link
            href={runHref(bench.runId)}
            target="_blank"
            className="type-secondary inline-flex items-center gap-1 underline"
          >
            Open round <SquareArrowOutUpRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
      {holderFailed.length ? (
        <ErrorNotice
          size="compact"
          message={`Today's AI failed ${holderFailed.length} step${holderFailed.length === 1 ? "" : "s"}: ${(holderFailed[0].error ?? "no reason").slice(0, 140)}`}
        />
      ) : null}
    </div>
  );
}

function TruthList({
  bench,
  onMark,
}: {
  bench: RoundBench;
  onMark: (item: RoundItem, t: RoundTruth | null) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {JUDGMENTS.map((j) => {
        const items = bench.items.filter((i) => i.judgment === j);
        if (!items.length) return null;
        return (
          <section key={j} className="flex flex-col gap-2">
            <h2 className="type-title">{JUDGMENT_LABEL[j]}</h2>
            <ol className="rounded-lg border border-border bg-card divide-y divide-border">
              {items.map((item) => {
                const t = bench.truth[item.id] ?? null;
                return (
                  <li
                    key={item.id}
                    className="p-3 flex flex-col gap-2 md:flex-row md:items-start"
                  >
                    <div className="min-w-0 flex-1">
                      {item.url ? (
                        <OutboundLink
                          href={item.url}
                          className="type-body font-medium hover:underline break-words inline-flex items-center gap-1.5"
                        >
                          {item.title}
                          <SquareArrowOutUpRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        </OutboundLink>
                      ) : (
                        <div className="type-body font-medium break-words">
                          {item.title}
                        </div>
                      )}
                      {item.url ? (
                        <div className="type-secondary text-muted-foreground break-all">
                          {item.url}
                        </div>
                      ) : null}
                      {item.detail ? (
                        <div className="type-secondary text-muted-foreground whitespace-pre-wrap line-clamp-6">
                          {item.detail}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <SegmentedControl<string>
                        aria-label={`Truth for ${item.title}`}
                        value={t?.value ?? null}
                        onValueChange={(v) =>
                          onMark(item, t?.value === v ? null : { value: v })
                        }
                        data={TRUTH_OPTIONS[j]}
                      />
                      {j === "identity" &&
                      t?.value === "not_ours" &&
                      bench.relationOptions.length ? (
                        <Select<string>
                          aria-label="How it relates"
                          value={t.relation ?? ""}
                          onValueChange={(v) =>
                            onMark(item, {
                              value: "not_ours",
                              relation: v || null,
                            })
                          }
                          options={[
                            { value: "", label: "How it relates" },
                            ...bench.relationOptions.map((r) => ({
                              value: r,
                              label: r.replace(/_/g, " "),
                            })),
                          ]}
                        />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function RoundScoreboard({ bench, jev }: { bench: RoundBench; jev: JevRun }) {
  const [onlySplit, setOnlySplit] = useState(true);
  const marked = Object.keys(bench.truth).length;
  if (!marked) {
    return (
      <EmptyState
        icon={<ListChecks className="w-5 h-5" />}
        title="Nothing marked yet"
        line="Mark items first; the score counts only those."
      />
    );
  }
  const answerOf = (s: RoundSystem, item: RoundItem) =>
    s === "holder" ? item.holder : jev.answers.get(item.id);
  const rows = bench.items.filter((i) => bench.truth[i.id]);
  const shown = onlySplit
    ? rows.filter((i) =>
        SYSTEMS.some((s) => answerOf(s, i)?.value !== bench.truth[i.id].value),
      )
    : rows;
  return (
    <div className="flex flex-col gap-4">
      {JUDGMENTS.map((j) => {
        const holderCalls = holderCallsFor(bench, j);
        const scores = SYSTEMS.map((s) => ({
          s,
          sc: scoreRound(
            j,
            bench.items,
            bench.truth,
            (item) => answerOf(s, item),
            s === "holder" ? holderCalls : jevCallsFor(jev, bench.items, j),
          ),
        }));
        if (!scores[0].sc.marked) return null;
        return (
          <section key={j} className="flex flex-col gap-2">
            <h2 className="type-title">{JUDGMENT_LABEL[j]}</h2>
            <div className="rounded-lg border border-border bg-card overflow-x-auto">
              <table className="w-full type-body tabular-nums whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border text-left type-label text-muted-foreground">
                    <th className="p-2">System</th>
                    <th className="p-2 text-right">Right</th>
                    <th className="p-2 text-right">Wrong</th>
                    <th className="p-2 text-right">Can't tell</th>
                    <th className="p-2 text-right">No answer</th>
                    <th className="p-2 text-right">{COSTLY[j][0]}</th>
                    <th className="p-2 text-right">{COSTLY[j][1]}</th>
                    <th className="p-2 text-right">Typical call</th>
                    <th className="p-2 text-right">Slow call</th>
                    <th className="p-2 text-right">Calls</th>
                    <th className="p-2 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map(({ s, sc }) => (
                    <tr
                      key={s}
                      className="border-b border-border last:border-0"
                    >
                      <td className="p-2 font-medium">
                        {ROUND_SYSTEM_LABEL[s]}
                      </td>
                      <td className="p-2 text-right">
                        {sc.right}/{sc.marked} (
                        {Math.round((100 * sc.right) / Math.max(1, sc.marked))}
                        %)
                      </td>
                      <td className="p-2 text-right">{sc.wrong}</td>
                      <td className="p-2 text-right">{sc.cantTell}</td>
                      <td className="p-2 text-right">{sc.missing}</td>
                      <td className="p-2 text-right">{sc.costly[0]}</td>
                      <td className="p-2 text-right">{sc.costly[1]}</td>
                      <td className="p-2 text-right">
                        {formatDurationMs(sc.p50, { style: "compact" })}
                      </td>
                      <td className="p-2 text-right">
                        {formatDurationMs(sc.p90, { style: "compact" })}
                      </td>
                      <td className="p-2 text-right">{sc.calls}</td>
                      <td className="p-2 text-right">
                        <Cost usd={sc.cost} short />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      <div className="flex items-center gap-2">
        <Switch
          checked={onlySplit}
          onCheckedChange={setOnlySplit}
          aria-label="Only items a system got wrong"
        />
        <span className="type-body">Only items a system got wrong</span>
        <span className="type-secondary text-muted-foreground ml-auto">
          {shown.length} shown
        </span>
      </div>
      {shown.length > 0 ? (
        <ol className="rounded-lg border border-border bg-card divide-y divide-border">
          {shown.map((item) => {
            const t = bench.truth[item.id];
            const holderConv =
              bench.holderCalls.find((c) => c.step === item.step)
                ?.conversationId ?? null;
            return (
              <li
                key={item.id}
                className="p-3 grid gap-2 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] items-start"
              >
                <div className="min-w-0">
                  <div className="type-label text-muted-foreground">
                    {JUDGMENT_LABEL[item.judgment]}
                  </div>
                  {item.url ? (
                    <OutboundLink
                      href={item.url}
                      className="type-body font-medium hover:underline break-words inline-flex items-center gap-1.5"
                    >
                      {item.title}
                      <SquareArrowOutUpRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    </OutboundLink>
                  ) : (
                    <div className="type-body font-medium break-words">
                      {item.title}
                    </div>
                  )}
                </div>
                <div>
                  <div className="type-label text-muted-foreground">Truth</div>
                  <div className="type-body font-medium">
                    {TRUTH_OPTIONS[item.judgment].find(
                      (o) => o.value === t.value,
                    )?.label ?? t.value}
                  </div>
                  {t.relation ? (
                    <div className="type-secondary text-muted-foreground">
                      {t.relation.replace(/_/g, " ")}
                    </div>
                  ) : null}
                </div>
                {SYSTEMS.map((s) => {
                  const a = answerOf(s, item);
                  const ok = a?.value === t.value;
                  const conv =
                    s === "jev" ? jev.conversations.get(item.id) : holderConv;
                  return (
                    <div key={s} className="min-w-0">
                      <div className="type-label text-muted-foreground">
                        {ROUND_SYSTEM_LABEL[s]}
                      </div>
                      <div
                        className={
                          ok
                            ? "type-body"
                            : "type-body text-destructive font-medium"
                        }
                      >
                        {answerLabel(item.judgment, a)}
                      </div>
                      <div className="type-secondary text-muted-foreground break-words">
                        {[
                          a?.detail,
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
                              className="underline inline-flex items-center gap-1"
                            >
                              run <SquareArrowOutUpRight className="w-3 h-3" aria-hidden />
                            </Link>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
