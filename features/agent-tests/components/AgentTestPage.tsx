"use client";

import { answerRows } from "../battle";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import Link from "@/components/navigation/AppLink";
import { FlaskConical, Play, Plus, RotateCcw, Scale, Square, StepForward } from "lucide-react";
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
  RecordId,
  CardContent,
  DEFAULT_ARCHIVE_FILTER,
  ErrorNotice,
  ReadFailure,
  type ArchiveFilterValue,
} from "@ai-matrx/design-system";
import { AccessGate } from "@ai-matrx/sharing/access/react";
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
  launchRun,
  recheckRun,
  resumeRun,
} from "../service";
import { agentTestModes } from "../agentModes";
import { followRunByLink, agentTestFrame } from "../liveRun";
import { useRunChanges } from "../useRunChanges";
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

/** A paused run resumes; a canceled run resumes too (the server reopens it for the results still pending). */
export function runCanResume(status: string): boolean {
  return status.startsWith("paused_") || status === "cancelled";
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
  onRunChanged,
  stacked = false,
}: {
  runId: string;
  cases: TestCaseView[];
  declarations: readonly AgentVariableDeclaration[];
  seat: AgentTestSeat;
  onOpenRun: (id: string) => void;
  /** Called when a live run stops being live (its results are final). */
  onSettled?: () => void;
  /** The run's own row moved (status or counts): the runs list beside it re-reads too. */
  onRunChanged?: () => void;
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
  const runChanged = useEffectEvent(() => onRunChanged?.());
  const reread = useEffectEvent(() => {
    rereadRun();
    rereadResults();
    runChanged();
  });
  const settled = useEffectEvent(() => onSettled?.());
  // Counts, status and each verdict arrive over realtime (`useRunChanges`): no polling. A live
  // run is also picked back up by link and rejoined (replay, then follow), so a reload mid-run
  // reattaches; when that stream ends the run is final and the page reads it once more.
  useRunChanges({
    scope: "run-panel",
    runId,
    onRun: () => {
      rereadRun();
      runChanged();
    },
    onResults: rereadResults,
  });
  // The run stops being live (seen over realtime or by the stream): its results are final.
  const wasLive = useRef(false);
  useEffect(() => {
    if (wasLive.current && !live && status !== null) settled();
    wasLive.current = live;
  }, [live, status]);
  useEffect(() => {
    if (!live) return;
    const controller = new AbortController();
    void (async () => {
      try {
        await followRunByLink(runId, controller.signal, (event) => {
          const frame = agentTestFrame(event);
          if (frame?.type === "agent_test_run_status") reread();
        });
      } catch (err) {
        if (!controller.signal.aborted)
          setActionError({ error: err, what: "Lost the run's live updates" });
      }
      if (!controller.signal.aborted) reread();
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
  // A canceled run continues too: the server reopens it for the results still pending.
  const canResume = runCanResume(run.status);
  return (
    <div className="flex flex-col gap-3">
      <RecordId value={runId} label="Run" token="agent_test_run" />
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
                  runChanged();
                }, "The run did not stop.")
              }
            >
              Cancel
            </Button>
          ) : null}
          {canResume ? (
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
        record={{ name: agentName, token: "agent", id: agentId }}
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
        <main className="flex min-w-0 flex-1 shrink-0 flex-col gap-4 lg:self-start">
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
          <div className="flex items-center justify-end gap-2">
            <Button asChild variant="quiet" icon={<Scale />}>
              <Link href={`${basePath}/${agentId}/test/agreement`}>Judge agreement</Link>
            </Button>
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
              onRunChanged={rereadRuns}
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
