"use client";

import { answerRows } from "../battle";
import { useEffect, useEffectEvent, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { FlaskConical, Play, Plus, RotateCcw, Square, StepForward } from "lucide-react";
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
import {
  ArchiveFilter,
  Card,
  CardContent,
  DEFAULT_ARCHIVE_FILTER,
  ErrorNotice,
  ReadFailure,
  type ArchiveFilterValue,
} from "@ai-matrx/design-system";
import { AccessGate } from "@/features/access-gate/components/AccessGate";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import {
  fetchAgentContractHead,
  type AgentVariableDeclaration,
} from "@/features/agents/samples/service";
import {
  cancelRun,
  countResults,
  fetchAgentRuns,
  fetchRun,
  fetchRunResults,
  fetchTestCases,
  followRun,
  launchRun,
  recheckRun,
  resumeRun,
} from "../service";
import { agentTestModes } from "../agentModes";
import { caseDecidersLine, runStatusMeta } from "../verdicts";
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
import { TestCaseForm } from "./TestCaseForm";
import { RunProgress } from "./RunProgress";
import { ResultsTable, RunsTable } from "./AgentTestTables";


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
  onRun,
}: {
  options: RunOptions;
  onChange: (next: RunOptions) => void;
  caseCount: number;
  onRun: () => Promise<void>;
}) {
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = async () => {
    setLaunching(true);
    setError(null);
    try {
      await onRun();
    } catch (err) {
      setError(err);
    } finally {
      setLaunching(false);
    }
  };
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
            disabled={caseCount === 0 || launching}
            onClick={() => void run()}
          >
            {caseCount === 1 ? "Run 1 test" : caseCount > 1 ? `Run ${caseCount} tests` : "Run tests"}
          </Button>
          {error ? (
            <ErrorNotice
              size="inline"
              title="The run did not start"
              error={error}
              operation="Run agent tests"
            />
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
          line={caseDecidersLine(testCase)}
          selected={selectedCaseIds.has(testCase.id)}
        />
      ))}
    </div>
  );
}

/**
 * One test run: progress, cancel/resume/re-check, its results and the open
 * result's checks + judge. The ONE run view — the Agent Studio's Cases tab
 * mounts it too (`stacked`: its pane is narrow at every viewport).
 */
