"use client";

/**
 * BattleTestsPanel — the battle's checks and its server run (Agent Evaluation PLAN P4), at the top
 * of the Runs comparison window in every mode that has one.
 *
 * - Checks: the first column's agent's test cases and how many checks they carry, with the door
 *   to edit them (the agent's Test page).
 * - Run on server: every case × every column through the ONE eval runner (`launchBattle`), filed
 *   under the saved battle (`comparison_set_id`), so it finishes after the tab closes and the
 *   battle reopens with its newest run.
 * - Pass/fail and Judge per column, then the shared outcome (`BattleOutcome`) and the eval's own
 *   run view — the same pieces Agent Studio's Battle tab shows. Nothing here scores a battle.
 */

import { useEffect, useState } from "react";
import { ClipboardCheck, Server } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { selectAgentIdFromInstance } from "@ai-matrx/chat/agents/redux/execution-system/conversations/conversations.selectors";
import { selectSettingsOverridesForApi } from "@ai-matrx/chat/agents/redux/execution-system/instance-model-overrides/instance-model-overrides.selectors";
import { selectAgentById } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { Cost } from "@/components/cost/Cost";
import { ShimmerText } from "@ai-matrx/design-system";
import { useAppSelector, useAppStore } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import { createClient } from "@/utils/supabase/client";
import { fetchTestCaseRows, type TestCaseRow } from "@/features/agent-tests/cases";
import {
  fetchCaseResults,
  fetchLatestBattleRun,
  fetchRunResults,
  launchBattle,
  toCaseView,
  type BattleSetup,
} from "@/features/agent-tests/service";
import { DEFAULT_RUN_OPTIONS, type TestResultView } from "@/features/agent-tests/types";
import { battleScore, estimateBattleCents, judgeScore, scoreLine } from "@/features/agent-tests/battle";
import { BattleOutcome } from "@/features/agent-tests/components/BattleOutcome";
import { TestRunPanel } from "@/features/agent-tests/components/AgentTestPage";
import { selectActiveBattleColumns, selectMountedBattleSetId, type BattleColumnDescriptor } from "../shared/activeBattleColumns";
import { useCatalogBoundSelector } from "../shared/useCatalogBoundSelector";
import { SYNTHETIC_PREFIX, planBattleTests, withVersionIds, type ColumnFacts } from "../shared/battleTestSetups";
import { openOutbound } from "@ai-matrx/kit/outbound";

function columnFacts(state: RootState, column: BattleColumnDescriptor): ColumnFacts {
  const instanceAgentId = selectAgentIdFromInstance(column.conversationId)(state) ?? null;
  const def = instanceAgentId?.startsWith(SYNTHETIC_PREFIX) ? selectAgentById(state, instanceAgentId) : null;
  return {
    instanceAgentId,
    synthetic: def
      ? {
          messages: [...(def.messages ?? [])],
          settings: { ...((def.settings ?? {}) as Record<string, unknown>) },
          modelId: def.modelId ?? null,
        }
      : null,
    overrides: selectSettingsOverridesForApi(column.conversationId)(state) ?? null,
  };
}

const columnLabel = (c: BattleColumnDescriptor, i: number) => c.label?.trim() || `Column ${i + 1}`;

async function versionIds(setups: readonly { setup: BattleSetup; versionNumber: number | null }[]) {
  const wanted = setups.filter((s) => s.versionNumber !== null);
  const found = new Map<string, string>();
  if (wanted.length === 0) return found;
  const { data, error } = await createClient()
    .schema("agent")
    .from("definition_version")
    .select("id, agent_id, version_number")
    .in("agent_id", [...new Set(wanted.map((s) => s.setup.holder.id))])
    .in("version_number", [...new Set(wanted.map((s) => s.versionNumber as number))]);
  if (error) throw error;
  for (const row of data ?? []) found.set(`${row.agent_id}:${row.version_number}`, row.id);
  return found;
}

