import { z } from "zod";
import { xmlElement, xmlList } from "@ai-matrx/chat/surfaces/runtime/context-bundle";
import { safeQueryPage } from "@ai-matrx/design-system/data-table/query-control";
import type { MatrxDataTableQueryState } from "@ai-matrx/design-system/data-table/types";
import { createReportsScope } from "@/features/surfaces/manifests/reports.manifest";
import type { useDriftReport } from "@/features/agents/hooks/useDriftReport";
import { REPORTS } from "./registry";

export const reportViewPatch = z.object({
  selected_agent_id: z.string().uuid().nullable().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional(),
  page_size: z.number().int().positive().optional(),
  sort: z.object({ id: z.enum(["agent", "usages", "breaking", "silent", "stale"]), direction: z.enum(["asc", "desc"]) }).strict().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Name a report view setting. Nothing was changed.");

export function parseReportDestination(value: unknown) {
  const slug = z.string().parse(value);
  const report = REPORTS.find((entry) => entry.slug === slug && entry.status === "live");
  if (!report) throw new Error(`Report ${slug} is not available. Use available_report_slugs. Nothing was changed.`);
  return report;
}

export interface ReportViewSnapshot {
  queryKey: string;
  source: ReturnType<typeof useDriftReport>["rows"];
  agentIds: string[];
}

export function reportViewKey(table: MatrxDataTableQueryState): string { return JSON.stringify(table); }

export function buildDriftReportScope(args: {
  report: ReturnType<typeof useDriftReport>;
  selected: string | null;
  table: MatrxDataTableQueryState;
  view: ReportViewSnapshot | null;
}) {
  const { report, selected, table, view } = args;
  const viewReady = view !== null && view.source === report.rows && view.queryKey === reportViewKey(table);
  const byId = new Map(report.rows.map((row) => [row.agentId, row]));
  const filtered = viewReady ? view.agentIds.flatMap((id) => { const row = byId.get(id); return row ? [row] : []; }) : [];
  const findings = filtered.map((row) => ({
    agent_id: row.agentId, agent_name: row.agentName, current_version: row.currentVersion,
    breaking: row.myBreaking, silent_breaking: row.mySilent, warning: row.myWarning,
    info: row.myInfo, stale_pins: row.myStalePins, usages: row.myUsageCount,
  }));
  return createReportsScope({
    available_report_slugs: REPORTS.filter((entry) => entry.status === "live").map((entry) => entry.slug),
    report_is_admin_scope: false,
    report_slug: "agent-drift",
    report_title: "Agent Drift",
    report_load_status: { status: report.status, error: report.error },
    report_table_query: table,
    ...(selected ? { report_selected_agent_id: selected } : {}),
    report_view_status: report.status === "succeeded" && viewReady ? "ready" : "pending",
    ...(report.status === "succeeded" ? { report_source_records: report.rows } : {}),
    ...(report.status === "succeeded" && viewReady ? {
      report_row_count: findings.length,
      report_page_findings: findings.slice((safeQueryPage(table.page, findings.length, table.pageSize) - 1) * table.pageSize, safeQueryPage(table.page, findings.length, table.pageSize) * table.pageSize),
      report_findings: findings,
      report_totals: { agents_with_drift: report.totals.agents, ...report.totals.totals },
    } : {}),
    report_overview: xmlElement("report", { title: "Agent Drift", status: report.status, selected_agent_id: selected, search: table.search },
      report.status === "succeeded" && viewReady ? xmlList("agents", findings, (row) => xmlElement("agent", row), { maxRows: 25 }) : undefined),
    content: report.status === "succeeded" && viewReady
      ? findings.map((row) => `${row.agent_name}: ${row.breaking} breaking, ${row.silent_breaking} silent, ${row.stale_pins} stale pins`).join("\n") || "No drift detected."
      : `Agent Drift: ${report.status}${report.error ? ` — ${report.error}` : ""}`,
  });
}
