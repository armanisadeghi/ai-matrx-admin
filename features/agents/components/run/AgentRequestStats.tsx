"use client";

/**
 * AgentRequestStats
 *
 * A collapsible stats bar displayed between the conversation and the input area.
 * Shows per-request and session-aggregate usage data from the server's
 * completion payload.
 *
 * Collapsed (default): single compact row — duration, tokens, cost, finish reason.
 * Expanded: tabbed panel with full model breakdown, timing, tool call stats,
 *           and per-turn session history.
 *
 * Renders null until the first assistant turn with completionStats is committed.
 */

import { useState, useCallback } from "react";
import {
  Clock,
  Zap,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Cpu,
  Wrench,
  BarChart2,
  Radio,
  Database,
  RotateCcw,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { createManualInstance } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import {
  selectLatestCompletionStats,
  selectAggregateStats,
  selectConversationTurns,
  selectLatestClientMetrics,
  selectAggregateClientMetrics,
} from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import type { AggregateClientMetrics } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import type { CompletionStats } from "@/features/agents/types/instance.types";
import type { ClientMetrics } from "@/features/agents/types/request.types";

// =============================================================================
// Helpers
// =============================================================================

function fmtDuration(seconds: number): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  return `${seconds.toFixed(1)}s`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.001) return `$${cost.toFixed(6)}`;
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(4)}`;
}

function FinishBadge({ reason }: { reason: string }) {
  const isStop = reason === "stop" || reason === "end_turn";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
        isStop
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      }`}
    >
      {isStop ? (
        <CheckCircle className="w-2.5 h-2.5" />
      ) : (
        <AlertCircle className="w-2.5 h-2.5" />
      )}
      {reason}
    </span>
  );
}

// =============================================================================
// Self-contained reset button — owns its own dispatch logic
// =============================================================================

function ResetButton({
  instanceId,
  agentId,
  onNewInstance,
}: {
  instanceId: string;
  agentId: string;
  onNewInstance: (newId: string) => void;
}) {
  const dispatch = useAppDispatch();

  const handleReset = useCallback(() => {
    dispatch(destroyInstance(instanceId));
    dispatch(createManualInstance({ agentId, autoClearConversation: true }))
      .unwrap()
      .then(onNewInstance)
      .catch((err) => console.error("Failed to reset test instance:", err));
  }, [instanceId, agentId, onNewInstance, dispatch]);

  return (
    <button
      type="button"
      onClick={handleReset}
      className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
      title="Reset conversation"
    >
      <RotateCcw className="w-3.5 h-3.5" />
    </button>
  );
}

// =============================================================================
// Collapsed pill row
// =============================================================================

function CollapsedRowWithClient({
  stats,
  clientMetrics,
  instanceId,
  agentId,
  onNewInstance,
  onExpand,
}: {
  stats: CompletionStats;
  clientMetrics: ClientMetrics | undefined;
  instanceId: string;
  agentId: string;
  onNewInstance: (newId: string) => void;
  onExpand: () => void;
}) {
  const total = stats.total_usage?.total;
  const timing = stats.timing_stats;

  return (
    <div className="flex items-center gap-1 px-3 py-1">
      <button
        type="button"
        onClick={onExpand}
        className="flex-1 flex items-center gap-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors rounded px-1 py-0.5"
      >
        {/* Server duration */}
        {timing && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {fmtDuration(timing.total_duration)}
          </span>
        )}

        {/* TTFT — client-side, most useful metric for perceived speed */}
        {clientMetrics?.ttftMs != null && (
          <span
            className="flex items-center gap-1 text-primary/80"
            title="Time to first token (client perspective)"
          >
            <Radio className="w-3 h-3" />
            {fmtMs(clientMetrics.ttftMs)} ttft
          </span>
        )}

        {/* Tokens */}
        {total && (
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {fmtTokens(total.total_tokens)} tokens
            {total.cached_input_tokens > 0 && (
              <span className="text-[10px] text-muted-foreground/60">
                ({fmtTokens(total.cached_input_tokens)} cached)
              </span>
            )}
          </span>
        )}

        {/* Cost */}
        {total && total.total_cost > 0 && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {fmtCost(total.total_cost)}
          </span>
        )}

        {/* Finish reason */}
        <FinishBadge reason={stats.finish_reason} />

        {/* Iterations if > 1 */}
        {stats.iterations > 1 && (
          <span className="text-[10px] text-muted-foreground/70">
            {stats.iterations} iter
          </span>
        )}

        <ChevronDown className="w-3 h-3 ml-auto shrink-0" />
      </button>

      <ResetButton
        instanceId={instanceId}
        agentId={agentId}
        onNewInstance={onNewInstance}
      />
    </div>
  );
}

