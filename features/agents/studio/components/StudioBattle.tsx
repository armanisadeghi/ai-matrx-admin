"use client";

/**
 * Battle tab — the agent against a challenger on its own test cases, through the ONE eval runner
 * (`launchBattle` → `POST /agent-tests/runs` with setups; results in `agent.test_result`, shown by
 * the eval's run view). Challenger: the Debrief candidate, another model, or a saved version.
 * The likely cost shows before Run (points; dollars too for admins). A person's vote on each
 * answer is `agent.cmp_response_feedback`. "Keep" saves the candidate as a new live version.
 */

import { useEffect, useState } from "react";
import { Check, Swords, ThumbsDown, ThumbsUp } from "lucide-react";
import { Badge, Button, EmptyState, RegionSkeleton, SegmentedControl, Select } from "@ai-matrx/design-system/controls";
import { ErrorNotice, ReadFailure } from "@ai-matrx/design-system";
import { ModelListDropdown } from "@ai-matrx/agents/models/react";
import { Cost } from "@/components/cost/Cost";
import { ShimmerText } from "@/components/loaders/ShimmerText";
import { fetchTestCaseRows, type TestCaseRow } from "@/features/agent-tests/cases";
import { fetchCaseResults, fetchRunResults, launchBattle, toCaseView } from "@/features/agent-tests/service";
import { DEFAULT_RUN_OPTIONS, type TestResultView } from "@/features/agent-tests/types";
import { VERDICT_META } from "@/features/agent-tests/verdicts";
import { TestRunPanel } from "@/features/agent-tests/components/AgentTestPage";
import { saveFeedback, type FeedbackRating } from "@/features/agents/run-review/responseFeedbackService";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useAppSelector } from "@/lib/redux/hooks";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";
import {
  battleScore,
  candidateSetup,
  estimateBattleCents,
  liveSetup,
  modelSetup,
  versionSetup,
  type RunSetupBody,
  type StudioCandidate,
} from "../battle";
import { battleVerdict, keepLabel } from "../tab-logic";
import { ResultCard, TabHead, Waiting } from "./StudioTabParts";

type Challenger = "candidate" | "model" | "version";

interface VersionOption {
  id: string;
  version_number: number;
}

