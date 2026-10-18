"use client";

/**
 * Battle tab — the agent against a challenger on its own test cases, through the ONE eval runner
 * (`launchBattle` → `POST /agent-tests/runs` with setups; results in `agent.test_result`, shown by
 * the eval's run view). Challenger: the Debrief candidate, another model, or a saved version.
 * The likely cost shows before Run (points; dollars too for admins). A person's vote on each
 * answer is `agent.cmp_response_feedback`. "Keep" saves the candidate as a new live version.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Swords } from "lucide-react";
import { Badge, Button, EmptyState, RegionSkeleton, SegmentedControl, Select } from "@ai-matrx/design-system/controls";
import { ErrorNotice, ReadFailure } from "@ai-matrx/design-system";
import { ModelListDropdown } from "@ai-matrx/agents/models/react";
import { Cost } from "@/components/cost/Cost";
import { fetchTestCaseRows, type TestCaseRow } from "@/features/agent-tests/cases";
import { fetchCaseResults, fetchLatestAgentBattle, fetchRunResults, launchBattle, toCaseView } from "@/features/agent-tests/service";
import { DEFAULT_RUN_OPTIONS, type TestResultView } from "@/features/agent-tests/types";
import { TestRunPanel } from "@/features/agent-tests/components/AgentTestPage";
import { BattleOutcome } from "@/features/agent-tests/components/BattleOutcome";
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
import { battleVerdict, keepLabel, pairwiseBattleVerdict } from "../tab-logic";
import { pairwiseVerdict, type BattleVotes } from "@/features/agent-tests/battle";
import { TabHead, Waiting } from "./StudioTabParts";

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
  /** Runs per case per side; null = the organization's default (knob agent_tests.battle_repeats). */
  const [repeats, setRepeats] = useState<number | null>(null);
  const [defaultRepeats, setDefaultRepeats] = useState<number | null>(null);
  const [votes, setVotes] = useState<BattleVotes>({});
  /** The eval's own run view: open while the battle runs, folded away once it settles (null = follow that). */
  const [detailOpen, setDetailOpen] = useState<boolean | null>(null);

  // A new candidate (Debrief "Try as candidate") becomes the challenger; adjusted while rendering.
  const [seenCandidate, setSeenCandidate] = useState(candidate);
  if (candidate !== seenCandidate) {
    setSeenCandidate(candidate);
    if (candidate) setChallenger("candidate");
    setKept(false);
  }

  // The agent's newest battle comes back on load (and after a reload): its verdict table, not the bare form.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    let live = true;
    void (async () => {
      try {
        const latest = await fetchLatestAgentBattle(agentId);
        if (!latest || !live) return;
        const past = await fetchRunResults(latest.run.id);
        if (!live) return;
        setRunId((cur) => {
          if (cur) return cur;
          setSetups(latest.setups.map((s) => ({ ...s, patch: s.patch ?? {} })) as RunSetupBody[]);
          setResults(past);
          return latest.run.id;
        });
      } catch {
        // The setup form still works; a failed read is not a failed battle.
      }
    })();
    return () => {
      live = false;
    };
  }, [agentId]);

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
      .schema("platform")
      .from("feature_knob")
      .select("value")
      .eq("feature", "agent_tests")
      .eq("key", "battle_repeats")
      .maybeSingle()
      .then(({ data }) => {
        const n = Number((data as { value?: unknown } | null)?.value);
        if (live && Number.isInteger(n) && n > 0) setDefaultRepeats(n);
      });
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
  const runsPerCase = repeats ?? defaultRepeats;
  // Answers: cases × 2 sides × runs; the pairwise judge adds about one cheap call per case × run.
  const estimate = estimateBattleCents(history, caseCount * (runsPerCase ?? 1), 2.5);

  const run = async () => {
    const other = challengerSetup();
    if (!other || !cases) return;
    const next = [liveSetup(agentId), other];
    setLaunching(true);
    setLaunchError(null);
    setResults([]);
    setDetailOpen(null);
    setKept(false);
    setVotes({});
    try {
      const launched = await launchBattle(
        agentId,
        next,
        { ...DEFAULT_RUN_OPTIONS, repeats: repeats ?? undefined },
        cases.map((c) => c.id),
      );
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
  const pairs = pairwiseVerdict(results, votes);
  const verdict = pairs ? pairwiseBattleVerdict(pairs, labelOf) : battleVerdict(score, labelOf);
  const canKeep = (pairs ? pairs.settled : score.settled) && challenger === "candidate" && candidate !== null;
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
              triggerVariant="settings"
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
        <span className="min-w-0 flex-1 text-xs text-muted-foreground" data-testid="studio-battle-cost">
          {/* The cost is the whole line: the runs picker has its own row below, so nothing truncates it. */}
          {caseCount} {caseCount === 1 ? "case" : "cases"} ·{" "}
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
      <div className="flex items-center gap-2" data-testid="studio-battle-repeats-row">
        <span className="text-xs text-muted-foreground">Runs per case</span>
        <SegmentedControl
          aria-label="Runs per case"
          value={String(runsPerCase ?? 1)}
          onValueChange={(v) => setRepeats(Number(v))}
          data={[1, 2, 3].map((n) => ({ value: String(n), label: `×${n}` }))}
          data-testid="studio-battle-repeats"
        />
      </div>
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
              line={verdict.line}
              tone={verdict.tone === "neutral" ? undefined : verdict.tone}
              surface="agent_studio_battle"
              pairwise={pairs}
              votes={votes}
              onVote={(id, rating) => setVotes((v) => ({ ...v, [id]: rating }))}
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
