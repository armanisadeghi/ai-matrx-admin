"use client";

/**
 * Cases tab — the agent's test cases on Agent Evaluation (one store, one runner).
 *
 * Cases are `agent.exemplar` kind='test_case' rows (`features/agent-tests/cases.ts`). "Run all"
 * and each case's Run launch the eval runner (`POST /agent-tests/runs`), and the run shows in the
 * eval's own run view (`TestRunPanel`): checks + the fact judge per result. "Open" runs the
 * case fresh in the center for a look. Everything loads when the tab opens.
 */

import { useEffect, useState } from "react";
import { ExternalLink, FlaskConical, Play, Plus, SquareArrowOutUpRight } from "lucide-react";
import Link from "next/link";
import { Badge, Button, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ErrorNotice, ReadFailure } from "@ai-matrx/design-system";
import { Cost } from "@/components/cost/Cost";
import { fetchAgentContractHead, type AgentContractHead } from "@/features/agents/samples/service";
import { fetchTestCaseRows, type TestCaseRow } from "@/features/agent-tests/cases";
import { fetchCaseResults, launchRun, toCaseView } from "@/features/agent-tests/service";
import { latestByCase } from "@/features/agent-tests/case-grid";
import { VERDICT_META } from "@/features/agent-tests/verdicts";
import { DEFAULT_RUN_OPTIONS, type TestResultView } from "@/features/agent-tests/types";
import { TestCaseForm } from "@/features/agent-tests/components/TestCaseForm";
import { TestRunPanel } from "@/features/agent-tests/components/AgentTestPage";
import { estimateBattleCents } from "../battle";
import { caseInputs } from "../tab-logic";
import { StudioInputPills } from "./StudioInputPills";
import { TabHead, Waiting } from "./StudioTabParts";

interface CasesData {
  rows: TestCaseRow[];
  head: AgentContractHead | null;
  latest: Map<string, TestResultView>;
  /** Every past result of these cases (the cost of Run all is measured from them). */
  history: TestResultView[];
}

export function StudioCases({
  agentId,
  casesVersion,
  onUseCase,
}: {
  agentId: string;
  casesVersion: number;
  onUseCase: (row: TestCaseRow) => void;
}) {
  const [data, setData] = useState<CasesData | null>(null);
  const [readError, setReadError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);
  const [adding, setAdding] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [launching, setLaunching] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<unknown>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [rows, head] = await Promise.all([fetchTestCaseRows(agentId), fetchAgentContractHead(agentId)]);
        const results = await fetchCaseResults(rows.map((r) => r.id));
        if (live) setData({ rows, head, latest: latestByCase(results), history: results });
      } catch (e) {
        if (live) setReadError(e);
      }
    })();
    return () => {
      live = false;
    };
  }, [agentId, casesVersion, nonce]);

  const reread = () => setNonce((n) => n + 1);

  const run = async (key: string, caseIds?: string[]) => {
    setLaunching(key);
    setLaunchError(null);
    try {
      const launched = await launchRun(agentId, DEFAULT_RUN_OPTIONS, caseIds);
      setRunId(launched.runId);
    } catch (e) {
      setLaunchError(e);
    } finally {
      setLaunching(null);
    }
  };

  if (readError) return <ReadFailure what="test cases" error={readError} />;
  if (!data) return <RegionSkeleton shape="rows" count={4} aria-label="Loading test cases" />;

  const { rows, head, latest, history } = data;
  const estimate = estimateBattleCents(history, rows.length, 1);
  const declarations = (head?.variableDeclarations ?? []).map((d) => ({
    name: d.name,
    ...(d.label ? { label: d.label } : {}),
    ...(d.helpText ? { helpText: d.helpText } : {}),
  }));
  return (
    <div className="flex flex-col gap-2" data-testid="studio-cases">
      <TabHead>
        <Button
          variant="primary"
          icon={<Play />}
          disabled={rows.length === 0 || launching !== null}
          onClick={() => void run("all")}
          data-testid="studio-cases-run-all"
        >
          {launching === "all" ? "Starting…" : rows.length > 1 ? `Run all ${rows.length}` : "Run all"}
        </Button>
        {rows.length > 0 ? (
          <span className="min-w-0 truncate text-xs text-muted-foreground" data-testid="studio-cases-cost">
            {estimate !== null ? (
              <>
                About <Cost usd={estimate / 100} short />
              </>
            ) : (
              "Cost not measured yet"
            )}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-0.5">
          {!adding ? <Button variant="quiet" icon={<Plus />} aria-label="Add a case" title="Add a case" onClick={() => setAdding(true)} /> : null}
          <Link
            href={`/agents/${agentId}/test`}
            target="_blank"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="All runs on the test page"
            title="All runs on the test page"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </span>
      </TabHead>
      {launchError ? (
        <ErrorNotice size="inline" title="The run did not start" error={launchError} operation="Run agent tests" />
      ) : null}
      {adding ? (
        <TestCaseForm
          agentId={agentId}
          head={head}
          onCreated={() => {
            setAdding(false);
            reread();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : null}
      {rows.length === 0 && !adding ? (
        <EmptyState
          icon={<FlaskConical />}
          title="No test cases yet"
          line="Save a run as a test case, or write one"
          action={
            <Button variant="outline" icon={<Plus />} onClick={() => setAdding(true)}>
              Add a case
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => {
            const result = latest.get(row.id);
            const meta = result?.verdict ? VERDICT_META[result.verdict] : null;
            const inputs = caseInputs(row.variables, declarations);
            return (
              <li
                key={row.id}
                className="flex min-h-8 flex-col justify-center gap-1 rounded-md border border-border px-2 py-0.5"
                data-testid="studio-case"
              >
                <div className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{row.label || "Untitled case"}</span>
                  {meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : <span className="text-[11px] text-muted-foreground">Not run</span>}
                  <Button
                    variant="quiet"
                    icon={<SquareArrowOutUpRight />}
                    aria-label="Open in the center"
                    title="Open in the center"
                    onClick={() => onUseCase(row)}
                  />
                  <Button
                    variant="quiet"
                    icon={<Play />}
                    aria-label="Run this case"
                    title="Run this case"
                    disabled={launching !== null}
                    onClick={() => void run(row.id, [row.id])}
                  />
                </div>
                {inputs.length > 0 ? (
                  <div className="pb-0.5">
                    <StudioInputPills definitions={inputs} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {launching && runId === null ? <Waiting text="Starting the run" /> : null}
      {runId ? (
        <TestRunPanel
          key={runId}
          runId={runId}
          cases={rows.map(toCaseView)}
          declarations={head?.variableDeclarations ?? []}
          seat="user"
          onOpenRun={setRunId}
          onSettled={reread}
          stacked
        />
      ) : null}
    </div>
  );
}
