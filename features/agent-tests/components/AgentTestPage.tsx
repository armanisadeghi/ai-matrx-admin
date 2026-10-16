"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { FlaskConical, Play } from "lucide-react";
import {
  Button,
  EmptyState,
  NumberStepper,
  RegionSkeleton,
  SegmentedControl,
  Select,
  SettingRow,
  RowGroup,
  Tile,
} from "@ai-matrx/design-system/controls";
import { Card, CardContent, ReadFailure } from "@ai-matrx/design-system";
import { announceComingSoon } from "@ai-matrx/kit/coming-soon";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import {
  fetchAgentContractHead,
  type AgentVariableDeclaration,
} from "@/features/agents/samples/service";
import {
  countResults,
  fetchAgentRuns,
  fetchRun,
  fetchRunResults,
  fetchTestCases,
  LAUNCH_AVAILABLE,
} from "../service";
import { agentTestModes } from "../agentModes";
import { runStatusMeta } from "../verdicts";
import {
  DEFAULT_RUN_OPTIONS,
  type AgentTestSeat,
  type DoorPolicy,
  type JudgePolicy,
  type RunOptions,
  type TestCaseView,
  type TestResultView,
  type TestRunView,
} from "../types";
import { ResultDetail } from "./ResultDetail";
import { RunProgress } from "./RunProgress";
import { ResultsTable, RunsTable } from "./AgentTestTables";

/** While a run is live the page re-reads it on this beat (a run's server stream replaces it). */
const LIVE_REREAD_MS = 3000;

type Read<T> =
  | { state: "loading" }
  | { state: "ready"; data: T }
  | { state: "failed"; error: unknown };

function useRead<T>(
  load: () => Promise<T>,
  key: string,
): [Read<T>, () => void] {
  const [read, setRead] = useState<Read<T>>({ state: "loading" });
  const [nonce, setNonce] = useState(0);
  // `load` is rebuilt each render; `key` names what it reads.
  const runLoad = useEffectEvent(() => load());
  useEffect(() => {
    let live = true;
    runLoad()
      .then((data) => live && setRead({ state: "ready", data }))
      .catch((error: unknown) => live && setRead({ state: "failed", error }));
    return () => {
      live = false;
    };
  }, [key, nonce]);
  return [read, () => setNonce((n) => n + 1)];
}

const DOOR_OPTIONS: { value: DoorPolicy; label: string }[] = [
  { value: "random", label: "Random" },
  { value: "all", label: "All doors" },
  { value: "fixed:manual", label: "Builder" },
  { value: "fixed:agents", label: "Agent API" },
];

const JUDGE_OPTIONS: { value: JudgePolicy; label: string }[] = [
  { value: "on_fail_or_undecided", label: "On fail or undecided" },
  { value: "off", label: "Off" },
];

