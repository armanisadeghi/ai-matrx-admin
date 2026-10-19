"use client";

/**
 * Run evidence — /administration/intelligence/run-evidence.
 *
 * Every run started from one surface by ANY agent (aidream surface_evidence): per run the agent,
 * mandate, cost reason, tools and failures, context fetched by tool, tokens, cost, latency and the
 * person's first words; drill by agent, cost reason or tool. Same data as the `surface_evidence`
 * MCP tool and `POST /admin/surface-evidence/runs`.
 */

import { useEffect, useState } from "react";

import { Button, Field, Switch, Tabs } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { extractErrorMessage } from "@/utils/errors";

import { fetchSurfaceEvidence } from "./api";
import type { RunEvidence, SurfaceEvidence, SurfaceEvidenceQuery } from "./types";

type ToolRow = {
  id: string;
  request_id: string;
  agent: string;
  why: string;
  tool: string;
  calls: number;
  failures: number;
  total_ms: number;
  errors: string;
};

type FetchRow = { id: string; agent: string; target: string; count: number; failures: number };

const agentOf = (r: RunEvidence) => r.agent_name ?? "No agent";

const RUN_COLUMNS: MatrxColumnDef<RunEvidence>[] = [
  { id: "created", header: "Started", accessorFn: (r) => r.created_at, filter: "date", width: 150, cell: (r) => new Date(r.created_at).toLocaleString() },
  { id: "agent", header: "Agent", accessorFn: agentOf, filter: "select", width: 190 },
  { id: "mandate", header: "Mandate", accessorFn: (r) => r.mandate_key ?? "None", filter: "select", width: 170, mobileHidden: true },
  { id: "why", header: "Cost reason", accessorFn: (r) => r.why, filter: "select", width: 120 },
  { id: "cost", header: "Cost", accessorFn: (r) => r.cost_usd, filter: "number", width: 90, align: "right", cell: (r) => r.cost_display },
  { id: "turns", header: "Rounds", accessorFn: (r) => r.turns, filter: "number", width: 80, align: "right" },
  { id: "tool_calls", header: "Tool calls", accessorFn: (r) => r.tool_calls_total, filter: "number", width: 90, align: "right" },
  { id: "tool_failures", header: "Failures", accessorFn: (r) => r.tool_failures, filter: "number", width: 80, align: "right" },
  { id: "fetched", header: "Fetched", accessorFn: (r) => r.context_fetched.reduce((n, f) => n + f.count, 0), filter: "number", width: 80, align: "right" },
  { id: "input_tokens", header: "Tokens in", accessorFn: (r) => r.input_tokens, filter: "number", width: 100, align: "right", mobileHidden: true },
  { id: "output_tokens", header: "Tokens out", accessorFn: (r) => r.output_tokens, filter: "number", width: 100, align: "right", mobileHidden: true },
  { id: "latency", header: "Seconds", accessorFn: (r) => (r.latency_ms ?? 0) / 1000, filter: "number", width: 80, align: "right", cell: (r) => (r.latency_ms === null ? "—" : (r.latency_ms / 1000).toFixed(1)) },
  { id: "person", header: "Person", accessorFn: (r) => r.person ?? "Unknown", filter: "select", width: 140, mobileHidden: true },
  { id: "test", header: "Test account", accessorFn: (r) => (r.is_test_account ? "Yes" : "No"), filter: "select", width: 90, mobileHidden: true },
  { id: "first_message", header: "First message", accessorFn: (r) => r.first_message ?? "", width: 320 },
  { id: "detail", header: "Why", accessorFn: (r) => r.why_detail, width: 280, mobileHidden: true },
];

const TOOL_COLUMNS: MatrxColumnDef<ToolRow>[] = [
  { id: "tool", header: "Tool", accessorFn: (r) => r.tool, filter: "select", width: 180 },
  { id: "agent", header: "Agent", accessorFn: (r) => r.agent, filter: "select", width: 190 },
  { id: "why", header: "Cost reason", accessorFn: (r) => r.why, filter: "select", width: 120 },
  { id: "calls", header: "Calls", accessorFn: (r) => r.calls, filter: "number", width: 80, align: "right" },
  { id: "failures", header: "Failures", accessorFn: (r) => r.failures, filter: "number", width: 80, align: "right" },
  { id: "total_ms", header: "Total ms", accessorFn: (r) => r.total_ms, filter: "number", width: 100, align: "right" },
  { id: "errors", header: "Errors", accessorFn: (r) => r.errors, width: 420 },
];

const FETCH_COLUMNS: MatrxColumnDef<FetchRow>[] = [
  { id: "target", header: "Fetched by tool", accessorFn: (r) => r.target, filter: "select", width: 280 },
  { id: "agent", header: "Agent", accessorFn: (r) => r.agent, filter: "select", width: 190 },
  { id: "count", header: "Times", accessorFn: (r) => r.count, filter: "number", width: 80, align: "right" },
  { id: "failures", header: "Failed", accessorFn: (r) => r.failures, filter: "number", width: 80, align: "right" },
];

function toolRows(runs: RunEvidence[]): ToolRow[] {
  return runs.flatMap((r) =>
    r.tools.map((t) => ({
      id: `${r.request_id}:${t.name}`,
      request_id: r.request_id,
      agent: agentOf(r),
      why: r.why,
      tool: t.name,
      calls: t.count,
      failures: t.failures,
      total_ms: t.total_ms,
      errors: t.errors.join(" | "),
    })),
  );
}

