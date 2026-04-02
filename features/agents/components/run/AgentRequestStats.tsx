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
} from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
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
// Collapsed pill row
// =============================================================================

function CollapsedRowWithClient({
  stats,
  clientMetrics,
  onExpand,
}: {
  stats: CompletionStats;
  clientMetrics: ClientMetrics | undefined;
  onExpand: () => void;
}) {
  const total = stats.total_usage?.total;
  const timing = stats.timing_stats;

  return (
    <button
      type="button"
      onClick={onExpand}
      className="w-full flex items-center gap-3 px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
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
    <div className="space-y-3 p-3">
      {/* Token usage */}
      {total && (
        <section>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Token Usage
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Input", value: fmtTokens(total.input_tokens) },
              { label: "Output", value: fmtTokens(total.output_tokens) },
              { label: "Cached", value: fmtTokens(total.cached_input_tokens) },
              { label: "Total", value: fmtTokens(total.total_tokens) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-muted/40 rounded p-1.5 text-center"
              >
                <div className="text-xs font-semibold">{value}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Per-model breakdown */}
      {Object.keys(byModel).length > 0 && (
        <section>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Cpu className="w-3 h-3" /> Models
          </h4>
          <div className="space-y-1">
            {Object.entries(byModel).map(([modelName, usage]) => (
              <div
                key={modelName}
                className="flex items-center justify-between text-xs px-2 py-1 bg-muted/30 rounded"
              >
                <span className="font-mono text-[11px] text-foreground/80 truncate max-w-[140px]">
                  {modelName}
                </span>
                <span className="text-muted-foreground text-[10px] shrink-0">
                  {usage.api}
                </span>
                <span className="shrink-0">
                  {fmtTokens(usage.total_tokens)} tok
                </span>
                {usage.cost > 0 && (
                  <span className="shrink-0 text-muted-foreground">
                    {fmtCost(usage.cost)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timing */}
      {timing && (
        <section>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Timing
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total", value: fmtDuration(timing.total_duration) },
              { label: "API", value: fmtDuration(timing.api_duration) },
              { label: "Tools", value: fmtDuration(timing.tool_duration) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-muted/40 rounded p-1.5 text-center"
              >
                <div className="text-xs font-semibold">{value}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tools */}
      {tools && tools.total_tool_calls > 0 && (
        <section>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Wrench className="w-3 h-3" /> Tool Calls
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/40 rounded p-1.5 text-center">
              <div className="text-xs font-semibold">
                {tools.total_tool_calls}
              </div>
              <div className="text-[10px] text-muted-foreground">Total</div>
            </div>
            <div className="bg-muted/40 rounded p-1.5 text-center">
              <div className="text-xs font-semibold">
                {tools.iterations_with_tools}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Iterations
              </div>
            </div>
          </div>
          {Object.keys(tools.by_tool).length > 0 && (
            <div className="mt-1 space-y-0.5">
              {Object.entries(tools.by_tool).map(([name, info]) => (
                <div
                  key={name}
                  className="flex items-center justify-between text-[11px] px-2 py-0.5 bg-muted/20 rounded"
                >
                  <span className="font-mono text-foreground/80">{name}</span>
                  <span className="text-muted-foreground">
                    {typeof info === "object" && info !== null
                      ? JSON.stringify(info)
                      : String(info)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Status + finish reason */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
        <span>
          Status: <span className="text-foreground">{stats.status}</span>
        </span>
        <span>
          Finish: <FinishBadge reason={stats.finish_reason} />
        </span>
        {stats.iterations > 1 && (
          <span>
            Iterations:{" "}
            <span className="text-foreground">{stats.iterations}</span>
          </span>
        )}
      </div>
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
      <div className="p-3 text-xs text-muted-foreground">No data yet.</div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {/* Session totals */}
      <section>
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
          <BarChart2 className="w-3 h-3" /> Session Totals
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Requests", value: String(aggregate.requestCount) },
            { label: "Tokens", value: fmtTokens(aggregate.totalTokens) },
            { label: "Cost", value: fmtCost(aggregate.totalCost) },
            { label: "Duration", value: fmtDuration(aggregate.totalDuration) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted/40 rounded p-1.5 text-center">
              <div className="text-xs font-semibold">{value}</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Per-turn history */}
      {assistantTurns.length > 1 && (
        <section>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Per-Request Breakdown
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {assistantTurns.map((turn, idx) => {
              const s = turn.completionStats;
              const t = s?.total_usage?.total;
              return (
                <div
                  key={turn.turnId}
                  className="flex items-center gap-3 text-[11px] px-2 py-1 bg-muted/30 rounded"
                >
                  <span className="text-muted-foreground shrink-0">
                    #{idx + 1}
                  </span>
                  {s && (
                    <>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                        {fmtDuration(s.timing_stats?.total_duration ?? 0)}
                      </span>
                      {t && (
                        <span className="flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5 text-muted-foreground" />
                          {fmtTokens(t.total_tokens)}
                        </span>
                      )}
                      {t && t.total_cost > 0 && (
                        <span className="text-muted-foreground">
                          {fmtCost(t.total_cost)}
                        </span>
                      )}
                      <FinishBadge reason={s.finish_reason} />
                    </>
                  )}
                  {!s && (
                    <span className="text-muted-foreground/50">no stats</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
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

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={`text-[11px] font-mono tabular-nums ${highlight ? "text-primary font-semibold" : "text-foreground"}`}
      >
        {value}
      </span>
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
      <div className="p-3 text-xs text-muted-foreground text-center">
        No client metrics yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {/* Timing */}
      <section>
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Client Timing
        </h4>
        <div className="space-y-0.5">
          <StatRow
            label="Internal latency (submit → conv ID)"
            value={fmtMs(metrics.internalLatencyMs)}
            highlight={
              metrics.internalLatencyMs != null &&
              metrics.internalLatencyMs > 500
            }
          />
          <StatRow
            label="Time to first token (submit → chunk 1)"
            value={fmtMs(metrics.ttftMs)}
            highlight
          />
          <StatRow
            label="Stream duration (chunk 1 → stream end)"
            value={fmtMs(metrics.streamDurationMs)}
          />
          <StatRow
            label="Render delay (stream end → Redux commit)"
            value={fmtMs(metrics.renderDelayMs)}
            highlight={
              metrics.renderDelayMs != null && metrics.renderDelayMs > 200
            }
          />
          <StatRow
            label="Total client duration"
            value={fmtMs(metrics.totalClientDurationMs)}
          />
        </div>
      </section>

      {/* Data volume */}
      <section>
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
          <Database className="w-3 h-3" /> Data Volume (Last Request)
        </h4>
        <div className="space-y-0.5">
          <StatRow
            label="Response text"
            value={fmtBytes(metrics.accumulatedTextBytes)}
          />
          <StatRow
            label="Total payload (all events)"
            value={fmtBytes(metrics.totalPayloadBytes)}
          />
          <StatRow label="Total events" value={String(metrics.totalEvents)} />
          <StatRow label="Chunk events" value={String(metrics.chunkEvents)} />
          <StatRow label="Data events" value={String(metrics.dataEvents)} />
          <StatRow label="Tool events" value={String(metrics.toolEvents)} />
          <StatRow
            label="Block events"
            value={String(metrics.contentBlockEvents)}
          />
          <StatRow
            label="Status events"
            value={String(metrics.statusUpdateEvents)}
          />
          <StatRow label="Other events" value={String(metrics.otherEvents)} />
        </div>
      </section>

      {/* Session averages (only if > 1 request) */}
      {aggregateClient.totalRequests > 1 && (
        <section>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Radio className="w-3 h-3" /> Session Averages (
            {aggregateClient.totalRequests} requests)
          </h4>
          <div className="space-y-0.5">
            <StatRow
              label="Avg TTFT"
              value={fmtMs(aggregateClient.avgTtftMs)}
            />
            <StatRow
              label="Avg internal latency"
              value={fmtMs(aggregateClient.avgInternalLatencyMs)}
            />
            <StatRow
              label="Avg total duration"
              value={fmtMs(aggregateClient.avgTotalDurationMs)}
            />
            <StatRow
              label="Total payload received"
              value={fmtBytes(aggregateClient.totalPayloadBytes)}
            />
            <StatRow
              label="Total text received"
              value={fmtBytes(aggregateClient.totalTextBytes)}
            />
            <StatRow
              label="Total events"
              value={String(aggregateClient.totalEvents)}
            />
          </div>
        </section>
      )}
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

interface AgentRequestStatsProps {
  instanceId: string;
}

export function AgentRequestStats({ instanceId }: AgentRequestStatsProps) {
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

  // Nothing to show until at least one turn has completed
  if (!latestStats) return null;

  if (!isExpanded) {
    return (
      <div className="border-t border-border">
        <CollapsedRowWithClient
          stats={latestStats}
          clientMetrics={latestClientMetrics}
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

        {/* Collapse button */}
        <button
          type="button"
          onClick={handleCollapse}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Collapse"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab content — max height with scroll */}
      <div className="max-h-72 overflow-y-auto">
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
