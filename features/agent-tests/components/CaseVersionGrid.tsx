"use client";

/**
 * Cases × versions: each cell is the newest result of that case on that saved
 * version of the agent, read from eval results (`agent.test_result`). Loads
 * when mounted (the Studio's Versions tab opens it).
 */

import { useEffect, useState } from "react";
import { Badge, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { MatrxDataTable, type MatrxColumnDef } from "@ai-matrx/design-system/data-table";
import { fetchTestCaseRows, type TestCaseRow } from "../cases";
import { fetchCaseResults, fetchVersionNumbers } from "../service";
import { caseVersionGrid, type CaseVersionGrid as Grid } from "../case-grid";
import { VERDICT_META } from "../verdicts";

export function CaseVersionGrid({ agentId }: { agentId: string }) {
  const [data, setData] = useState<{ rows: TestCaseRow[]; grid: Grid } | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [rows, versions] = await Promise.all([fetchTestCaseRows(agentId), fetchVersionNumbers(agentId)]);
        const results = await fetchCaseResults(rows.map((r) => r.id));
        if (live) setData({ rows, grid: caseVersionGrid(results, versions) });
      } catch (e) {
        if (live) setError(e);
      }
    })();
    return () => {
      live = false;
    };
  }, [agentId]);

  if (error) return <ReadFailure what="test results" error={error} />;
  if (!data) return <RegionSkeleton shape="rows" count={3} aria-label="Loading test results" />;
  const { rows, grid } = data;
  if (rows.length === 0 || grid.versions.length === 0) return null;
  const columns: MatrxColumnDef<TestCaseRow>[] = [
    {
      id: "case",
      header: "Case",
      accessorFn: (row) => row.label || "Untitled case",
      filter: "text",
      width: 200,
      frozen: true,
    },
    ...grid.versions.map(
      (v): MatrxColumnDef<TestCaseRow> => ({
        id: `v${v}`,
        header: `v${v}`,
        accessorFn: (row) => {
          const r = grid.cell(row.id, v);
          return r?.verdict ? VERDICT_META[r.verdict].label : "—";
        },
        filter: "select",
        width: 110,
        cell: (row) => {
          const r = grid.cell(row.id, v);
          const meta = r?.verdict ? VERDICT_META[r.verdict] : null;
          return meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : <span className="text-disabled-foreground">—</span>;
        },
      }),
    ),
  ];
  return (
    <div data-testid="case-version-grid">
      <MatrxDataTable<TestCaseRow>
        tableId="agents/test/case-version-grid"
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        pageSize={0}
        density="condensed"
        viewTabs={false}
        toolbar={{ title: "Cases by version" }}
        detail={{ enabled: false }}
        copy={{
          label: "Test case",
          listLabel: "Test cases by version (this view)",
          location: "Agent Studio — versions",
          rowKind: "agent-test-case",
          listKind: "agent-test-case-list",
          rowDescription: "One test case and its newest verdict on each saved version.",
          listDescription: "The agent's test cases by saved version.",
          humanRow: (row) => row.label || "Untitled case",
        }}
        emptyState={{ title: "No results yet" }}
      />
    </div>
  );
}
