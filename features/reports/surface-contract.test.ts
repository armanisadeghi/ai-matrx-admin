import { buildDriftReportScope, parseReportDestination, reportViewPatch } from "./surface-contract";
import type { useDriftReport } from "@/features/agents/hooks/useDriftReport";

const report: ReturnType<typeof useDriftReport> = {
  status: "succeeded", error: null, adminRows: [], refresh: () => undefined,
  totals: { agents: 1, totals: { breaking: 2, silent_breaking: 0, warning: 0, info: 0 } },
  rows: [{ agentId: "50ea4f94-ebc6-4131-9d66-e030806a101d", agentName: "Live report agent", currentVersion: 3, agentIsActive: true, ownedByCaller: true, myUsageCount: 4, myBreaking: 2, mySilent: 0, myWarning: 0, myInfo: 0, myStalePins: 1, othersUsageCount: null, othersRedflagCount: null, byType: {}, alertId: null, alertStatus: null, alertSeverity: null, alertDetectedAt: null, alertLastScannedAt: null }],
};
const table = { page: 1, pageSize: 50, search: "", anyOf: "", columnFilters: {}, sort: null };

describe("report surface truth", () => {
  it.each(["idle", "loading", "failed"] as const)("omits stale findings and totals during %s", (status) => {
    const scope = buildDriftReportScope({ report: { ...report, status }, selected: null, table });
    expect(scope.report_findings).toBeUndefined();
    expect(scope.report_row_count).toBeUndefined();
    expect(scope.report_totals).toBeUndefined();
    expect(scope.report_overview).not.toContain("Live report agent");
  });
  it("publishes successful rows, matching totals, and a no-lookup overview", () => {
    const scope = buildDriftReportScope({ report, selected: report.rows[0]?.agentId ?? null, table });
    expect(scope.report_row_count).toBe(1);
    expect(scope.report_overview).toContain("Live report agent");
    expect(scope.report_totals).toMatchObject({ breaking: 2 });
    expect(scope.report_table_query).toEqual(table);
  });
  it("refuses unknown report doors and malformed/mutation view writes", () => {
    expect(parseReportDestination("agent-drift").href).toBe("/reports/agent-drift");
    expect(() => parseReportDestination("https://example.com")).toThrow("not available");
    for (const value of [{}, { delete_agent: true }, { page: 0 }, { sort: { id: "invented", direction: "desc" } }]) {
      expect(() => reportViewPatch.parse(value)).toThrow();
    }
    expect(reportViewPatch.parse({ search: "Agent", selected_agent_id: null })).toEqual({ search: "Agent", selected_agent_id: null });
  });
});
