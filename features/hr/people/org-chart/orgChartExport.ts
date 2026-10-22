// features/hr/people/org-chart/orgChartExport.ts
//
// 🚨 THE CSV IS THE CHART'S ROWS, NOT A DIRECTORY DUMP (SPEC-EMPLOYEES §5.2).
// One row per node, with the manager it is drawn under, the level it sits at,
// and the as-of date on EVERY row — because a chart export without the date it
// was true on is an assertion nobody can check.
//
// The as-of date also travels in the FILENAME, so a file that leaves this app
// carries what it is.
//
// It is safe to build client-side precisely because it carries nothing the chart
// does not already draw: display name, title, department, location, manager,
// FTE, worker class. No Confidential-tier column is in `hr_org_chart`'s payload
// at all, so none can leak into this file. The DIRECTORY export is a different
// story: it is audited, see
// `directoryExportAction.ts`.

import type { HrOrgChart } from "../../types";
import { toDelimitedText } from "@ai-matrx/alchemy/operate/read";
import type { Json } from "@ai-matrx/alchemy/operate";
import { downloadFile } from "@ai-matrx/kit/download";

/** File name without extension — shared with the chart's PNG/PDF export. */
export function orgChartExportBase(asOf: string): string {
  return `org-chart-as-of-${asOf}`;
}

export function orgChartExportName(asOf: string, extension: string): string {
  return `${orgChartExportBase(asOf)}.${extension}`;
}

/** Depth of each node, computed the same way the layout does. */
function depths(chart: HrOrgChart): Map<string, number> {
  const managerOf = new Map(
    chart.nodes.map((node) => [node.employment_id, node.manager_employment_id]),
  );
  const out = new Map<string, number>();

  for (const node of chart.nodes) {
    let depth = 0;
    let current = node.manager_employment_id;
    const seen = new Set<string>([node.employment_id]);
    // The same cycle guard the layout uses: a loop stops rather than hanging.
    while (current && !seen.has(current) && managerOf.has(current)) {
      seen.add(current);
      depth += 1;
      current = managerOf.get(current) ?? null;
    }
    out.set(node.employment_id, depth);
  }
  return out;
}

const ORG_CHART_COLUMNS = [
  "as_of",
  "level",
  "display_name",
  "job_title",
  "department",
  "location",
  "manager",
  "fte",
  "worker_class",
  "placement",
  "employee_id",
  "employment_id",
] as const;

export function buildOrgChartCsv(chart: HrOrgChart): string {
  const level = depths(chart);
  const nameOf = new Map(
    chart.nodes.map((node) => [node.employment_id, node.display_name]),
  );
  const cycles = new Set(chart.cycles);

  const rows: Json[][] = [];
  for (const node of chart.nodes) {
    rows.push(
      [
        chart.as_of,
        level.get(node.employment_id) ?? 0,
        node.display_name,
        node.job_title,
        node.department,
        node.location,
        node.manager_employment_id
          ? (nameOf.get(node.manager_employment_id) ?? "")
          : "",
        node.fte,
        node.worker_class,
        cycles.has(node.employment_id) ? "reporting loop" : "on chart",
        node.employee_id,
        node.employment_id,
      ],
    );
  }

  // 🚨 THE TRAY IS IN THE FILE TOO. Somebody who exports the chart to review
  // headcount must not silently lose the people the chart could not place.
  for (const person of chart.unplaced) {
    rows.push(
      [
        chart.as_of,
        "",
        person.display_name,
        "",
        "",
        "",
        "",
        "",
        "",
        `not yet placed — ${person.reason}`,
        person.employee_id,
        person.employment_id,
      ],
    );
  }

  // The date travels IN the data (the `as_of` column on every row) and in the
  // filename — never as a `# …` comment line above the header, which a strict
  // CSV reader takes as the header row itself.
  return toDelimitedText(ORG_CHART_COLUMNS, rows, { spreadsheetSafe: true });
}

export function downloadOrgChartCsv(chart: HrOrgChart): void {
  const blob = new Blob([buildOrgChartCsv(chart)], {
    type: "text/csv;charset=utf-8",
  });
  downloadFile(orgChartExportName(chart.as_of, "csv"), blob, blob.type);
}

/*
  ── PDF and PNG ────────────────────────────────────────────────────────────
  Not here. They are the shared chart's own export (`components/official/
  org-chart/exportChart.ts`, the one path every org chart uses through the
  Alchemy capture door and the kit download door). HrOrgChart passes the as-of
  caption and `orgChartExportBase(asOf)`, so the date is burned into the image
  and the PDF page and travels in the filename — a filename does not survive
  being pasted into a document.
*/
