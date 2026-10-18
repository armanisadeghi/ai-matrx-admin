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
import { Badge, Button, EmptyState, SegmentedControl, Select } from "@ai-matrx/design-system/controls";
import { ErrorNotice, ReadFailure } from "@ai-matrx/design-system";
import { ModelListDropdown } from "@ai-matrx/agents/models/react";
import { Cost } from "@/components/cost/Cost";
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
}: {
  agentId: string;
  casesVersion: number;
  candidate: StudioCandidate | null;
  onKeep: () => Promise<void>;
  onDiscard: () => void;
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
  if (cases && cases.length === 0) {
    return <EmptyState icon={<Swords className="h-5 w-5" />} title="No test cases yet" line="Battles run on the agent's cases" />;
  }

  const options: { value: Challenger; label: string }[] = [
    ...(candidate ? [{ value: "candidate" as const, label: "Candidate" }] : []),
    { value: "model", label: "Model" },
    { value: "version", label: "Version" },
  ];
  const score = battleScore(results, setups.map((s) => s.key));
  const labelOf = (key: string) => setups.find((s) => s.key === key)?.label ?? key;

  return (
    <div className="flex flex-col gap-3" data-testid="studio-battle">
      <SegmentedControl
        aria-label="Battle against"
        value={challenger}
        onValueChange={(v) => setChallenger(v as Challenger)}
        data={options}
      />
      {challenger === "candidate" && candidate ? (
        <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs" data-testid="studio-candidate">
          <Badge tone="info">Candidate</Badge>
          <span className="min-w-0 flex-1 truncate text-foreground">{candidate.title}</span>
          <Button variant="quiet" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      ) : null}
      {challenger === "model" ? (
        <ModelListDropdown
          aria-label="Challenger model"
          modelOnly
          inputModalities={["text"]}
          selectionPurpose="agent"
          value={modelId}
          onValueChange={setModelId}
        />
      ) : null}
      {challenger === "version" ? (
        versions.length > 1 ? (
          <Select
            aria-label="Challenger version"
            value={versionId}
            onValueChange={setVersionId}
            options={versions.map((v) => ({ value: v.id, label: `Version ${v.version_number}` }))}
          />
        ) : (
          <span className="text-xs text-muted-foreground">Only one saved version</span>
        )
      ) : null}
      <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="studio-battle-cost">
        <span>
          {caseCount} {caseCount === 1 ? "case" : "cases"} × 2
        </span>
        <span className="ml-auto">
          {estimate !== null ? (
            <>
              About <Cost usd={estimate / 100} short />
            </>
          ) : (
            "Cost not measured yet"
          )}
        </span>
      </div>
      <Button
        variant="primary"
        icon={<Swords />}
        disabled={!challengerReady || launching || !cases}
        onClick={() => void run()}
        data-testid="studio-battle-run"
      >
        {launching ? "Starting…" : "Battle on cases"}
      </Button>
      {launchError ? (
        <ErrorNotice size="inline" title="The battle did not start" error={launchError} operation="Battle on cases" />
      ) : null}
      {runId ? (
        <>
          <TestRunPanel
            key={runId}
            runId={runId}
            cases={cases?.map(toCaseView) ?? []}
            declarations={[]}
            seat="user"
            onOpenRun={setRunId}
            onSettled={readResults}
            stacked
          />
          {results.length > 0 ? (
            <BattleOutcome
              results={results}
              cases={cases ?? []}
              labelOf={labelOf}
              runId={runId}
              score={score}
            />
          ) : null}
          {score.settled && challenger === "candidate" && candidate ? (
            <Button
              variant={score.winner === "candidate" ? "primary" : "outline"}
              icon={<Check />}
              disabled={keeping || kept}
              onClick={() => void keep()}
              data-testid="studio-battle-keep"
            >
              {kept ? "Kept" : keeping ? "Keeping…" : "Keep candidate"}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function BattleOutcome({
  results,
  cases,
  labelOf,
  runId,
  score,
}: {
  results: TestResultView[];
  cases: TestCaseRow[];
  labelOf: (key: string) => string;
  runId: string;
  score: ReturnType<typeof battleScore>;
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
  const caseLabel = (id: string) => cases.find((c) => c.id === id)?.label || "Case";
  return (
    <div className="flex flex-col gap-1.5" data-testid="studio-battle-outcome">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {score.scores.map((s) => (
          <Badge key={s.key} tone={score.winner === s.key ? "success" : "neutral"}>
            {labelOf(s.key)} {s.pass}/{s.pass + s.fail + s.other + s.pending}
          </Badge>
        ))}
        <span className="text-muted-foreground" data-testid="studio-battle-winner">
          {!score.settled ? "Running" : score.winner ? `${labelOf(score.winner)} wins` : "Tie"}
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {results
          .filter((r) => r.door !== "parity")
          .map((r) => {
            const meta = r.verdict ? VERDICT_META[r.verdict] : null;
            const mine = votes[r.id];
            return (
              <li key={r.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                <span className="min-w-0 flex-1 truncate text-foreground">{caseLabel(r.caseId)}</span>
                <span className="shrink-0 text-muted-foreground">{labelOf(r.setupKey)}</span>
                {meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : null}
                <Button
                  variant="quiet"
                  icon={<ThumbsUp className={mine === "up" ? "text-primary" : undefined} />}
                  aria-label="Good answer"
                  aria-pressed={mine === "up"}
                  disabled={!r.conversationId}
                  onClick={() => void vote(r, "up")}
                />
                <Button
                  variant="quiet"
                  icon={<ThumbsDown className={mine === "down" ? "text-destructive" : undefined} />}
                  aria-label="Bad answer"
                  aria-pressed={mine === "down"}
                  disabled={!r.conversationId}
                  onClick={() => void vote(r, "down")}
                />
              </li>
            );
          })}
      </ul>
    </div>
  );
}

