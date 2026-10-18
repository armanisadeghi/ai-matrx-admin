"use client";

/**
 * Cases × versions: each cell is the newest result of that case on that saved
 * version of the agent, read from eval results (`agent.test_result`). Loads
 * when mounted (the Studio's Versions tab opens it).
 */

import { useEffect, useState } from "react";
import { Badge, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
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
  return (
    <div className="max-w-full overflow-x-auto" data-testid="case-version-grid">
      <table className="w-full min-w-0 border-collapse text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left font-medium text-muted-foreground">Case</th>
            {grid.versions.map((v) => (
              <th key={v} className="px-2 py-1 text-left font-medium text-muted-foreground">
                v{v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="max-w-28 truncate px-2 py-1 text-foreground">{row.label || "Untitled case"}</td>
              {grid.versions.map((v) => {
                const r = grid.cell(row.id, v);
                const meta = r?.verdict ? VERDICT_META[r.verdict] : null;
                return (
                  <td key={v} className="px-2 py-1">
                    {meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : <span className="text-disabled-foreground">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
