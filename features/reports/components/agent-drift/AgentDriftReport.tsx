/**
 * Agent Drift report — report #1 of the reports module.
 *
 * Desktop: master-detail. The RollupTable (one row per agent with drift) on the
 * left; selecting an agent mounts the SAME <AgentUsagesEngine> the Find Usages
 * window uses as the detail pane — zero forked detail UI. Mobile: rollup card
 * list → tap pushes the detail view with a back header.
 *
 * mode="user" reads agx_usage_report (the caller's agents); mode="admin" reads
 * agx_usage_report_admin (platform-wide). Admin gating is inherited from the
 * (admin) route layout.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { useDriftReport } from "@/features/agents/hooks/useDriftReport";
import type { ReportSortKey } from "@/features/agents/redux/usages/usages.selectors";
import { AgentUsagesEngine } from "@/features/agents/components/usages/AgentUsagesEngine";
import { RollupTable } from "./RollupTable";
import { AgentDriftReportHeader } from "./AgentDriftReportHeader";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { createReportsScope } from "@/features/surfaces/manifests/reports.manifest";
import { REPORTS } from "@/features/reports/registry";
import { Loader2, RotateCw } from "lucide-react";

export function AgentDriftReport({
  mode = "user",
  embedded = false,
}: {
  mode?: "user" | "admin";
  /** A board tile: the same report without the shell header, its back door or the page's top padding. */
  embedded?: boolean;
}) {
  const isMobile = useIsMobile();
  const [sort, setSort] = useState<{ key: ReportSortKey; desc: boolean }>({
    key: "breaking",
    desc: true,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const { status, error, rows, adminRows, totals, refresh } = useDriftReport(
    mode,
    sort,
  );

  const onSort = (key: ReportSortKey) =>
    setSort((s) =>
      s.key === key ? { key, desc: !s.desc } : { key, desc: true },
    );

  const showMobileDetail = isMobile && selected !== null;
  const summary = { agents: totals.agents, totals: totals.totals };

  const body = (() => {
    if (status === "failed") {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            {error ?? "Could not load the report."}
            <ErrorAlchemyMenu error={error} />
          </p>
          <Button variant="outline" onClick={refresh}>
            Retry
          </Button>
        </div>
      );
    }

    if (showMobileDetail) {
      return (
        <div className="min-h-0 flex-1">
          <AgentUsagesEngine key={selected} agentId={selected} mode={mode} />
        </div>
      );
    }

    if (isMobile) {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {status === "loading" ? (
            <ReportSkeleton />
          ) : (
            <RollupTable
              mode={mode}
              rows={rows}
              adminRows={adminRows}
              selectedAgentId={selected}
              onSelect={setSelected}
              sort={sort}
              onSort={onSort}
              summary={summary}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex min-h-0 flex-1">
        <div className="w-1/2 min-w-[360px] overflow-y-auto border-r border-border">
          {status === "loading" ? (
            <ReportSkeleton />
          ) : (
            <RollupTable
              mode={mode}
              rows={rows}
              adminRows={adminRows}
              selectedAgentId={selected}
              onSelect={setSelected}
              sort={sort}
              onSort={onSort}
              summary={summary}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {selected ? (
            <AgentUsagesEngine key={selected} agentId={selected} mode={mode} />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Select an agent to see its usages and drift detail.
            </div>
          )}
        </div>
      </div>
    );
  })();

  // The reports surface for the open report (user scope only: the admin variant is the admin
  // reporting surface's). Read at send time from what the report already holds.
  const getScope = () =>
    createReportsScope({
      available_report_slugs: REPORTS.filter((r) => r.status === "live").map((r) => r.slug),
      report_is_admin_scope: false,
      report_slug: "agent-drift",
      report_title: "Agent Drift",
      report_row_count: rows.length,
      report_findings: rows.map((r) => ({
        agent_id: r.agentId,
        agent_name: r.agentName,
        current_version: r.currentVersion,
        breaking: r.myBreaking,
        silent_breaking: r.mySilent,
        warning: r.myWarning,
        info: r.myInfo,
        stale_pins: r.myStalePins,
        usages: r.myUsageCount,
      })),
      report_totals: { agents_with_drift: totals.agents, ...totals.totals },
      report_load_status: { status, error },
      ...(selected ? { report_selected_agent_id: selected } : {}),
    });

  const frame = embedded ? (
    <div className="flex h-full min-h-0 flex-col" data-report-embedded>
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
        {showMobileDetail ? (
          <Button variant="quiet" onClick={() => setSelected(null)}>
            Back to report
          </Button>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">Agent Drift</span>
        )}
        <div className="ml-auto">
          <Button
            variant="outline"
            icon={status === "loading" ? <Loader2 className="animate-spin" /> : <RotateCw />}
            onClick={refresh}
            disabled={status === "loading"}
          >
            Refresh
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{body}</div>
    </div>
  ) : (
    <>
      <AgentDriftReportHeader
        mode={mode}
        loading={status === "loading"}
        mobileDetail={showMobileDetail}
        onBackFromDetail={() => setSelected(null)}
        onRefresh={refresh}
      />

      <div
        className="flex h-full flex-col overflow-hidden"
        style={{ paddingTop: "var(--shell-header-h)" }}
      >
        {body}
      </div>
    </>
  );

  return mode === "user" ? (
    <SurfaceRuntimeProvider surfaceName="matrx-user/reports" getScope={getScope}>
      {frame}
    </SurfaceRuntimeProvider>
  ) : (
    frame
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-muted/40" />
      ))}
    </div>
  );
}