export function TestRunPanel({
  runId,
  cases,
  declarations,
  seat,
  onOpenRun,
  onSettled,
  stacked = false,
}: {
  runId: string;
  cases: TestCaseView[];
  declarations: readonly AgentVariableDeclaration[];
  seat: AgentTestSeat;
  onOpenRun: (id: string) => void;
  /** Called when a live run stops being live (its results are final). */
  onSettled?: () => void;
  stacked?: boolean;
}) {
  const [runRead, rereadRun] = useRead<TestRunView | null>(
    () => fetchRun(runId),
    `run:${runId}`,
  );
  const [resultsRead, rereadResults] = useRead<TestResultView[]>(
    // The answers only: a battle's pairwise verdict rows are shown by the battle's own outcome view.
    () => fetchRunResults(runId).then(answerRows),
    `results:${runId}`,
  );
  const [openResultId, setOpenResultId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<{ error: unknown; what: string } | null>(null);

  const status =
    runRead.state === "ready" ? (runRead.data?.status ?? null) : null;
  const live = status !== null && runStatusMeta(status).live;
  const reread = useEffectEvent(() => {
    rereadRun();
    rereadResults();
  });
  const settled = useEffectEvent(() => onSettled?.());
  // A live run follows the server's run stream: each stored result and the final
  // status re-read the rows (RLS). The stream ends when the run finishes or pauses.
  useEffect(() => {
    if (!live) return;
    const controller = new AbortController();
    void (async () => {
      try {
        for await (const event of followRun(runId, controller.signal)) {
          if (event.event !== "agent_test_progress") reread();
        }
      } catch (err) {
        if (!controller.signal.aborted)
          setActionError({ error: err, what: "Lost the run's live updates" });
      }
      if (!controller.signal.aborted) {
        reread();
        settled();
      }
    })();
    return () => controller.abort();
  }, [live, runId]);

  const act = async (work: () => Promise<void>, fallback: string) => {
    setActing(true);
    setActionError(null);
    try {
      await work();
    } catch (err) {
      setActionError({ error: err, what: fallback });
    } finally {
      setActing(false);
    }
  };

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
  if (!run) return <AccessGate token="agent_test_run" id={runId} />;

  const results = resultsRead.data;
  const casesById = new Map(cases.map((c) => [c.id, c]));
  const counts = run.counts ?? countResults(results);
  const openResult = results.find((r) => r.id === openResultId) ?? null;

  const paused = run.status.startsWith("paused_");
  return (
    <div className="flex flex-col gap-3">
      <RunProgress counts={counts} status={run.status} />
      {seat === "user" ? (
        <div className="flex items-center gap-2">
          {live ? (
            <Button
              variant="outline"
              icon={<Square />}
              disabled={acting}
              onClick={() =>
                void act(async () => {
                  await cancelRun(runId);
                  rereadRun();
                  rereadResults();
                }, "The run did not stop.")
              }
            >
              Cancel
            </Button>
          ) : null}
          {paused ? (
            <Button
              variant="outline"
              icon={<StepForward />}
              disabled={acting}
              onClick={() =>
                void act(async () => {
                  await resumeRun(runId);
                  rereadRun();
                  rereadResults();
                }, "The run did not resume.")
              }
            >
              Resume
            </Button>
          ) : null}
          {!live && !paused ? (
            <Button
              variant="outline"
              icon={<RotateCcw />}
              disabled={acting}
              onClick={() =>
                void act(async () => {
                  const next = await recheckRun(runId);
                  onOpenRun(next.runId);
                }, "Re-check did not run.")
              }
            >
              Re-check
            </Button>
          ) : null}
          {actionError ? (
            <ErrorNotice
              size="inline"
              title={actionError.what}
              error={actionError.error}
              operation="Agent test run"
              records={[{ type: "agent_test_run", id: runId }]}
            />
          ) : null}
        </div>
      ) : null}
      <div className={stacked ? "flex min-h-0 flex-col gap-3" : "flex min-h-0 flex-col gap-3 xl:flex-row"}>
        <div className="min-w-0 flex-1">
          <ResultsTable
            results={results}
            casesById={casesById}
            seat={seat}
            onOpen={(r) => setOpenResultId(r.id)}
          />
        </div>
        {openResult ? (
          <div className={stacked ? "min-w-0" : "xl:w-[28rem] xl:shrink-0"}>
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

  const [casesRead, rereadCases] = useRead(
    () => fetchTestCases(agentId),
    `cases:${agentId}`,
  );
  const [archive, setArchive] = useState<ArchiveFilterValue>(
    DEFAULT_ARCHIVE_FILTER,
  );
  const [runsRead, rereadRuns] = useRead(
    () =>
      fetchAgentRuns(agentId, {
        purpose: seat === "admin" ? "platform" : "user",
        archive,
      }),
    `runs:${agentId}:${seat}:${archive}`,
  );
  const [headRead] = useRead(
    () => fetchAgentContractHead(agentId),
    `head:${agentId}`,
  );
  const [options, setOptions] = useState<RunOptions>(DEFAULT_RUN_OPTIONS);
  const [adding, setAdding] = useState(false);

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
          <div className="flex items-center justify-between gap-2">
            <span className="type-label">Test cases</span>
            {seat === "user" && !adding ? (
              <Button variant="quiet" icon={<Plus />} onClick={() => setAdding(true)}>
                Add
              </Button>
            ) : null}
          </div>
          {adding && headRead.state !== "loading" ? (
            <TestCaseForm
              agentId={agentId}
              head={headRead.state === "ready" ? headRead.data : null}
              onCreated={() => {
                setAdding(false);
                rereadCases();
              }}
              onCancel={() => setAdding(false)}
            />
          ) : null}
          <CaseList read={casesRead} selectedCaseIds={new Set<string>()} />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col gap-4">
          {seat === "user" ? (
            <RunOptionsCard
              options={options}
              onChange={setOptions}
              caseCount={cases.length}
              onRun={async () => {
                const launched = await launchRun(agentId, options);
                rereadRuns();
                openRun(launched.runId);
              }}
            />
          ) : null}
          <div className="flex justify-end">
            <ArchiveFilter
              value={archive}
              onValueChange={setArchive}
              aria-label="Archived runs"
            />
          </div>
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
            <TestRunPanel
              key={runId}
              runId={runId}
              cases={cases}
              declarations={declarations}
              seat={seat}
              onOpenRun={(id) => {
                rereadRuns();
                openRun(id);
              }}
            />
          ) : null}
        </main>
      </div>
    </>
  );
}