export function StudioBattle({
  agentId,
  casesVersion,
  candidate,
  onKeep,
  onDiscard,
  onOpenCases,
}: {
  agentId: string;
  casesVersion: number;
  candidate: StudioCandidate | null;
  onKeep: () => Promise<void>;
  onDiscard: () => void;
  /** The way out of "no cases yet": the Cases tab, where one is added. */
  onOpenCases?: () => void;
}) {
  const [challenger, setChallenger] = useState<Challenger>(candidate ? "candidate" : "model");
  const [modelId, setModelId] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [versionId, setVersionId] = useState<string>("");
  const [cases, setCases] = useState<TestCaseRow[] | null>(null);
  const [history, setHistory] = useState<TestResultView[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [setups, setSetups] = useState<RunSetupBody[]>([]);
  const [results, setResults] = useState<TestResultView[]>([]);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<unknown>(null);
  const [keeping, setKeeping] = useState(false);
  const [readError, setReadError] = useState<unknown>(null);
  const [kept, setKept] = useState(false);
  /** The eval's own run view: open while the battle runs, folded away once it settles (null = follow that). */
  const [detailOpen, setDetailOpen] = useState<boolean | null>(null);

  // A new candidate (Debrief "Try as candidate") becomes the challenger; adjusted while rendering.
  const [seenCandidate, setSeenCandidate] = useState(candidate);
  if (candidate !== seenCandidate) {
    setSeenCandidate(candidate);
    if (candidate) setChallenger("candidate");
    setKept(false);
  }

  useEffect(() => {
    let live = true;
    void (async () => {
      let rows: TestCaseRow[];
      try {
        rows = await fetchTestCaseRows(agentId);
      } catch (e) {
        if (live) setReadError(e);
        return;
      }
      if (!live) return;
      setCases(rows);
      const past = await fetchCaseResults(rows.map((r) => r.id)).catch(() => [] as TestResultView[]);
      if (live) setHistory(past);
    })();
    void createClient()
      .schema("agent")
      .from("definition_version")
      .select("id, version_number")
      .eq("agent_id", agentId)
      .order("version_number", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!live) return;
        const rows = (data ?? []) as VersionOption[];
        setVersions(rows);
        if (rows[1]) setVersionId(rows[1].id);
      });
    return () => {
      live = false;
    };
  }, [agentId, casesVersion]);

  const challengerSetup = (): RunSetupBody | null => {
    if (challenger === "candidate") return candidate ? candidateSetup(agentId, candidate) : null;
    if (challenger === "model") return modelId ? modelSetup(agentId, modelId, "Other model") : null;
    const v = versions.find((x) => x.id === versionId);
    return v ? versionSetup(v.id, v.version_number) : null;
  };
  const challengerReady = challengerSetup() !== null;
  const caseCount = cases?.length ?? 0;
  const estimate = estimateBattleCents(history, caseCount, 2);

  const run = async () => {
    const other = challengerSetup();
    if (!other || !cases) return;
    const next = [liveSetup(agentId), other];
    setLaunching(true);
    setLaunchError(null);
    setResults([]);
    setDetailOpen(null);
    setKept(false);
    try {
      const launched = await launchBattle(agentId, next, DEFAULT_RUN_OPTIONS, cases.map((c) => c.id));
      setSetups(next);
      setRunId(launched.runId);
    } catch (e) {
      setLaunchError(e);
    } finally {
      setLaunching(false);
    }
  };

  const readResults = () => {
    if (!runId) return;
    void fetchRunResults(runId)
      .then(setResults)
      .catch(() => undefined);
  };

  const keep = async () => {
    setKeeping(true);
    try {
      await onKeep();
      setKept(true);
      toast.success("Kept as a new version");
    } catch (e) {
      toast.error("The candidate was not kept", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setKeeping(false);
    }
  };

  if (readError) return <ReadFailure what="test cases" error={readError} />;
  if (!cases) return <RegionSkeleton shape="rows" count={3} aria-label="Loading test cases" />;
  if (cases.length === 0) {
    return (
      <EmptyState
        icon={<Swords className="h-5 w-5" />}
        title="No test cases yet"
        line="A battle runs on the agent's cases"
        action={
          onOpenCases ? (
            <Button variant="outline" onClick={onOpenCases}>
              Add a case
            </Button>
          ) : undefined
        }
      />
    );
  }

  const options: { value: Challenger; label: string }[] = [
    ...(candidate ? [{ value: "candidate" as const, label: "Candidate" }] : []),
    { value: "model", label: "Model" },
    { value: "version", label: "Version" },
  ];
  const score = battleScore(results, setups.map((s) => s.key));
  const labelOf = (key: string) => setups.find((s) => s.key === key)?.label ?? key;
  const verdict = battleVerdict(score, labelOf);
  const canKeep = score.settled && challenger === "candidate" && candidate !== null;
  /** One primary action per tab: Keep takes it only when the candidate won. */
  const keepPrimary = canKeep && verdict.keepIsPrimary && !kept;
  const showRunView = detailOpen ?? !score.settled;

  return (
    <div className="flex flex-col gap-2" data-testid="studio-battle">
      <SegmentedControl
        aria-label="Battle against"
        value={challenger}
        onValueChange={(v) => setChallenger(v as Challenger)}
        data={options}
      />
      <div className="flex h-8 items-center" data-testid="studio-challenger">
        {challenger === "candidate" && candidate ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs" data-testid="studio-candidate">
            <Badge tone="info">Candidate</Badge>
            <span className="min-w-0 flex-1 truncate text-foreground">{candidate.title}</span>
            <Button variant="quiet" onClick={onDiscard}>
              Discard
            </Button>
          </div>
        ) : null}
        {challenger === "model" ? (
          <div className="min-w-0 flex-1">
            <ModelListDropdown
              aria-label="Challenger model"
              modelOnly
              inputModalities={["text"]}
              selectionPurpose="agent"
              value={modelId}
              onValueChange={setModelId}
            />
          </div>
        ) : null}
        {challenger === "version" ? (
          versions.length > 1 ? (
            <div className="min-w-0 flex-1">
              <Select
                aria-label="Challenger version"
                value={versionId}
                onValueChange={setVersionId}
                options={versions.map((v) => ({ value: v.id, label: `Version ${v.version_number}` }))}
              />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Only one saved version. Save another to compare</span>
          )
        ) : null}
      </div>
      {/* Cost first, then the one action. */}
      <TabHead className="border-t border-border pt-2" >
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" data-testid="studio-battle-cost">
          {caseCount} {caseCount === 1 ? "case" : "cases"} × 2 ·{" "}
          {estimate !== null ? (
            <>
              About <Cost usd={estimate / 100} short />
            </>
          ) : (
            "Cost not measured yet"
          )}
        </span>
        <Button
          variant={keepPrimary ? "outline" : "primary"}
          icon={<Swords />}
          disabled={!challengerReady || launching}
          onClick={() => void run()}
          data-testid="studio-battle-run"
        >
          {launching ? "Starting…" : runId ? "Run again" : "Run battle"}
        </Button>
      </TabHead>
      {launchError ? (
        <ErrorNotice size="inline" title="The battle did not start" error={launchError} operation="Battle on cases" />
      ) : null}
      {runId ? (
        <>
          {results.length === 0 ? (
            <Waiting text="Running the battle" />
          ) : (
            <BattleOutcome
              results={results}
              cases={cases}
              setups={setups}
              labelOf={labelOf}
              runId={runId}
              verdict={verdict}
              footer={
                canKeep ? (
                  <Button
                    variant={keepPrimary ? "primary" : "outline"}
                    icon={<Check />}
                    disabled={keeping || kept}
                    onClick={() => void keep()}
                    data-testid="studio-battle-keep"
                  >
                    {keepLabel({ kept, keeping, won: verdict.keepIsPrimary })}
                  </Button>
                ) : null
              }
            />
          )}
          <Button variant="quiet" onClick={() => setDetailOpen(!showRunView)} data-testid="studio-battle-run-view-toggle">
            {showRunView ? "Hide the run" : "Show the run"}
          </Button>
          <div className={showRunView ? undefined : "hidden"}>
            <TestRunPanel
              key={runId}
              runId={runId}
              cases={cases.map(toCaseView)}
              declarations={[]}
              seat="user"
              onOpenRun={setRunId}
              onSettled={readResults}
              stacked
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function BattleOutcome({
  results,
  cases,
  setups,
  labelOf,
  runId,
  verdict,
  footer,
}: {
  results: TestResultView[];
  cases: TestCaseRow[];
  setups: RunSetupBody[];
  labelOf: (key: string) => string;
  runId: string;
  verdict: ReturnType<typeof battleVerdict>;
  footer: React.ReactNode;
}) {
  const userId = useAppSelector(selectUserId);
  const [votes, setVotes] = useState<Record<string, FeedbackRating>>({});
  const vote = async (r: TestResultView, rating: FeedbackRating) => {
    if (!userId || !r.conversationId) return;
    try {
      await saveFeedback({
        userId,
        conversationId: r.conversationId,
        requestId: r.userRequestIds[r.userRequestIds.length - 1] ?? null,
        rating,
        comment: null,
        metadata: { surface: "agent_studio_battle", test_run_id: runId, test_result_id: r.id, setup_key: r.setupKey, case_id: r.caseId },
      });
      setVotes((v) => ({ ...v, [r.id]: rating }));
    } catch (e) {
      toast.error("The vote did not save", { description: e instanceof Error ? e.message : String(e) });
    }
  };
  const shown = results.filter((r) => r.door !== "parity");
  const caseIds = [...new Set(shown.map((r) => r.caseId))];
  const caseLabel = (id: string) => cases.find((c) => c.id === id)?.label || "Case";
  return (
    <div className="flex flex-col gap-1.5" data-testid="studio-battle-outcome">
      <ResultCard tone={verdict.tone === "neutral" ? undefined : verdict.tone}>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground" data-testid="studio-battle-winner">
            {verdict.line}
          </span>
          {footer}
        </div>
      </ResultCard>
      {caseIds.map((id) => (
        <ResultCard key={id} data-testid="studio-battle-case">
          <span className="truncate font-medium text-foreground">{caseLabel(id)}</span>
          {setups.map((setup) => {
            const r = shown.find((x) => x.caseId === id && x.setupKey === setup.key);
            if (!r) return null;
            const meta = r.verdict ? VERDICT_META[r.verdict] : null;
            const mine = votes[r.id];
            return (
              <div key={r.id} className="flex h-7 items-center gap-1.5">
                <span className="w-20 shrink-0 truncate text-muted-foreground">{labelOf(r.setupKey)}</span>
                <span className="min-w-0 flex-1">
                  {meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : <ShimmerText text="Judging" />}
                </span>
                <Button
                  variant="quiet"
                  icon={<ThumbsUp className={mine === "up" ? "text-primary" : undefined} />}
                  aria-label={`Good answer, ${labelOf(r.setupKey)}`}
                  aria-pressed={mine === "up"}
                  disabled={!r.conversationId}
                  onClick={() => void vote(r, "up")}
                />
                <Button
                  variant="quiet"
                  icon={<ThumbsDown className={mine === "down" ? "text-destructive" : undefined} />}
                  aria-label={`Bad answer, ${labelOf(r.setupKey)}`}
                  aria-pressed={mine === "down"}
                  disabled={!r.conversationId}
                  onClick={() => void vote(r, "down")}
                />
              </div>
            );
          })}
        </ResultCard>
      ))}
    </div>
  );
}