function RunOptionsCard({
  options,
  onChange,
  caseCount,
}: {
  options: RunOptions;
  onChange: (next: RunOptions) => void;
  caseCount: number;
}) {
  return (
    <Card>
      <CardContent gap="md">
        <RowGroup title="Run options">
          <SettingRow label="Doors">
            <SegmentedControl
              aria-label="Doors"
              value={options.doorPolicy}
              data={DOOR_OPTIONS}
              onValueChange={(doorPolicy) =>
                onChange({ ...options, doorPolicy })
              }
            />
          </SettingRow>
          <SettingRow label="Repeats">
            <NumberStepper
              value={options.repeats}
              min={1}
              max={10}
              onChange={(repeats) => onChange({ ...options, repeats })}
            />
          </SettingRow>
          <SettingRow label="Judge">
            <Select
              aria-label="Judge"
              value={options.judgePolicy}
              options={JUDGE_OPTIONS}
              onValueChange={(judgePolicy) =>
                onChange({ ...options, judgePolicy })
              }
            />
          </SettingRow>
        </RowGroup>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            icon={<Play />}
            disabled={!LAUNCH_AVAILABLE || caseCount === 0}
          >
            {caseCount > 0 ? `Run ${caseCount} tests` : "Run tests"}
          </Button>
          {!LAUNCH_AVAILABLE ? (
            <Button
              variant="link"
              onClick={() => void announceComingSoon("agents.test-runs")}
            >
              Not available yet
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function CaseList({
  read,
  selectedCaseIds,
}: {
  read: Read<TestCaseView[]>;
  selectedCaseIds: ReadonlySet<string>;
}) {
  if (read.state === "loading")
    return (
      <RegionSkeleton shape="rows" count={4} aria-label="Loading test cases" />
    );
  if (read.state === "failed")
    return <ReadFailure what="test cases" error={read.error} />;
  if (read.data.length === 0) {
    return <EmptyState icon={<FlaskConical />} title="No test cases yet" />;
  }
  return (
    <div className="flex flex-col gap-1">
      {read.data.map((testCase) => (
        <Tile
          key={testCase.id}
          variant="quiet"
          title={testCase.label}
          line={`${testCase.checkCount} checks`}
          selected={selectedCaseIds.has(testCase.id)}
        />
      ))}
    </div>
  );
}

function SelectedRun({
  runId,
  cases,
  declarations,
  seat,
}: {
  runId: string;
  cases: TestCaseView[];
  declarations: readonly AgentVariableDeclaration[];
  seat: AgentTestSeat;
}) {
  const [runRead, rereadRun] = useRead<TestRunView | null>(
    () => fetchRun(runId),
    `run:${runId}`,
  );
  const [resultsRead, rereadResults] = useRead<TestResultView[]>(
    () => fetchRunResults(runId),
    `results:${runId}`,
  );
  const [openResultId, setOpenResultId] = useState<string | null>(null);

  const status =
    runRead.state === "ready" ? (runRead.data?.status ?? null) : null;
  const live = status !== null && runStatusMeta(status).live;
  const reread = useEffectEvent(() => {
    rereadRun();
    rereadResults();
  });
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => reread(), LIVE_REREAD_MS);
    return () => window.clearInterval(timer);
  }, [live]);

  if (runRead.state === "loading" || resultsRead.state === "loading") {
    return (
      <RegionSkeleton shape="rows" count={4} aria-label="Loading the run" />
    );
  }
  if (runRead.state === "failed")
    return <ReadFailure what="test run" error={runRead.error} />;
  if (resultsRead.state === "failed")
    return <ReadFailure what="test results" error={resultsRead.error} />;
  const run = runRead.data;
  if (!run) return <EmptyState icon={<FlaskConical />} title="Run not found" />;

  const results = resultsRead.data;
  const casesById = new Map(cases.map((c) => [c.id, c]));
  const counts = run.counts ?? countResults(results);
  const openResult = results.find((r) => r.id === openResultId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <RunProgress counts={counts} status={run.status} />
      <div className="flex min-h-0 flex-col gap-3 xl:flex-row">
        <div className="min-w-0 flex-1">
          <ResultsTable
            results={results}
            casesById={casesById}
            seat={seat}
            onOpen={(r) => setOpenResultId(r.id)}
          />
        </div>
        {openResult ? (
          <div className="xl:w-[28rem] xl:shrink-0">
            <ResultDetail
              result={openResult}
              testCase={casesById.get(openResult.caseId) ?? null}
              declarations={declarations}
              seat={seat}
              onClose={() => setOpenResultId(null)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * /agents/[id]/test and its admin mirror. Test cases on the left; run options,
 * run history and the open run on the right. The admin seat is read-only in
 * Phase 1 (no run options) and lists platform runs only (runs an admin starts
 * are filed in their admin organization with purpose 'platform').
 */
export function AgentTestPage({
  agentId,
  agentName,
  seat,
  basePath,
  backHref,
}: {
  agentId: string;
  agentName: string;
  seat: AgentTestSeat;
  basePath: string;
  backHref: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const runId = searchParams?.get("run") ?? null;

  const [casesRead] = useRead(
    () => fetchTestCases(agentId),
    `cases:${agentId}`,
  );
  const [runsRead] = useRead(
    () =>
      fetchAgentRuns(agentId, {
        purpose: seat === "admin" ? "platform" : "user",
      }),
    `runs:${agentId}:${seat}`,
  );
  const [headRead] = useRead(
    () => fetchAgentContractHead(agentId),
    `head:${agentId}`,
  );
  const [options, setOptions] = useState<RunOptions>(DEFAULT_RUN_OPTIONS);

  const cases = casesRead.state === "ready" ? casesRead.data : [];
  const declarations =
    headRead.state === "ready"
      ? (headRead.data?.variableDeclarations ?? [])
      : [];

  const openRun = (id: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (id) params.set("run", id);
    else params.delete("run");
    const query = params.toString();
    replaceAddressWithoutNavigating(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <>
      <RecordPageHeader
        backHref={backHref}
        parents={[
          {
            label: seat === "admin" ? "System agents" : "Agents",
            href: backHref,
          },
        ]}
        record={{ name: agentName }}
        modes={agentTestModes(basePath, agentId)}
      />
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-[var(--matrx-page-gutter)] pt-[calc(var(--shell-header-h)+var(--matrx-page-top))] lg:flex-row">
        <aside className="flex flex-col gap-2 lg:w-72 lg:shrink-0">
          <span className="type-label">Test cases</span>
          <CaseList read={casesRead} selectedCaseIds={new Set<string>()} />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col gap-4">
          {seat === "user" ? (
            <RunOptionsCard
              options={options}
              onChange={setOptions}
              caseCount={cases.length}
            />
          ) : null}
          {runsRead.state === "loading" ? (
            <RegionSkeleton
              shape="rows"
              count={3}
              aria-label="Loading test runs"
            />
          ) : runsRead.state === "failed" ? (
            <ReadFailure what="test runs" error={runsRead.error} />
          ) : (
            <RunsTable
              runs={runsRead.data}
              seat={seat}
              onOpen={(run) => openRun(run.id)}
            />
          )}
          {runId ? (
            <SelectedRun
              key={runId}
              runId={runId}
              cases={cases}
              declarations={declarations}
              seat={seat}
            />
          ) : null}
        </main>
      </div>
    </>
  );
}