export function BattleTestsPanel() {
  const store = useAppStore();
  const columns = useCatalogBoundSelector(selectActiveBattleColumns);
  const mode = useAppSelector((s: RootState) => s.agentComparison.mountedMode);
  const setId = useAppSelector(selectMountedBattleSetId);
  const plan = planBattleTests(mode, columns, (c) => columnFacts(store.getState(), c), columnLabel);
  const caseAgentId = plan.ok ? plan.caseAgentId : null;

  const [cases, setCases] = useState<TestCaseRow[] | null>(null);
  const [history, setHistory] = useState<TestResultView[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [setups, setSetups] = useState<BattleSetup[]>([]);
  const [results, setResults] = useState<TestResultView[]>([]);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<{ what: string; error: unknown } | null>(null);
  const [showRun, setShowRun] = useState(false);

  useEffect(() => {
    if (!caseAgentId) return;
    let live = true;
    void fetchTestCaseRows(caseAgentId)
      .then(async (rows) => {
        if (!live) return;
        setCases(rows);
        const past = await fetchCaseResults(rows.map((r) => r.id)).catch(() => [] as TestResultView[]);
        if (live) setHistory(past);
      })
      .catch((e) => live && setError({ what: "Test cases", error: e }));
    return () => {
      live = false;
    };
  }, [caseAgentId]);

  // A saved battle reopens with its newest server run.
  useEffect(() => {
    if (!setId) return;
    let live = true;
    void fetchLatestBattleRun(setId)
      .then(async (latest) => {
        if (!live || !latest) return;
        setRunId(latest.run.id);
        setSetups(latest.setups);
        const rows = await fetchRunResults(latest.run.id);
        if (live) setResults(rows);
      })
      .catch((e) => live && setError({ what: "Battle run", error: e }));
    return () => {
      live = false;
    };
  }, [setId]);

  const readResults = () => {
    if (!runId) return;
    void fetchRunResults(runId)
      .then(setResults)
      .catch((e) => setError({ what: "Battle results", error: e }));
  };

  const run = async () => {
    if (!plan.ok || !cases || cases.length === 0) return;
    setLaunching(true);
    setError(null);
    try {
      const ids = await versionIds(plan.setups);
      const resolved = withVersionIds(plan.setups, (agentId, n) => ids.get(`${agentId}:${n}`));
      if ("reason" in resolved) throw new Error(resolved.reason);
      const launched = await launchBattle(
        plan.caseAgentId,
        resolved.setups,
        DEFAULT_RUN_OPTIONS,
        cases.map((c) => c.id),
        setId,
      );
      setSetups(resolved.setups);
      setResults([]);
      setRunId(launched.runId);
      setShowRun(true);
    } catch (e) {
      setError({ what: "Run on server", error: e });
    } finally {
      setLaunching(false);
    }
  };

  const caseCount = cases?.length ?? 0;
  const checkCount = (cases ?? []).reduce((n, c) => n + (Array.isArray(c.checks) ? c.checks.length : 0), 0);
  const columnCount = plan.ok ? plan.setups.length : columns.length;
  const estimate = estimateBattleCents(history, caseCount, columnCount);
  const keys = setups.map((s) => s.key);
  const labelOf = (key: string) => setups.find((s) => s.key === key)?.label ?? key;
  const score = battleScore(results, keys);
  const judged = judgeScore(results, keys);

  return (
    <div className="flex flex-col gap-2 border-b border-border p-3 text-xs" data-testid="battle-tests">
      <div className="flex h-8 items-center gap-2">
        <ClipboardCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="font-medium text-foreground">Checks</span>
        {!plan.ok ? (
          <span className="min-w-0 flex-1 truncate text-muted-foreground" data-testid="battle-tests-refused">
            {plan.reason}
          </span>
        ) : cases === null ? (
          <span className="min-w-0 flex-1">
            <ShimmerText text="Reading test cases" />
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-muted-foreground" data-testid="battle-tests-cases">
            {caseCount} {caseCount === 1 ? "case" : "cases"} · {checkCount} {checkCount === 1 ? "check" : "checks"} ·{" "}
            {estimate !== null ? (
              <>
                About <Cost usd={estimate / 100} short />
              </>
            ) : (
              "Cost not measured yet"
            )}
          </span>
        )}
        {caseAgentId ? (
          <Button
            variant="quiet"
            onClick={() => openOutbound(`/agents/${caseAgentId}/test`, "_blank", "noopener")}
            data-testid="battle-tests-edit-cases"
          >
            {caseCount === 0 ? "Add a case" : "Edit cases"}
          </Button>
        ) : null}
        <Button
          variant="primary"
          icon={<Server />}
          disabled={!plan.ok || caseCount === 0 || launching}
          onClick={() => void run()}
          data-testid="battle-tests-run"
        >
          {launching ? "Starting…" : "Run on server"}
        </Button>
      </div>
      {error ? <ErrorNotice size="inline" title={`${error.what} failed`} error={error.error} operation={error.what} /> : null}
      {runId && setups.length > 0 ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1" data-testid="battle-tests-scores">
            <span className="text-muted-foreground">Column</span>
            <span className="text-muted-foreground">Pass/fail</span>
            <span className="text-muted-foreground">Judge</span>
            {score.scores.map((s) => {
              const j = judged.find((x) => x.key === s.key);
              const total = s.pass + s.fail + s.other + s.pending;
              return (
                <div key={s.key} className="contents" data-testid="battle-tests-score">
                  <span className="truncate text-foreground">{labelOf(s.key)}</span>
                  <Badge tone={s.pending > 0 ? "neutral" : s.fail > 0 ? "destructive" : "success"}>
                    {s.pass}/{total}
                  </Badge>
                  <span className="text-muted-foreground">
                    {j && j.judged > 0 ? `${j.holds}/${j.judged} holds${j.format ? ` · ${j.format} format` : ""}` : "Not needed"}
                  </span>
                </div>
              );
            })}
          </div>
          {results.length > 0 ? (
            <BattleOutcome
              results={results}
              cases={cases ?? []}
              setups={setups}
              labelOf={labelOf}
              runId={runId}
              line={scoreLine(score, labelOf)}
              surface="agent_battle_server"
            />
          ) : null}
          <Button variant="quiet" onClick={() => setShowRun(!showRun)} data-testid="battle-tests-run-view-toggle">
            {showRun ? "Hide the run" : "Show the run"}
          </Button>
          <div className={showRun ? undefined : "hidden"}>
            <TestRunPanel
              key={runId}
              runId={runId}
              cases={(cases ?? []).map(toCaseView)}
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