// =============================================================================
// Shared table primitives
// =============================================================================

function TableSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 border-b border-border">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
          {title}
        </span>
      </div>
      <table className="w-full text-xs">{children}</table>
    </div>
  );
}

function TR({
  label,
  value,
  mono,
  dim,
  highlight,
  idx,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  dim?: boolean;
  highlight?: boolean;
  idx: number;
}) {
  return (
    <tr className={idx % 2 === 0 ? "bg-muted/20" : ""}>
      <td className="px-3 py-1 text-muted-foreground whitespace-nowrap w-1/2">
        {label}
      </td>
      <td
        className={`px-3 py-1 text-right tabular-nums whitespace-nowrap ${
          mono ? "font-mono" : ""
        } ${dim ? "text-muted-foreground" : ""} ${
          highlight ? "text-primary font-semibold" : "text-foreground"
        }`}
      >
        {value}
      </td>
    </tr>
  );
}

// =============================================================================
// Expanded panel — Last Request tab
// =============================================================================

function LastRequestPanel({ stats }: { stats: CompletionStats }) {
  const total = stats.total_usage?.total;
  const byModel = stats.total_usage?.by_model ?? {};
  const timing = stats.timing_stats;
  const tools = stats.tool_call_stats;

  return (
    <div className="divide-y divide-border">
      {/* Summary strip */}
      <div className="flex items-center gap-4 px-3 py-2 bg-muted/10 text-xs flex-wrap">
        {timing && (
          <span className="flex items-center gap-1 text-foreground">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="font-mono font-semibold">
              {fmtDuration(timing.total_duration)}
            </span>
            <span className="text-muted-foreground">total</span>
          </span>
        )}
        {total && (
          <>
            <span className="flex items-center gap-1 text-foreground">
              <Zap className="w-3 h-3 text-muted-foreground" />
              <span className="font-mono font-semibold">
                {fmtTokens(total.total_tokens)}
              </span>
              <span className="text-muted-foreground">
                tokens ({fmtTokens(total.input_tokens)} in /{" "}
                {fmtTokens(total.output_tokens)} out
                {total.cached_input_tokens > 0
                  ? ` / ${fmtTokens(total.cached_input_tokens)} cached`
                  : ""}
                )
              </span>
            </span>
            {total.total_cost > 0 && (
              <span className="flex items-center gap-1 text-foreground">
                <DollarSign className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono font-semibold">
                  {fmtCost(total.total_cost)}
                </span>
              </span>
            )}
          </>
        )}
        <span className="ml-auto flex items-center gap-2">
          <FinishBadge reason={stats.finish_reason} />
          {stats.iterations > 1 && (
            <span className="text-muted-foreground">
              {stats.iterations} iter
            </span>
          )}
        </span>
      </div>

      {/* Timing breakdown */}
      {timing && (
        <TableSection icon={<Clock className="w-3 h-3" />} title="Timing">
          <tbody>
            {[
              {
                label: "Total duration",
                value: fmtDuration(timing.total_duration),
              },
              {
                label: "API duration",
                value: fmtDuration(timing.api_duration),
              },
              {
                label: "Tool duration",
                value: fmtDuration(timing.tool_duration),
              },
            ].map(({ label, value }, i) => (
              <TR key={label} idx={i} label={label} value={value} mono />
            ))}
          </tbody>
        </TableSection>
      )}

      {/* Per-model breakdown */}
      {Object.keys(byModel).length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 border-b border-border">
            <Cpu className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
              Models
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-3 py-1 text-left font-medium text-muted-foreground">
                  Model
                </th>
                <th className="px-3 py-1 text-left font-medium text-muted-foreground">
                  API
                </th>
                <th className="px-3 py-1 text-right font-medium text-muted-foreground">
                  Tokens
                </th>
                <th className="px-3 py-1 text-right font-medium text-muted-foreground">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byModel).map(([modelName, usage], i) => (
                <tr
                  key={modelName}
                  className={i % 2 === 0 ? "bg-muted/20" : ""}
                >
                  <td className="px-3 py-1 font-mono text-foreground/80 truncate max-w-[160px]">
                    {modelName}
                  </td>
                  <td className="px-3 py-1 text-muted-foreground">
                    {usage.api}
                  </td>
                  <td className="px-3 py-1 text-right font-mono tabular-nums">
                    {fmtTokens(usage.total_tokens)}
                  </td>
                  <td className="px-3 py-1 text-right font-mono tabular-nums text-muted-foreground">
                    {usage.cost > 0 ? fmtCost(usage.cost) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tool calls */}
      {tools && tools.total_tool_calls > 0 && (
        <TableSection icon={<Wrench className="w-3 h-3" />} title="Tool Calls">
          <tbody>
            <TR
              idx={0}
              label="Total calls"
              value={tools.total_tool_calls}
              mono
            />
            <TR
              idx={1}
              label="Iterations with tools"
              value={tools.iterations_with_tools}
              mono
            />
            {Object.entries(tools.by_tool).map(([name, info], i) => (
              <TR
                key={name}
                idx={i + 2}
                label={name}
                value={
                  typeof info === "object" && info !== null
                    ? JSON.stringify(info)
                    : String(info)
                }
                mono
                dim
              />
            ))}
          </tbody>
        </TableSection>
      )}
    </div>
  );
}

// =============================================================================
// Expanded panel — Session tab
// =============================================================================

function SessionPanel({ instanceId }: { instanceId: string }) {
  const aggregate = useAppSelector(selectAggregateStats(instanceId));
  const turns = useAppSelector(selectConversationTurns(instanceId));
  const assistantTurns = turns.filter((t) => t.role === "assistant");

  if (aggregate.requestCount === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground">No data yet.</div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {/* Session totals summary strip */}
      <div className="flex items-center gap-5 px-3 py-2 bg-muted/10 text-xs flex-wrap">
        <span className="flex items-center gap-1">
          <BarChart2 className="w-3 h-3 text-muted-foreground" />
          <span className="font-mono font-semibold text-foreground">
            {aggregate.requestCount}
          </span>
          <span className="text-muted-foreground">requests</span>
        </span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-muted-foreground" />
          <span className="font-mono font-semibold text-foreground">
            {fmtTokens(aggregate.totalTokens)}
          </span>
          <span className="text-muted-foreground">tokens</span>
        </span>
        {aggregate.totalCost > 0 && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            <span className="font-mono font-semibold text-foreground">
              {fmtCost(aggregate.totalCost)}
            </span>
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="font-mono font-semibold text-foreground">
            {fmtDuration(aggregate.totalDuration)}
          </span>
          <span className="text-muted-foreground">total time</span>
        </span>
      </div>

      {/* Per-turn history table */}
      {assistantTurns.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 border-b border-border">
            <BarChart2 className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
              Per-Request Breakdown
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-3 py-1 text-left font-medium text-muted-foreground w-8">
                  #
                </th>
                <th className="px-3 py-1 text-right font-medium text-muted-foreground">
                  Duration
                </th>
                <th className="px-3 py-1 text-right font-medium text-muted-foreground">
                  Tokens
                </th>
                <th className="px-3 py-1 text-right font-medium text-muted-foreground">
                  In / Out
                </th>
                <th className="px-3 py-1 text-right font-medium text-muted-foreground">
                  Cost
                </th>
                <th className="px-3 py-1 text-center font-medium text-muted-foreground">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {assistantTurns.map((turn, idx) => {
                const s = turn.completionStats;
                const t = s?.total_usage?.total;
                return (
                  <tr
                    key={turn.turnId}
                    className={idx % 2 === 0 ? "bg-muted/20" : ""}
                  >
                    <td className="px-3 py-1 text-muted-foreground font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-1 text-right font-mono tabular-nums">
                      {s
                        ? fmtDuration(s.timing_stats?.total_duration ?? 0)
                        : "—"}
                    </td>
                    <td className="px-3 py-1 text-right font-mono tabular-nums">
                      {t ? fmtTokens(t.total_tokens) : "—"}
                    </td>
                    <td className="px-3 py-1 text-right font-mono tabular-nums text-muted-foreground text-[11px]">
                      {t
                        ? `${fmtTokens(t.input_tokens)} / ${fmtTokens(t.output_tokens)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-1 text-right font-mono tabular-nums text-muted-foreground">
                      {t && t.total_cost > 0 ? fmtCost(t.total_cost) : "—"}
                    </td>
                    <td className="px-3 py-1 text-center">
                      {s ? (
                        <FinishBadge reason={s.finish_reason} />
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// =============================================================================
// Client Metrics Panel — "Client" tab
// =============================================================================

function ClientTableCol({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: Array<{ label: string; value: string; highlight?: boolean }>;
}) {
  return (
    <div className="flex-1 min-w-0 border-r border-border last:border-r-0">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 border-b border-border">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
          {title}
        </span>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {rows.map(({ label, value, highlight }, i) => (
            <tr key={label} className={i % 2 === 0 ? "bg-muted/20" : ""}>
              <td className="px-3 py-1 text-muted-foreground">{label}</td>
              <td
                className={`px-3 py-1 text-right font-mono tabular-nums whitespace-nowrap ${
                  highlight ? "text-primary font-semibold" : "text-foreground"
                }`}
              >
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientPanel({
  metrics,
  aggregateClient,
}: {
  metrics: ClientMetrics | undefined;
  aggregateClient: AggregateClientMetrics;
}) {
  if (!metrics) {
    return (
      <div className="p-4 text-xs text-muted-foreground text-center">
        No client metrics yet.
      </div>
    );
  }

  const timingRows = [
    {
      label: "Internal latency",
      value: fmtMs(metrics.internalLatencyMs),
      highlight:
        metrics.internalLatencyMs != null && metrics.internalLatencyMs > 500,
    },
    {
      label: "Time to first token",
      value: fmtMs(metrics.ttftMs),
      highlight: true,
    },
    { label: "Stream duration", value: fmtMs(metrics.streamDurationMs) },
    {
      label: "Render delay",
      value: fmtMs(metrics.renderDelayMs),
      highlight: metrics.renderDelayMs != null && metrics.renderDelayMs > 200,
    },
    {
      label: "Total client duration",
      value: fmtMs(metrics.totalClientDurationMs),
    },
  ];

  const dataRows = [
    { label: "Response text", value: fmtBytes(metrics.accumulatedTextBytes) },
    { label: "Total payload", value: fmtBytes(metrics.totalPayloadBytes) },
    { label: "Total events", value: String(metrics.totalEvents) },
    { label: "Chunk events", value: String(metrics.chunkEvents) },
    { label: "Data events", value: String(metrics.dataEvents) },
    { label: "Tool events", value: String(metrics.toolEvents) },
    { label: "Block events", value: String(metrics.contentBlockEvents) },
    { label: "Status events", value: String(metrics.statusUpdateEvents) },
    { label: "Other events", value: String(metrics.otherEvents) },
  ];

  return (
    <div className="divide-y divide-border">
      {/* Two-column layout: Timing | Data Volume */}
      <div className="flex">
        <ClientTableCol
          icon={<Clock className="w-3 h-3" />}
          title="Client Timing"
          rows={timingRows}
        />
        <ClientTableCol
          icon={<Database className="w-3 h-3" />}
          title="Data Volume"
          rows={dataRows}
        />
      </div>

      {/* Session averages — full-width when present */}
      {aggregateClient.totalRequests > 1 && (
        <TableSection
          icon={<Radio className="w-3 h-3" />}
          title={`Session Averages (${aggregateClient.totalRequests} requests)`}
        >
          <tbody>
            {[
              {
                label: "Avg TTFT",
                value: fmtMs(aggregateClient.avgTtftMs),
                highlight: true,
              },
              {
                label: "Avg internal latency",
                value: fmtMs(aggregateClient.avgInternalLatencyMs),
              },
              {
                label: "Avg total duration",
                value: fmtMs(aggregateClient.avgTotalDurationMs),
              },
              {
                label: "Total payload received",
                value: fmtBytes(aggregateClient.totalPayloadBytes),
              },
              {
                label: "Total text received",
                value: fmtBytes(aggregateClient.totalTextBytes),
              },
              {
                label: "Total events",
                value: String(aggregateClient.totalEvents),
              },
            ].map(({ label, value, highlight }, i) => (
              <TR
                key={label}
                idx={i}
                label={label}
                value={value}
                mono
                highlight={highlight}
              />
            ))}
          </tbody>
        </TableSection>
      )}
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

interface AgentRequestStatsProps {
  instanceId: string;
  agentId: string;
  onNewInstance: (newId: string) => void;
}

export function AgentRequestStats({
  instanceId,
  agentId,
  onNewInstance,
}: AgentRequestStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"last" | "session" | "client">(
    "last",
  );

  const latestStats = useAppSelector(selectLatestCompletionStats(instanceId));
  const aggregate = useAppSelector(selectAggregateStats(instanceId));
  const latestClientMetrics = useAppSelector(
    selectLatestClientMetrics(instanceId),
  );
  const aggregateClientMetrics = useAppSelector(
    selectAggregateClientMetrics(instanceId),
  );

  const handleExpand = useCallback(() => setIsExpanded(true), []);
  const handleCollapse = useCallback(() => setIsExpanded(false), []);

  if (!latestStats) return null;

  if (!isExpanded) {
    return (
      <div className="border-t border-border">
        <CollapsedRowWithClient
          stats={latestStats}
          clientMetrics={latestClientMetrics}
          instanceId={instanceId}
          agentId={agentId}
          onNewInstance={onNewInstance}
          onExpand={handleExpand}
        />
      </div>
    );
  }

  const tabs: Array<{ id: "last" | "session" | "client"; label: string }> = [
    { id: "last", label: "Last Request" },
    { id: "session", label: `Session (${aggregate.requestCount})` },
    { id: "client", label: "Client Metrics" },
  ];

  return (
    <div className="border-t border-border bg-card">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-border">
        {/* Tabs */}
        <div className="flex items-center gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Collapse + Reset */}
        <div className="flex items-center gap-1">
          <ResetButton
            instanceId={instanceId}
            agentId={agentId}
            onNewInstance={(newId) => {
              onNewInstance(newId);
              setIsExpanded(false);
            }}
          />
          <button
            type="button"
            onClick={handleCollapse}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="Collapse"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab content — fixed height, always scrollable */}
      <div className="h-72 overflow-y-auto">
        {activeTab === "last" && <LastRequestPanel stats={latestStats} />}
        {activeTab === "session" && <SessionPanel instanceId={instanceId} />}
        {activeTab === "client" && (
          <ClientPanel
            metrics={latestClientMetrics}
            aggregateClient={aggregateClientMetrics}
          />
        )}
      </div>
    </div>
  );
}
