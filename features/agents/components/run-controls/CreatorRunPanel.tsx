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

import { useState, useCallback, useRef, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  AppWindow,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import { createSelector } from "@reduxjs/toolkit";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import type { ActiveRequest } from "@/features/agents/types/request.types";
import type {
  UserRequestResult,
  UsageTotals,
} from "@/types/python-generated/stream-events";
import {
  restoreWindow,
  focusWindow,
  selectWindow,
} from "@/lib/redux/slices/windowManagerSlice";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { startNewConversation } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { reapplyLastSubmittedInput } from "@/features/agents/redux/execution-system/thunks/reapply-last-input.thunk";
import { selectHasReapplyableInput } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import { setBuilderAdvancedSettings } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { selectUseStructuredSystemInstruction } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { RunSettingsEditor } from "./RunSettingsEditor";
import { selectConversationTitle } from "@/features/agents/redux/execution-system/messages/messages.selectors";
import { SystemInstructionEditor } from "../builder/message-builders/system-instructions/SystemInstructionEditor";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { StreamDebugPanel } from "../debug/StreamDebugPanel";
import { AgentWidgetInvokerTester } from "./AgentWidgetInvokerTester";
import { cn } from "@/lib/utils";

// =============================================================================
// Tab type
// =============================================================================

type TabId =
  | "actions"
  | "widget_invoker"
  | "settings"
  | "sysprompt"
  | "last"
  | "session"
  | "client";

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

  const canReapply = useAppSelector(selectHasReapplyableInput(conversationId));
  const handleReapply = useCallback(() => {
    dispatch(reapplyLastSubmittedInput(conversationId));
  }, [conversationId, dispatch]);

  const ActionButton = ({
    onClick,
    icon: Icon,
    label,
    iconClassName,
  }: {
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    label: React.ReactNode;
    iconClassName?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 w-[84px] h-[84px] text-muted-foreground hover:text-foreground bg-muted/10 hover:bg-muted/30 border border-transparent hover:border-border rounded-xl transition-all shrink-0"
    >
      <Icon className={cn("w-7 h-7", iconClassName)} />
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
        iconClassName="text-amber-500"
        label={
          <>
            Reset
            <br />
            Conversation
          </>
        }
      />
      {canReapply && (
        <ActionButton
          onClick={handleReapply}
          icon={Undo2}
          iconClassName="text-purple-500"
          label={
            <>
              Re-apply
              <br />
              Last Input
            </>
          }
        />
      )}
      <ActionButton
        onClick={onOpenStreamDebugWindow}
        icon={AppWindow}
        iconClassName="text-blue-500"
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
        iconClassName="text-green-500"
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
// Tab 4 / 5 / 6: Stats panels
//
// Source of truth: `activeRequests`. Each ActiveRequest carries both:
//   • completion.result (UserRequestResult) — server-side aggregated stats:
//     tokens, cost, duration, iterations, finish_reason, tool_call_stats.
//     Populated on the `completion` event at the end of the user-request.
//   • clientMetrics — client-side perf: TTFT, stream duration, render delay,
//     event counts, payload bytes. Populated on the `end` event.
//
// ActiveRequest entries are never removed (no `removeRequest` dispatch) so
// they persist after stream completion and can be inspected here.
// Observability (cx_user_request / cx_request / cx_tool_call) is the DB
// mirror; the panels below read from activeRequests because it has the
// completion payload the DB rows don't carry as first-class columns.
// =============================================================================

// ── Shared selectors (defined outside components so they're stable) ─────────

/**
 * Returns ALL ActiveRequest records for this conversation, oldest first.
 * Memoized so callers re-render only when the record set actually changes.
 */
function makeSelectConversationRequests(conversationId: string) {
  return createSelector(
    (state: RootState) => state.activeRequests.byConversationId[conversationId],
    (state: RootState) => state.activeRequests.byRequestId,
    (ids, byId): ActiveRequest[] => {
      if (!ids || ids.length === 0) return EMPTY_REQUEST_LIST;
      const out: ActiveRequest[] = [];
      for (const id of ids) {
        const rec = byId[id];
        if (rec) out.push(rec);
      }
      return out.length === 0 ? EMPTY_REQUEST_LIST : out;
    },
  );
}

/** Picks the newest ActiveRequest for this conversation, or undefined. */
function makeSelectLastConversationRequest(conversationId: string) {
  return (state: RootState): ActiveRequest | undefined => {
    const ids = state.activeRequests.byConversationId[conversationId];
    if (!ids || ids.length === 0) return undefined;
    return state.activeRequests.byRequestId[ids[ids.length - 1]];
  };
}

const EMPTY_REQUEST_LIST: ActiveRequest[] = [];

// ── Formatting helpers (shared across the three panels) ─────────────────────

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtTokens(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function fmtCost(cost: number | null | undefined): string {
  if (cost == null) return "—";
  if (cost === 0) return "$0";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(4)}`;
}

function fmtBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

// Pulls `UserRequestResult` (the server's stats payload) out of an
// ActiveRequest's completion event. `null` means the request hasn't reached
// `completion` yet or it wasn't a user_request operation.
function getUserRequestResult(
  request: ActiveRequest | undefined,
): UserRequestResult | null {
  if (!request?.completion) return null;
  if (request.completion.operation !== "user_request") return null;
  const result = request.completion.result;
  if (!result || typeof result !== "object") return null;
  return result as UserRequestResult;
}

// Sums `UsageTotals` from one AggregatedUsageResult in-place into an
// accumulator. Skips null/undefined inputs gracefully.
function addUsageTotals(acc: MutableTotals, usage: UsageTotals | undefined) {
  if (!usage) return;
  acc.input += usage.input_tokens ?? 0;
  acc.output += usage.output_tokens ?? 0;
  acc.cached += usage.cached_input_tokens ?? 0;
  acc.total += usage.total_tokens ?? 0;
  acc.cost += usage.total_cost ?? 0;
  acc.requests += usage.total_requests ?? 0;
}

interface MutableTotals {
  input: number;
  output: number;
  cached: number;
  total: number;
  cost: number;
  requests: number;
}

// ── Stat row primitive ──────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-foreground/90", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

function StatSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 pb-0.5 border-b border-border/40 mb-1">
        {title}
      </div>
      {children}
    </div>
  );
}

function EmptyStats({ text }: { text: string }) {
  return (
    <div className="p-4 text-xs text-muted-foreground text-center">{text}</div>
  );
}

// ── Last request panel ─────────────────────────────────────────────────────

function LastRequestPanel({ conversationId }: { conversationId: string }) {
  const selector = useMemo(
    () => makeSelectLastConversationRequest(conversationId),
    [conversationId],
  );
  const request = useAppSelector(selector);

  if (!request) {
    return (
      <EmptyStats text="No requests yet. Fire a turn to see stats here." />
    );
  }

  const result = getUserRequestResult(request);
  const usage = result?.total_usage?.total;
  const timing = result?.timing_stats ?? undefined;
  const toolStats = result?.tool_call_stats ?? undefined;
  const isComplete =
    request.status === "complete" || request.status === "error";

  return (
    <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 overflow-y-auto h-full">
      <StatSection title="Status">
        <StatRow label="Request" value={request.status} />
        <StatRow label="Finish reason" value={result?.finish_reason ?? "—"} />
        <StatRow
          label="Iterations"
          value={result?.iterations != null ? String(result.iterations) : "—"}
        />
        {request.errorMessage && (
          <StatRow
            label="Error"
            value={request.errorMessage}
            valueClassName="text-destructive text-[10px]"
          />
        )}
      </StatSection>

      <StatSection title="Tokens">
        <StatRow label="Input" value={fmtTokens(usage?.input_tokens)} />
        <StatRow
          label="Cached in"
          value={fmtTokens(usage?.cached_input_tokens)}
        />
        <StatRow label="Output" value={fmtTokens(usage?.output_tokens)} />
        <StatRow label="Total" value={fmtTokens(usage?.total_tokens)} />
      </StatSection>

      <StatSection title="Cost & duration">
        <StatRow label="Cost" value={fmtCost(usage?.total_cost)} />
        <StatRow label="Total" value={fmtMs(timing?.total_duration)} />
        <StatRow label="API" value={fmtMs(timing?.api_duration)} />
        <StatRow label="Tools" value={fmtMs(timing?.tool_duration)} />
      </StatSection>

      <StatSection title="Tools">
        <StatRow
          label="Tool calls"
          value={
            toolStats?.total_tool_calls != null
              ? String(toolStats.total_tool_calls)
              : "—"
          }
        />
        <StatRow
          label="Iters w/ tools"
          value={
            toolStats?.iterations_with_tools != null
              ? String(toolStats.iterations_with_tools)
              : "—"
          }
        />
        <StatRow
          label="Tool types"
          value={
            toolStats?.by_tool ? Object.keys(toolStats.by_tool).length : "—"
          }
        />
        {!isComplete && (
          <StatRow
            label="State"
            value="streaming…"
            valueClassName="text-blue-500 text-[10px]"
          />
        )}
      </StatSection>
    </div>
  );
}

// ── Session panel ──────────────────────────────────────────────────────────

function SessionPanel({ conversationId }: { conversationId: string }) {
  const selector = useMemo(
    () => makeSelectConversationRequests(conversationId),
    [conversationId],
  );
  const requests = useAppSelector(selector);

  const stats = useMemo(() => {
    const totals: MutableTotals = {
      input: 0,
      output: 0,
      cached: 0,
      total: 0,
      cost: 0,
      requests: 0,
    };
    let totalDurationMs = 0;
    let apiDurationMs = 0;
    let toolDurationMs = 0;
    let totalToolCalls = 0;
    let iterationsSum = 0;
    let completedRounds = 0;
    let errorRounds = 0;

    for (const request of requests) {
      const result = getUserRequestResult(request);
      if (result) {
        addUsageTotals(totals, result.total_usage?.total);
        const timing = result.timing_stats;
        totalDurationMs += timing?.total_duration ?? 0;
        apiDurationMs += timing?.api_duration ?? 0;
        toolDurationMs += timing?.tool_duration ?? 0;
        totalToolCalls += result.tool_call_stats?.total_tool_calls ?? 0;
        iterationsSum += result.iterations ?? 0;
      }
      if (request.status === "complete") completedRounds++;
      else if (request.status === "error") errorRounds++;
    }

    return {
      totals,
      totalDurationMs,
      apiDurationMs,
      toolDurationMs,
      totalToolCalls,
      iterationsSum,
      completedRounds,
      errorRounds,
      totalRounds: requests.length,
    };
  }, [requests]);

  if (requests.length === 0) {
    return <EmptyStats text="No requests yet in this conversation." />;
  }

  return (
    <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 overflow-y-auto h-full">
      <StatSection title="Rounds">
        <StatRow label="Total turns" value={stats.totalRounds} />
        <StatRow label="Completed" value={stats.completedRounds} />
        {stats.errorRounds > 0 && (
          <StatRow
            label="Errored"
            value={stats.errorRounds}
            valueClassName="text-destructive"
          />
        )}
        <StatRow label="Σ Iterations" value={stats.iterationsSum || "—"} />
      </StatSection>

      <StatSection title="Tokens (all turns)">
        <StatRow label="Input" value={fmtTokens(stats.totals.input)} />
        <StatRow label="Cached" value={fmtTokens(stats.totals.cached)} />
        <StatRow label="Output" value={fmtTokens(stats.totals.output)} />
        <StatRow label="Total" value={fmtTokens(stats.totals.total)} />
      </StatSection>

      <StatSection title="Cost & duration">
        <StatRow label="Cost" value={fmtCost(stats.totals.cost)} />
        <StatRow label="Total" value={fmtMs(stats.totalDurationMs)} />
        <StatRow label="API" value={fmtMs(stats.apiDurationMs)} />
        <StatRow label="Tools" value={fmtMs(stats.toolDurationMs)} />
      </StatSection>

      <StatSection title="Tool calls">
        <StatRow label="Σ Tool calls" value={stats.totalToolCalls || "—"} />
        <StatRow label="LLM calls" value={stats.totals.requests || "—"} />
      </StatSection>
    </div>
  );
}

// ── Client metrics panel ───────────────────────────────────────────────────

function ClientPanel({ conversationId }: { conversationId: string }) {
  const selector = useMemo(
    () => makeSelectLastConversationRequest(conversationId),
    [conversationId],
  );
  const request = useAppSelector(selector);
  const metrics = request?.clientMetrics ?? null;

  if (!metrics) {
    return (
      <EmptyStats text="Client metrics populate at stream end. No completed request yet for this conversation." />
    );
  }

  return (
    <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 overflow-y-auto h-full">
      <StatSection title="Timing">
        <StatRow
          label="Internal latency"
          value={fmtMs(metrics.internalLatencyMs)}
        />
        <StatRow label="TTFT" value={fmtMs(metrics.ttftMs)} />
        <StatRow
          label="Stream duration"
          value={fmtMs(metrics.streamDurationMs)}
        />
        <StatRow label="Render delay" value={fmtMs(metrics.renderDelayMs)} />
        <StatRow
          label="Total client"
          value={fmtMs(metrics.totalClientDurationMs)}
        />
      </StatSection>

      <StatSection title="Payload">
        <StatRow
          label="Accumulated text"
          value={fmtBytes(metrics.accumulatedTextBytes)}
        />
        <StatRow label="Total" value={fmtBytes(metrics.totalPayloadBytes)} />
      </StatSection>

      <StatSection title="Event counts">
        <StatRow label="Total" value={metrics.totalEvents} />
        <StatRow label="Chunks" value={metrics.chunkEvents} />
        <StatRow label="Reasoning" value={metrics.reasoningChunkEvents} />
        <StatRow label="Phases" value={metrics.phaseEvents} />
        <StatRow label="Tool events" value={metrics.toolEvents} />
        <StatRow label="Render blocks" value={metrics.renderBlockEvents} />
      </StatSection>

      <StatSection title="Records">
        <StatRow label="Init" value={metrics.initEvents} />
        <StatRow label="Completion" value={metrics.completionEvents} />
        <StatRow label="Data" value={metrics.dataEvents} />
        <StatRow label="Reserved" value={metrics.recordReservedEvents} />
        <StatRow label="Updated" value={metrics.recordUpdateEvents} />
        {metrics.warningEvents > 0 && (
          <StatRow
            label="Warnings"
            value={metrics.warningEvents}
            valueClassName="text-amber-500"
          />
        )}
        {metrics.infoEvents > 0 && (
          <StatRow label="Info" value={metrics.infoEvents} />
        )}
        {metrics.otherEvents > 0 && (
          <StatRow label="Other" value={metrics.otherEvents} />
        )}
      </StatSection>
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

const ALL_TABS: TabId[] = [
  "actions",
  "widget_invoker",
  "settings",
  "sysprompt",
  "last",
  "session",
  "client",
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

  const conversationTitle = useAppSelector(
    selectConversationTitle(conversationId),
  );
  // Session count across ALL instances for the tab label
  const totalRequestCount = useAppSelector((state) => {
    let count = 0;
    for (const id of state.conversations.allConversationIds) {
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
    { id: "widget_invoker", label: "Widgets" },
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

        {/* Tab content — fixed height (shorter on mobile so it doesn't dominate the viewport) */}
        <div className="h-[50dvh] sm:h-72 overflow-y-auto">
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
          {activeTab === "widget_invoker" && (
            <AgentWidgetInvokerTester
              conversationId={conversationId}
              sourceFeature="agent-creator-panel"
              surfaceKey={`creator-widget-tester:${conversationId}`}
            />
          )}
        </div>
      </div>
      {windowPanels}
    </>
  );
}
