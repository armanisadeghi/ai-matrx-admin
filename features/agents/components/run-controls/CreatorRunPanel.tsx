"use client";

/**
 * CreatorRunPanel — Creator Run Panel
 *
 * A collapsible, always-visible tabbed panel between conversation and input.
 * Collapsed: single compact row with "Creator Panel" + stats pills.
 * Expanded: fixed-height tabbed panel (h-72).
 *
 * Tabs:
 *   Actions | Run Settings | System Prompt | Last Request | Session | Client
 */

import { useState, useCallback, useRef } from "react";
import {
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Cpu,
  BarChart2,
  Radio,
  Database,
  RotateCcw,
  AppWindow,
  SlidersHorizontal,
  Layers,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { shallowEqual } from "react-redux";
import {
  restoreWindow,
  focusWindow,
  selectWindow,
} from "@/lib/redux/slices/windowManagerSlice";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startNewConversation } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { setBuilderAdvancedSettings } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { selectUseStructuredSystemInstruction } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { RunSettingsEditor } from "./RunSettingsEditor";
import {
  selectLatestCompletionStats,
  selectAggregateStats,
  selectConversationTurns,
  selectLatestClientMetrics,
  selectAggregateClientMetrics,
  selectConversationTitle,
} from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import type { AggregateClientMetrics } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import type { CompletionStats } from "@/features/agents/types/instance.types";
import type { ClientMetrics } from "@/features/agents/types/request.types";
import { selectLatestRequestId } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import {
  selectTimelineDerivedTiming,
  type TimelineDerivedTiming,
} from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import { selectAllInstanceIds } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.selectors";
import { SystemInstructionEditor } from "../builder/message-builders/system-instructions/SystemInstructionEditor";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { StreamDebugPanel } from "../debug/StreamDebugPanel";
import { AgentLauncherSidebarTester } from "./AgentLauncherSidebarTester";
import { AgentExecutionTestModal } from "./AgentExecutionTestModal";
import * as LucideIcons from "lucide-react";
import {
  getAllDisplayTypes,
  getDisplayMeta,
} from "@/features/agents/utils/run-ui-utils";
import { useAgentLauncherTester } from "@/features/agents/hooks/useAgentLauncherTester";
import {
  VARIABLE_INPUT_STYLE_OPTIONS,
  type VariableInputStyle,
} from "@/features/agents/types";

// =============================================================================
// Tab type
// =============================================================================

type TabId =
  | "actions"
  | "settings"
  | "sysprompt"
  | "last"
  | "session"
  | "client"
  | "test"
  | "test_displays";

// =============================================================================
// Helpers
// =============================================================================

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

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
// Tab 1: Actions
// =============================================================================

