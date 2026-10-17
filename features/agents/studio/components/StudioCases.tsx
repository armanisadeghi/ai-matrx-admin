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
import { fetchAgentContractHead, type AgentContractHead } from "@/features/agents/samples/service";
import { fetchTestCaseRows, type TestCaseRow } from "@/features/agent-tests/cases";
import { fetchCaseResults, launchRun, toCaseView } from "@/features/agent-tests/service";
import { latestByCase } from "@/features/agent-tests/case-grid";
import { VERDICT_META } from "@/features/agent-tests/verdicts";
import { DEFAULT_RUN_OPTIONS, type TestResultView } from "@/features/agent-tests/types";
import { TestCaseForm } from "@/features/agent-tests/components/TestCaseForm";
import { TestRunPanel } from "@/features/agent-tests/components/AgentTestPage";

interface CasesData {
  rows: TestCaseRow[];
  head: AgentContractHead | null;
  latest: Map<string, TestResultView>;
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
        if (live) setData({ rows, head, latest: latestByCase(results) });
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

  const { rows, head, latest } = data;
  return (
    <div className="flex flex-col gap-3" data-testid="studio-cases">
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          icon={<Play />}
          disabled={rows.length === 0 || launching !== null}
          onClick={() => void run("all")}
          data-testid="studio-cases-run-all"
        >
          {launching === "all" ? "Starting…" : rows.length > 1 ? `Run all ${rows.length}` : "Run"}
        </Button>
        {!adding ? (
          <Button variant="quiet" icon={<Plus />} onClick={() => setAdding(true)}>
            Add
          </Button>
        ) : null}
        <Link
          href={`/agents/${agentId}/test`}
          target="_blank"
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          aria-label="Open the test page"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          All runs
        </Link>
      </div>
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
        <EmptyState icon={<FlaskConical />} title="No test cases yet" line="Save a run as a test case, or add one" />
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => {
            const result = latest.get(row.id);
            const meta = result?.verdict ? VERDICT_META[result.verdict] : null;
            return (
              <li
                key={row.id}
                className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
                data-testid="studio-case"
              >
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{row.label || "Untitled case"}</span>
                {meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : null}
                <Button
                  variant="quiet"
                  icon={<SquareArrowOutUpRight />}
                  aria-label="Open in the center"
                  onClick={() => onUseCase(row)}
                />
                <Button
                  variant="quiet"
                  icon={<Play />}
                  aria-label="Run this case"
                  disabled={launching !== null}
                  onClick={() => void run(row.id, [row.id])}
                />
              </li>
            );
          })}
        </ul>
      )}
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