function fetchRows(runs: RunEvidence[]): FetchRow[] {
  return runs.flatMap((r) =>
    r.context_fetched.map((f) => ({
      id: `${r.request_id}:${f.target}`,
      agent: agentOf(r),
      target: f.target,
      count: f.count,
      failures: f.failures,
    })),
  );
}

type View = "runs" | "tools" | "fetched";

export function SurfaceEvidencePage() {
  const [sourceFeature, setSourceFeature] = useState("notes");
  const [uiSurface, setUiSurface] = useState("matrx-user/notes");
  const [days, setDays] = useState("");
  const [excludeTests, setExcludeTests] = useState(false);
  const [query, setQuery] = useState<SurfaceEvidenceQuery>({ source_feature: "notes", ui_surface: "matrx-user/notes" });
  const [data, setData] = useState<SurfaceEvidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("runs");

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    fetchSurfaceEvidence(query)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e: unknown) => {
        if (live) setError(extractErrorMessage(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [query]);

  const load = () =>
    setQuery({
      source_feature: sourceFeature.trim() || undefined,
      ui_surface: uiSurface.trim() || undefined,
      days: days.trim() ? Number(days) : undefined,
      exclude_test_accounts: excludeTests,
    });

  const runs = data?.runs ?? [];
  const source = data?.hit_max_runs ? { cap: runs.length } : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* ui-exception: raw keys (source_feature / surface name), not prose */}
        <Field width="sm" value={sourceFeature} onChange={(e) => setSourceFeature(e.target.value)} placeholder="Source feature" aria-label="Source feature" />
        <Field width="md" value={uiSurface} onChange={(e) => setUiSurface(e.target.value)} placeholder="Page surface" aria-label="Page surface" />
        <Field width="xs" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} placeholder="Days" aria-label="Days" />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={excludeTests} onCheckedChange={setExcludeTests} aria-label="Leave out test accounts" />
          Leave out test accounts
        </label>
        <Button variant="primary" onClick={load} disabled={loading}>
          Load
        </Button>
      </div>

      {data ? (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {[
            ["Runs", String(runs.length)],
            ["Agents", String(new Set(runs.map(agentOf)).size)],
            ["Total", data.cost.total_display],
            ["Median", data.cost.p50_display],
            ["90th", data.cost.p90_display],
            ["Most", data.cost.max_display],
            ...Object.entries(data.why_counts)
              .filter(([, n]) => n > 0)
              .map(([k, n]) => [k.replace("_", " "), String(n)]),
          ].map(([label, value]) => (
            <div key={label} className="flex gap-1.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <Tabs<View>
        aria-label="View"
        value={view}
        onValueChange={setView}
        data={[
          { value: "runs", label: "Runs", count: runs.length },
          { value: "tools", label: "Tools" },
          { value: "fetched", label: "Fetched context" },
        ]}
      />

      {error ? (
        <ReadFailure error={new Error(error)} what="the surface's runs" onRetry={() => setQuery({ ...query })} />
      ) : (
        <div className="min-h-0 flex-1">
          {view === "runs" ? (
            <MatrxDataTable
              tableId="admin-run-evidence-runs"
              data={runs}
              columns={RUN_COLUMNS}
              getRowId={(r) => r.request_id}
              isLoading={loading}
              stickyHeader
              density="condensed"
              pageSize={100}
              defaultSort={{ id: "cost", direction: "desc" }}
              coverage={{ noun: "run", answeredBy: "client", loaded: runs.length, total: loading ? undefined : runs.length }}
              toolbar={{ title: "Runs", search: true }}
              drill={{
                local: true,
                source,
                levels: {
                  agent: { breakouts: ["why", "mandate", "person", "created:day"], show: ["count", "sum_cost", "sum_tool_calls", "sum_tool_failures"] },
                  why: { breakouts: ["agent", "mandate"], show: ["count", "sum_cost", "sum_tool_calls"] },
                },
              }}
              emptyState={{ title: "No runs on this surface", description: "Widen the window or name another surface." }}
            />
          ) : view === "tools" ? (
            <MatrxDataTable
              tableId="admin-run-evidence-tools"
              data={toolRows(runs)}
              columns={TOOL_COLUMNS}
              getRowId={(r) => r.id}
              isLoading={loading}
              stickyHeader
              density="condensed"
              pageSize={100}
              defaultSort={{ id: "failures", direction: "desc" }}
              toolbar={{ title: "Tool use", search: true }}
              drill={{
                local: true,
                source,
                levels: {
                  tool: { breakouts: ["agent", "why"], show: ["count", "sum_calls", "sum_failures", "sum_total_ms"] },
                  agent: { breakouts: ["tool", "why"], show: ["count", "sum_calls", "sum_failures"] },
                },
              }}
              emptyState={{ title: "No tool calls", description: "No run in this window called a tool." }}
            />
          ) : (
            <MatrxDataTable
              tableId="admin-run-evidence-fetched"
              data={fetchRows(runs)}
              columns={FETCH_COLUMNS}
              getRowId={(r) => r.id}
              isLoading={loading}
              stickyHeader
              density="condensed"
              pageSize={100}
              defaultSort={{ id: "count", direction: "desc" }}
              toolbar={{ title: "Fetched context", search: true }}
              drill={{ local: true, source, levels: { target: { breakouts: ["agent"], show: ["count", "sum_count", "sum_failures"] } } }}
              emptyState={{ title: "Nothing fetched by tool", description: "Every run used only what it was handed." }}
            />
          )}
        </div>
      )}
    </div>
  );
}