function ActionsTab({
  conversationId,
  surfaceKey,
  onOpenStreamDebugWindow,
  onOpenRunSettingsWindow,
}: {
  conversationId: string;
  surfaceKey: string;
  onOpenStreamDebugWindow: () => void;
  onOpenRunSettingsWindow: () => void;
}) {
  const dispatch = useAppDispatch();

  const handleReset = useCallback(() => {
    dispatch(
      startNewConversation({
        currentConversationId: conversationId,
        surfaceKey,
      }),
    )
      .unwrap()
      .catch((err) => console.error("Failed to reset test instance:", err));
  }, [conversationId, surfaceKey, dispatch]);

  const ActionButton = ({
    onClick,
    icon: Icon,
    label,
  }: {
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    label: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 w-[84px] h-[84px] text-muted-foreground hover:text-foreground bg-muted/10 hover:bg-muted/30 border border-transparent hover:border-border rounded-xl transition-all shrink-0"
    >
      <Icon className="w-7 h-7" />
      <span className="text-[10px] text-center leading-tight font-medium px-1">
        {label}
      </span>
    </button>
  );

  return (
    <div className="p-2 flex flex-wrap content-start gap-2 h-full overflow-y-auto">
      <ActionButton
        onClick={handleReset}
        icon={RotateCcw}
        label={
          <>
            Reset
            <br />
            Conversation
          </>
        }
      />
      <ActionButton
        onClick={onOpenStreamDebugWindow}
        icon={AppWindow}
        label={
          <>
            Debug
            <br />
            Window
          </>
        }
      />
      <ActionButton
        onClick={onOpenRunSettingsWindow}
        icon={SlidersHorizontal}
        label={
          <>
            Run
            <br />
            Settings
          </>
        }
      />
    </div>
  );
}

// =============================================================================
// Tab 2: Run Settings
// =============================================================================

function RunSettingsTab({ conversationId }: { conversationId: string }) {
  return (
    <div className="px-3 py-2">
      <RunSettingsEditor conversationId={conversationId} />
    </div>
  );
}

// =============================================================================
// Tab 3: System Prompt
// =============================================================================

function SystemPromptTab({ conversationId }: { conversationId: string }) {
  const dispatch = useAppDispatch();
  const isActive = useAppSelector(
    selectUseStructuredSystemInstruction(conversationId),
  );

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
        <Label
          htmlFor={`sysprompt-active-${conversationId}`}
          className="text-xs text-muted-foreground cursor-pointer"
        >
          Structured system prompt
        </Label>
        <Switch
          id={`sysprompt-active-${conversationId}`}
          checked={isActive}
          onCheckedChange={(v) =>
            dispatch(
              setBuilderAdvancedSettings({
                conversationId,
                changes: { useStructuredSystemInstruction: v },
              }),
            )
          }
          className="scale-75 origin-right"
        />
      </div>

      {isActive ? (
        <SystemInstructionEditor conversationId={conversationId} />
      ) : (
        <p className="text-xs text-muted-foreground/60">
          Enable to configure structured system instruction fields (intro,
          outro, content blocks, etc.)
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Tab 4: Last Request
// =============================================================================

function LastRequestContent({ stats }: { stats: CompletionStats | undefined }) {
  if (!stats) {
    return (
      <div className="p-4 text-xs text-muted-foreground text-center">
        No request data yet.
      </div>
    );
  }

  const totals = stats.total_usage?.total;
  const timing = stats.timing_stats;
  const tools = stats.tool_call_stats;
  const tokensIn = totals?.input_tokens ?? 0;
  const tokensOut = totals?.output_tokens ?? 0;
  const totalTokens = totals?.total_tokens ?? tokensIn + tokensOut;

  return (
    <div className="divide-y divide-border">
      <div className="flex items-center gap-4 px-3 py-2 bg-muted/10 text-xs flex-wrap">
        {timing?.total_duration != null && (
          <span className="flex items-center gap-1 text-foreground">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="font-mono font-semibold">
              {fmtMs(timing.total_duration * 1000)}
            </span>
            <span className="text-muted-foreground">total</span>
          </span>
        )}
        <span className="flex items-center gap-1 text-foreground">
          <Zap className="w-3 h-3 text-muted-foreground" />
          <span className="font-mono font-semibold">
            {fmtTokens(totalTokens)}
          </span>
          <span className="text-muted-foreground">
            tokens ({fmtTokens(tokensIn)} in / {fmtTokens(tokensOut)} out)
          </span>
        </span>
        <span className="ml-auto flex items-center gap-2">
          <FinishBadge reason={stats.finish_reason} />
          {(stats.iterations ?? 0) > 1 && (
            <span className="text-muted-foreground">
              {stats.iterations} iter
            </span>
          )}
        </span>
      </div>

      <TableSection icon={<Clock className="w-3 h-3" />} title="Summary">
        <tbody>
          {[
            {
              label: "Total duration",
              value:
                timing?.total_duration != null
                  ? fmtMs(timing.total_duration * 1000)
                  : "—",
            },
            {
              label: "API duration",
              value:
                timing?.api_duration != null
                  ? fmtMs(timing.api_duration * 1000)
                  : "—",
            },
            {
              label: "Tool duration",
              value:
                timing?.tool_duration != null
                  ? fmtMs(timing.tool_duration * 1000)
                  : "—",
            },
            { label: "Tokens in", value: fmtTokens(tokensIn) },
            { label: "Tokens out", value: fmtTokens(tokensOut) },
            { label: "Total tokens", value: fmtTokens(totalTokens) },
            {
              label: "Cost",
              value:
                totals?.total_cost != null
                  ? `$${totals.total_cost.toFixed(5)}`
                  : "—",
            },
            {
              label: "Iterations",
              value: String(stats.iterations ?? 1),
            },
            {
              label: "Tool calls",
              value: String(tools?.total_tool_calls ?? 0),
            },
            {
              label: "Finish reason",
              value: stats.finish_reason ?? "—",
            },
          ].map(({ label, value }, i) => (
            <TR key={label} idx={i} label={label} value={value} mono />
          ))}
        </tbody>
      </TableSection>
    </div>
  );
}

function LastRequestPanel({ conversationId }: { conversationId: string }) {
  const allInstanceIds = useAppSelector(selectAllInstanceIds, shallowEqual);
  const [selectedId, setSelectedId] = useState(conversationId);
  const effectiveId = allInstanceIds.includes(selectedId)
    ? selectedId
    : conversationId;

  const stats = useAppSelector(selectLatestCompletionStats(effectiveId));

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <InstancePicker
        allInstanceIds={allInstanceIds}
        selectedId={effectiveId}
        onSelect={setSelectedId}
        label="Instance"
      />
      <LastRequestContent stats={stats} />
    </div>
  );
}

// =============================================================================
// Instance picker — shared across Session / Last / Client tabs
// =============================================================================

function InstancePicker({
  allInstanceIds,
  selectedId,
  onSelect,
  label,
}: {
  allInstanceIds: string[];
  selectedId: string;
  onSelect: (id: string) => void;
  label?: string;
}) {
  if (allInstanceIds.length <= 1) return null;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border bg-muted/10 flex-wrap">
      <Layers className="w-3 h-3 text-muted-foreground shrink-0" />
      {label && (
        <span className="text-[10px] text-muted-foreground font-medium shrink-0">
          {label}:
        </span>
      )}
      {allInstanceIds.map((id, idx) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
            id === selectedId
              ? "bg-primary/20 text-primary border-primary/30"
              : "bg-muted/20 text-muted-foreground border-transparent hover:border-border/50"
          }`}
        >
          #{idx + 1} {id.slice(0, 8)}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Tab 5: Session — shows ALL instances
// =============================================================================

function SingleInstanceSession({
  conversationId,
  instanceLabel,
}: {
  conversationId: string;
  instanceLabel: string;
}) {
  const aggregate = useAppSelector(selectAggregateStats(conversationId));
  const turns = useAppSelector(selectConversationTurns(conversationId));
  const assistantTurns = turns.filter((t) => t.role === "assistant");

  if (aggregate.requestCount === 0) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground/60">
        No requests yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
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
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="font-mono font-semibold text-foreground">
            {fmtMs(aggregate.totalDurationMs)}
          </span>
          <span className="text-muted-foreground">total time</span>
        </span>
        {aggregate.totalIterations > 0 && (
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-muted-foreground" />
            <span className="font-mono font-semibold text-foreground">
              {aggregate.totalIterations}
            </span>
            <span className="text-muted-foreground">iterations</span>
          </span>
        )}
      </div>

      {assistantTurns.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 border-b border-border">
            <BarChart2 className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
              Per-Request Breakdown
            </span>
            <span className="text-[10px] text-muted-foreground/60 ml-auto font-mono">
              {instanceLabel}
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
                  Iterations
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
                const tokensTotal =
                  t?.total_tokens ??
                  (t?.input_tokens ?? 0) + (t?.output_tokens ?? 0);
                return (
                  <tr
                    key={turn.turnId}
                    className={idx % 2 === 0 ? "bg-muted/20" : ""}
                  >
                    <td className="px-3 py-1 text-muted-foreground font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-1 text-right font-mono tabular-nums">
                      {s?.timing_stats?.total_duration != null
                        ? fmtMs(s.timing_stats.total_duration * 1000)
                        : "—"}
                    </td>
                    <td className="px-3 py-1 text-right font-mono tabular-nums">
                      {t ? fmtTokens(tokensTotal) : "—"}
                    </td>
                    <td className="px-3 py-1 text-right font-mono tabular-nums text-muted-foreground text-[11px]">
                      {t
                        ? `${fmtTokens(t.input_tokens ?? 0)} / ${fmtTokens(t.output_tokens ?? 0)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-1 text-right font-mono tabular-nums text-muted-foreground">
                      {s ? `${s.iterations ?? 1} iter` : "—"}
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

function SessionPanel({ conversationId }: { conversationId: string }) {
  const allInstanceIds = useAppSelector(selectAllInstanceIds, shallowEqual);

  if (allInstanceIds.length === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground text-center">
        No session data yet.
      </div>
    );
  }

  const instancesWithData = allInstanceIds.filter(Boolean);

  return (
    <div className="divide-y divide-border">
      {/* Cross-instance summary header */}
      {allInstanceIds.length > 1 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border">
          <Layers className="w-3 h-3 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide">
            All Instances ({allInstanceIds.length})
          </span>
        </div>
      )}
      {instancesWithData.map((id, idx) => (
        <div key={id}>
          {allInstanceIds.length > 1 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/20 border-b border-border/50">
              <span className="text-[10px] font-mono text-muted-foreground/70">
                Instance #{idx + 1}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/50">
                {id.slice(0, 12)}
              </span>
              {id === conversationId && (
                <span className="text-[9px] text-primary/70 ml-1">
                  (current)
                </span>
              )}
            </div>
          )}
          <SingleInstanceSession
            conversationId={id}
            instanceLabel={`#${idx + 1} ${id.slice(0, 8)}`}
          />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Tab 6: Client Metrics
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
                className={`px-3 py-1 text-right font-mono tabular-nums whitespace-nowrap ${highlight ? "text-primary font-semibold" : "text-foreground"}`}
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

function ClientContent({
  metrics,
  aggregateClient,
  timelineTiming,
}: {
  metrics: ClientMetrics | undefined;
  aggregateClient: AggregateClientMetrics;
  timelineTiming: TimelineDerivedTiming | undefined;
}) {
  if (!metrics && !timelineTiming) {
    return (
      <div className="p-4 text-xs text-muted-foreground text-center">
        No client metrics yet.
      </div>
    );
  }

  const timingRows = metrics
    ? [
        {
          label: "Internal latency",
          value: fmtMs(metrics.internalLatencyMs),
          highlight:
            metrics.internalLatencyMs != null &&
            metrics.internalLatencyMs > 500,
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
          highlight:
            metrics.renderDelayMs != null && metrics.renderDelayMs > 200,
        },
        {
          label: "Total client duration",
          value: fmtMs(metrics.totalClientDurationMs),
        },
      ]
    : [];

  const dataRows = metrics
    ? [
        {
          label: "Response text",
          value: fmtBytes(metrics.accumulatedTextBytes),
        },
        { label: "Total payload", value: fmtBytes(metrics.totalPayloadBytes) },
        { label: "Total events", value: String(metrics.totalEvents) },
        { label: "Chunk events", value: String(metrics.chunkEvents) },
        { label: "Data events", value: String(metrics.dataEvents) },
        { label: "Tool events", value: String(metrics.toolEvents) },
        { label: "Block events", value: String(metrics.renderBlockEvents) },
        { label: "Phase events", value: String(metrics.phaseEvents) },
        { label: "Other events", value: String(metrics.otherEvents) },
      ]
    : [];

  const timelineRows = timelineTiming
    ? [
        {
          label: "Time to first phase",
          value: fmtMs(timelineTiming.timeToFirstPhaseMs),
        },
        {
          label: "Time to first text",
          value: fmtMs(timelineTiming.timeToFirstTextMs),
          highlight: true,
        },
        {
          label: "Text streaming",
          value: fmtMs(timelineTiming.textStreamingDurationMs),
        },
        {
          label: "Tool execution",
          value: fmtMs(timelineTiming.toolExecutionDurationMs),
        },
        {
          label: "Interstitial",
          value: fmtMs(timelineTiming.interstitialDurationMs),
        },
        {
          label: "Total timeline",
          value: fmtMs(timelineTiming.totalTimelineDurationMs),
        },
        {
          label: "Text runs",
          value: String(timelineTiming.textRunCount),
        },
        {
          label: "Tool calls",
          value: String(timelineTiming.toolCallCount),
        },
      ]
    : [];

  return (
    <div className="divide-y divide-border">
      <div className="flex">
        {timingRows.length > 0 && (
          <ClientTableCol
            icon={<Clock className="w-3 h-3" />}
            title="Client Timing"
            rows={timingRows}
          />
        )}
        {timelineRows.length > 0 && (
          <ClientTableCol
            icon={<BarChart2 className="w-3 h-3" />}
            title="Timeline Timing"
            rows={timelineRows}
          />
        )}
        {dataRows.length > 0 && (
          <ClientTableCol
            icon={<Database className="w-3 h-3" />}
            title="Data Volume"
            rows={dataRows}
          />
        )}
      </div>

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

function ClientPanel({ conversationId }: { conversationId: string }) {
  const allInstanceIds = useAppSelector(selectAllInstanceIds, shallowEqual);
  const [selectedId, setSelectedId] = useState(conversationId);
  const effectiveId = allInstanceIds.includes(selectedId)
    ? selectedId
    : conversationId;

  const latestClientMetrics = useAppSelector(
    selectLatestClientMetrics(effectiveId),
  );
  const aggregateClientMetrics = useAppSelector(
    selectAggregateClientMetrics(effectiveId),
  );
  const latestReqId = useAppSelector(selectLatestRequestId(effectiveId));
  const timelineTiming = useAppSelector(
    latestReqId ? selectTimelineDerivedTiming(latestReqId) : () => undefined,
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <InstancePicker
        allInstanceIds={allInstanceIds}
        selectedId={effectiveId}
        onSelect={setSelectedId}
        label="Instance"
      />
      <ClientContent
        metrics={latestClientMetrics}
        aggregateClient={aggregateClientMetrics}
        timelineTiming={timelineTiming}
      />
    </div>
  );
}

// =============================================================================
// Collapsed stats pills
// =============================================================================

function CollapsedStatsPills({
  stats,
  clientMetrics,
}: {
  stats: CompletionStats;
  clientMetrics: ClientMetrics | undefined;
}) {
  const totals = stats.total_usage?.total;
  const timing = stats.timing_stats;
  const totalTokens =
    totals?.total_tokens ??
    (totals?.input_tokens ?? 0) + (totals?.output_tokens ?? 0);

  return (
    <>
      {timing?.total_duration != null && (
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {fmtMs(timing.total_duration * 1000)}
        </span>
      )}
      {clientMetrics?.ttftMs != null && (
        <span
          className="flex items-center gap-1 text-primary/80"
          title="Time to first token"
        >
          <Radio className="w-3 h-3" />
          {fmtMs(clientMetrics.ttftMs)} ttft
        </span>
      )}
      {totalTokens > 0 && (
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {fmtTokens(totalTokens)} tok
        </span>
      )}
      <FinishBadge reason={stats.finish_reason} />
    </>
  );
}

// =============================================================================
// Tab 8: Test Displays
// =============================================================================

function TestDisplaysTab({ conversationId }: { conversationId: string }) {
  const tester = useAgentLauncherTester(conversationId, "agent-creator-panel");

  const displayTypes = getAllDisplayTypes().map((displayMode) => {
    const meta = getDisplayMeta(displayMode);
    const IconComponent = (LucideIcons as any)[meta.icon];
    return {
      name: meta.label,
      icon: IconComponent,
      color: meta.color,
      displayMode,
      note: meta.description,
      testMode: meta.testMode,
    };
  });

  return (
    <div className="flex h-full w-full">
      {/* Left sidebar for configurations */}
      <div className="w-1/3 min-w-[170px] max-w-[210px] border-r border-border p-3 space-y-4 overflow-y-auto">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor="creator-test-use-pre-execution"
              className="text-[11px] cursor-pointer leading-tight"
            >
              Use Pre-Execution Input
            </Label>
            <Switch
              id="creator-test-use-pre-execution"
              checked={tester.usePreExecutionInput}
              onCheckedChange={tester.setUsePreExecutionInput}
              className="scale-75 shrink-0"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor="creator-test-apply-variables"
              className="text-[11px] cursor-pointer leading-tight"
            >
              Apply Variables
            </Label>
            <Switch
              id="creator-test-apply-variables"
              checked={tester.applyVariables}
              onCheckedChange={tester.setApplyVariables}
              className="scale-75 shrink-0"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor="creator-test-auto-run"
              className="text-[11px] cursor-pointer leading-tight"
            >
              Auto Run
            </Label>
            <Switch
              id="creator-test-auto-run"
              checked={tester.autoRun}
              onCheckedChange={tester.setAutoRun}
              className="scale-75 shrink-0"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor="creator-test-allow-chat"
              className="text-[11px] cursor-pointer leading-tight"
            >
              Allow Chat
            </Label>
            <Switch
              id="creator-test-allow-chat"
              checked={tester.allowChat}
              onCheckedChange={tester.setAllowChat}
              className="scale-75 shrink-0"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor="creator-test-show-variables"
              className="text-[11px] cursor-pointer leading-tight"
            >
              Show Variables
            </Label>
            <Switch
              id="creator-test-show-variables"
              checked={tester.showVariables}
              onCheckedChange={tester.setShowVariables}
              className="scale-75 shrink-0"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor="creator-test-variable-input-style"
              className={`text-[11px] leading-tight ${tester.showVariables ? "text-foreground cursor-pointer" : "text-muted-foreground cursor-not-allowed"}`}
              aria-disabled={!tester.showVariables}
            >
              Variable UI
            </Label>
            <Select
              value={tester.variableInputStyle}
              onValueChange={(v) =>
                tester.setVariableInputStyle(v as VariableInputStyle)
              }
              disabled={!tester.showVariables}
            >
              <SelectTrigger
                id="creator-test-variable-input-style"
                size="sm"
                className="h-6 min-w-[6.5rem] max-w-[6.5rem] shrink-0 text-[11px] px-1.5"
              >
                <SelectValue placeholder="Variable UI" />
              </SelectTrigger>
              <SelectContent>
                {VARIABLE_INPUT_STYLE_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    title={opt.description}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor="creator-test-conversation-mode"
              className="text-[11px] cursor-pointer leading-tight"
            >
              Mode
            </Label>
            <Select
              value={tester.conversationMode}
              onValueChange={(v) =>
                tester.setConversationMode(
                  v as "agent" | "conversation" | "chat",
                )
              }
            >
              <SelectTrigger
                id="creator-test-conversation-mode"
                size="sm"
                className="h-6 min-w-[6.5rem] max-w-[6.5rem] shrink-0 text-[11px] px-1.5"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="chat">Chat (builder)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Right side for icons */}
      <div className="flex-1 p-1 flex flex-wrap content-start gap-2 overflow-y-auto">
        {displayTypes.map((display) => (
          <button
            key={display.displayMode}
            onClick={() => tester.openWithDisplayType(display.displayMode)}
            title={display.note}
            className="flex flex-col items-center justify-center border border-border gap-1.5 w-[84px] h-[84px] bg-muted/10 hover:bg-muted/30 border border-transparent hover:border-border rounded-xl transition-all shrink-0"
          >
            {display.icon && (
              <display.icon className={`w-7 h-7 ${display.color}`} />
            )}
            <span className="text-[10px] text-center leading-tight line-clamp-2 break-words w-full p-1">
              {display.name}
            </span>
          </button>
        ))}
      </div>

      {tester.instance && (
        <AgentExecutionTestModal
          isOpen={tester.testModalOpen}
          onClose={() => tester.setTestModalOpen(false)}
          testType={tester.testModalType}
          agentId={tester.instance.agentId}
          sourceInstanceId={conversationId}
          autoRun={tester.autoRun}
          allowChat={tester.allowChat}
          showVariables={tester.showVariables}
          applyVariables={tester.applyVariables}
          conversationMode={tester.conversationMode}
          variableInputStyle={tester.variableInputStyle}
          variables={tester.applyVariables ? tester.currentVariables : {}}
          userInput={tester.currentInput || ""}
        />
      )}
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

const ALL_TABS: TabId[] = [
  "actions",
  "settings",
  "sysprompt",
  "last",
  "session",
  "client",
  "test_displays",
];

interface CreatorRunPanelProps {
  conversationId: string;
  /** Focus surface for startNewConversation (reset conversation). */
  surfaceKey: string;
  /** Restrict which tabs are visible. Defaults to all tabs when omitted. */
  tabs?: TabId[];
}

export function CreatorRunPanel({
  conversationId,
  surfaceKey,
  tabs: allowedTabs,
}: CreatorRunPanelProps) {
  const dispatch = useAppDispatch();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    allowedTabs && allowedTabs.length > 0 ? allowedTabs[0] : "actions",
  );
  // Window panels stay mounted once opened (never unmounted while minimized).
  // Only set to false when the user explicitly closes via onClose.
  const [streamDebugWindowOpen, setStreamDebugWindowOpen] = useState(false);
  const [runSettingsWindowOpen, setRunSettingsWindowOpen] = useState(false);

  // Freeze window ids at first render — they must never change even if
  // conversationId changes (e.g. after reset), otherwise the hook cleanup
  // fires, unregisters the window from Redux, and the tray chip disappears.
  const streamDebugIdRef = useRef(`stream-debug-${conversationId}`);
  const runSettingsIdRef = useRef(`run-settings-${conversationId}`);
  const streamDebugId = streamDebugIdRef.current;
  const runSettingsId = runSettingsIdRef.current;

  const streamDebugEntry = useAppSelector(selectWindow(streamDebugId));
  const runSettingsEntry = useAppSelector(selectWindow(runSettingsId));

  const openStreamDebugWindow = useCallback(() => {
    if (streamDebugEntry) {
      // Already registered — restore if minimized, then focus
      dispatch(restoreWindow(streamDebugId));
      dispatch(focusWindow(streamDebugId));
    } else {
      setStreamDebugWindowOpen(true);
    }
  }, [dispatch, streamDebugEntry, streamDebugId]);

  const openRunSettingsWindow = useCallback(() => {
    if (runSettingsEntry) {
      dispatch(restoreWindow(runSettingsId));
      dispatch(focusWindow(runSettingsId));
    } else {
      setRunSettingsWindowOpen(true);
    }
  }, [dispatch, runSettingsEntry, runSettingsId]);

  const latestStats = useAppSelector(
    selectLatestCompletionStats(conversationId),
  );
  const latestClientMetrics = useAppSelector(
    selectLatestClientMetrics(conversationId),
  );
  const conversationTitle = useAppSelector(
    selectConversationTitle(conversationId),
  );
  // Session count across ALL instances for the tab label
  const totalRequestCount = useAppSelector((state) => {
    let count = 0;
    for (const id of state.executionInstances.allConversationIds) {
      count += (state.activeRequests.byConversationId[id] ?? []).length;
    }
    return count;
  });

  const handleExpand = useCallback(() => setIsExpanded(true), []);
  const handleCollapse = useCallback(() => setIsExpanded(false), []);

  // ── Window panels — rendered OUTSIDE the collapsed/expanded branches ───────
  // They must always stay mounted once opened so the hook's cleanup never fires
  // and the minimized tray chip keeps working. Only unmounted on explicit close.
  const windowPanels = (
    <>
      {streamDebugWindowOpen && (
        <WindowPanel
          id={streamDebugId}
          title="Stream Debug"
          width={680}
          height={720}
          onClose={() => setStreamDebugWindowOpen(false)}
          urlSyncKey="debug"
          urlSyncId={conversationId}
        >
          <StreamDebugPanel conversationId={conversationId} />
        </WindowPanel>
      )}
      {runSettingsWindowOpen && (
        <WindowPanel
          id={runSettingsId}
          title="Run Settings"
          width={420}
          height={480}
          onClose={() => setRunSettingsWindowOpen(false)}
          urlSyncKey="run_settings"
          urlSyncId={conversationId}
        >
          <div className="p-3">
            <RunSettingsEditor conversationId={conversationId} />
          </div>
        </WindowPanel>
      )}
    </>
  );

  // ── Collapsed view ────────────────────────────────────────────────────────
  if (!isExpanded) {
    return (
      <>
        <div className="border-t border-l border-r border-border">
          <button
            type="button"
            onClick={handleExpand}
            className="flex items-center gap-2 w-full pl-2 pr-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors min-w-0"
          >
            <span className="font-medium text-foreground truncate shrink-0 max-w-[120px] sm:max-w-none">
              {conversationTitle ?? "Creator Panel"}
            </span>
            {latestStats && (
              <span className="flex items-center gap-2 overflow-x-auto shrink min-w-0 scrollbar-none">
                <CollapsedStatsPills
                  stats={latestStats}
                  clientMetrics={latestClientMetrics}
                />
              </span>
            )}
            <ChevronDown className="w-3 h-3 shrink-0 ml-auto" />
          </button>
        </div>
        {windowPanels}
      </>
    );
  }

  // ── Expanded view ─────────────────────────────────────────────────────────
  const visibleTabIds = allowedTabs ?? ALL_TABS;

  const allTabDefs: Array<{ id: TabId; label: string }> = [
    { id: "actions", label: "Actions" },
    { id: "test_displays", label: "Test Displays" },
    { id: "settings", label: "Run" },
    { id: "sysprompt", label: "System" },
    { id: "last", label: "Request" },
    {
      id: "session",
      label:
        totalRequestCount > 0 ? `Session (${totalRequestCount})` : "Session",
    },
    { id: "client", label: "Client" },
  ];

  const tabs = allTabDefs.filter((t) => visibleTabIds.includes(t.id));

  return (
    <>
      <div className="border-t border-border bg-card">
        {/* Tab header */}
        <div className="flex items-center border-b border-border min-w-0">
          <div className="flex items-center gap-0 overflow-x-auto min-w-0 flex-1 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 py-1.5 text-[11px] font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCollapse}
            className="p-1.5 ml-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Collapse"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab content — fixed height */}
        <div className="h-72 overflow-y-auto">
          {activeTab === "actions" && (
            <ActionsTab
              conversationId={conversationId}
              surfaceKey={surfaceKey}
              onOpenStreamDebugWindow={openStreamDebugWindow}
              onOpenRunSettingsWindow={openRunSettingsWindow}
            />
          )}
          {activeTab === "settings" && (
            <RunSettingsTab conversationId={conversationId} />
          )}
          {activeTab === "sysprompt" && (
            <SystemPromptTab conversationId={conversationId} />
          )}
          {activeTab === "last" && (
            <LastRequestPanel conversationId={conversationId} />
          )}
          {activeTab === "session" && (
            <SessionPanel conversationId={conversationId} />
          )}
          {activeTab === "client" && (
            <ClientPanel conversationId={conversationId} />
          )}
          {activeTab === "test_displays" && (
            <TestDisplaysTab conversationId={conversationId} />
          )}
        </div>
      </div>
      {windowPanels}
    </>
  );
}
