"use client";

import {
  MatrxDataTable,
  type MatrxColumnDef,
  type MatrxDataTableCopyConfig,
} from "@ai-matrx/design-system/data-table";
import { Badge } from "@ai-matrx/design-system/controls";
import { Peek, PeekHoverCard } from "@ai-matrx/design-system";
import { formatDistanceToNow } from "date-fns";
import {
  VERDICT_META,
  VERDICT_ORDER,
  doorLabel,
  passRate,
  runStatusMeta,
} from "../verdicts";
import type {
  AgentTestSeat,
  TestCaseView,
  TestResultView,
  TestRunView,
} from "../types";
import { TestCost } from "./TestCost";

function when(iso: string | null): string {
  if (!iso) return "—";
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function percent(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

export function RunsTable({
  runs,
  seat,
  onOpen,
}: {
  runs: TestRunView[];
  seat: AgentTestSeat;
  onOpen: (run: TestRunView) => void;
}) {
  const columns: MatrxColumnDef<TestRunView>[] = [
    {
      id: "started",
      header: "Started",
      accessorFn: (r) => r.createdAt,
      filter: "date",
      width: 150,
      cell: (r) => when(r.createdAt),
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (r) => runStatusMeta(r.status).label,
      filter: "select",
      width: 150,
      cell: (r) => {
        const meta = runStatusMeta(r.status);
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      id: "results",
      header: "Results",
      accessorFn: (r) => r.counts?.done ?? null,
      filter: "number",
      width: 110,
      cell: (r) => (r.counts ? `${r.counts.done} / ${r.counts.total}` : "—"),
    },
    {
      id: "pass_rate",
      header: "Pass rate",
      accessorFn: (r) => (r.counts ? passRate(r.counts.byVerdict) : null),
      filter: "number",
      width: 110,
      cell: (r) => percent(r.counts ? passRate(r.counts.byVerdict) : null),
    },
    {
      id: "doors",
      header: "Doors",
      accessorFn: (r) => r.doorPolicy,
      filter: "select",
      width: 120,
      cell: (r) =>
        r.doorPolicy === "random"
          ? "Random"
          : r.doorPolicy === "all"
            ? "All"
            : doorLabel(r.doorPolicy.replace(/^fixed:/, "")),
    },
    {
      id: "repeats",
      header: "Repeats",
      accessorFn: (r) => r.repeats,
      filter: "number",
      width: 90,
    },
    {
      id: "spent",
      header: "Cost",
      accessorFn: (r) => r.spentCents,
      filter: "number",
      width: 130,
      cell: (r) => <TestCost cents={r.spentCents} seat={seat} />,
    },
  ];
  const copy: MatrxDataTableCopyConfig<TestRunView> = {
    label: "Test run",
    listLabel: "Test runs (this view)",
    location: "Agent tests — runs",
    rowKind: "agent-test-run",
    listKind: "agent-test-run-list",
    rowDescription:
      "One test run: when, status, results, pass rate, doors, repeats and cost.",
    listDescription: "The agent's test runs, newest first, as currently shown.",
    humanRow: (r) =>
      [
        `Started: ${r.createdAt}`,
        `Status: ${runStatusMeta(r.status).label}`,
        `Pass rate: ${percent(r.counts ? passRate(r.counts.byVerdict) : null)}`,
        `Doors: ${r.doorPolicy}`,
      ].join("\n"),
  };
  return (
    <MatrxDataTable<TestRunView>
      tableId="agents/test/runs"
      data={runs}
      columns={columns}
      getRowId={(r) => r.id}
      pageSize={0}
      density="condensed"
      viewTabs={false}
      toolbar={{ title: "Runs", searchPlaceholder: "Search runs" }}
      detail={{ enabled: false }}
      copy={copy}
      onRowOpen={onOpen}
      emptyState={{ title: "No test runs yet" }}
    />
  );
}

/** The failing check that decided the verdict, or the first undecided one. */
function decidingCheck(result: TestResultView): string | null {
  const required = result.checks.filter((c) => c.required);
  return (
    required.find((c) => c.outcome === "fail")?.title ??
    required.find((c) => c.outcome === "undecided")?.title ??
    null
  );
}

function CasePeek({ testCase }: { testCase: TestCaseView | null }) {
  if (!testCase) return <span>Removed case</span>;
  const preview = testCase.userInput.trim();
  return (
    <PeekHoverCard
      label={testCase.label}
      trigger={<span className="truncate">{testCase.label}</span>}
    >
      <Peek
        record={{
          kind: "Test case",
          id: testCase.id,
          title: testCase.label,
          subtitle: `${testCase.checkCount} checks`,
          body: [
            ...(preview
              ? [{ section: "Message", text: preview, clamp: 4 as const }]
              : []),
            ...(Object.keys(testCase.variables).length
              ? [
                  {
                    section: "Variables",
                    items: Object.keys(testCase.variables),
                  },
                ]
              : []),
          ],
        }}
      />
    </PeekHoverCard>
  );
}

export function ResultsTable({
  results,
  casesById,
  seat,
  onOpen,
}: {
  results: TestResultView[];
  casesById: ReadonlyMap<string, TestCaseView>;
  seat: AgentTestSeat;
  onOpen: (result: TestResultView) => void;
}) {
  const showSetup = new Set(results.map((r) => r.setupKey)).size > 1;
  const columns: MatrxColumnDef<TestResultView>[] = [
    {
      id: "case",
      header: "Test case",
      accessorFn: (r) => casesById.get(r.caseId)?.label ?? "Removed case",
      filter: "text",
      width: 240,
      frozen: true,
      cell: (r) => <CasePeek testCase={casesById.get(r.caseId) ?? null} />,
    },
    {
      id: "verdict",
      header: "Verdict",
      accessorFn: (r) =>
        r.verdict ? VERDICT_META[r.verdict].label : "Pending",
      filter: "select",
      filterOptions: [
        ...VERDICT_ORDER.map((v) => ({
          value: VERDICT_META[v].label,
          label: VERDICT_META[v].label,
        })),
        { value: "Pending", label: "Pending" },
      ],
      width: 130,
      cell: (r) =>
        r.verdict ? (
          <Badge tone={VERDICT_META[r.verdict].tone}>
            {VERDICT_META[r.verdict].label}
          </Badge>
        ) : (
          <Badge>Pending</Badge>
        ),
    },
    {
      id: "check",
      header: "Deciding check",
      accessorFn: (r) => decidingCheck(r),
      filter: "text",
      width: 240,
      cell: (r) => decidingCheck(r) ?? "—",
    },
    {
      id: "judge",
      header: "Judge",
      accessorFn: (r) => (r.judgeVerdictId ? "Judged" : "—"),
      filter: "select",
      width: 100,
    },
    ...(showSetup
      ? [
          {
            id: "setup",
            header: "Setup",
            accessorFn: (r: TestResultView) => r.setupKey,
            filter: "select" as const,
            width: 140,
          },
        ]
      : []),
    ...(seat === "admin"
      ? [
          {
            id: "door",
            header: "Door",
            accessorFn: (r: TestResultView) => doorLabel(r.door),
            filter: "select" as const,
            width: 120,
          },
        ]
      : []),
    {
      id: "cost",
      header: "Cost",
      accessorFn: (r) => (r.runCostCents ?? 0) + (r.judgeCostCents ?? 0),
      filter: "number",
      width: 130,
      cell: (r) => (
        <TestCost
          cents={
            r.runCostCents === null && r.judgeCostCents === null
              ? null
              : (r.runCostCents ?? 0) + (r.judgeCostCents ?? 0)
          }
          seat={seat}
        />
      ),
    },
  ];
  const copy: MatrxDataTableCopyConfig<TestResultView> = {
    label: "Test result",
    listLabel: "Test results (this view)",
    location: "Agent tests — results of one run",
    rowKind: "agent-test-result",
    listKind: "agent-test-result-list",
    rowDescription:
      "One test result: case, verdict, deciding check, judge and cost.",
    listDescription: "Every result of one test run, as currently shown.",
    humanRow: (r) =>
      [
        `Case: ${casesById.get(r.caseId)?.label ?? r.caseId}`,
        `Verdict: ${r.verdict ?? "pending"}`,
        `Deciding check: ${decidingCheck(r) ?? "none"}`,
      ].join("\n"),
  };
  return (
    <MatrxDataTable<TestResultView>
      tableId="agents/test/results"
      data={results}
      columns={columns}
      getRowId={(r) => r.id}
      pageSize={0}
      density="condensed"
      viewTabs={false}
      toolbar={{ title: "Results", searchPlaceholder: "Search results" }}
      detail={{ enabled: false }}
      copy={copy}
      onRowOpen={onOpen}
      emptyState={{ title: "No results yet" }}
    />
  );
}
