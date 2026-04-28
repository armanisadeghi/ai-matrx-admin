"use client";

/**
 * ToolCallVisualization (canonical, v2 contract)
 *
 * The single shell for rendering tool calls. **One tool call = one shell.**
 *
 * Always entries-driven: the caller hands over an explicit
 * `ToolLifecycleEntry[]` (typically a single entry — one card per tool
 * invocation, inline, in the order the model emitted it).
 *
 * `requestId` is metadata only — passed through so the floating-window
 * grouping can collect every tool from the same request into one window.
 * It is **never** used to subscribe to "all tools for this request" —
 * doing that produced the legacy "every card shows every tool" bug.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Maximize2,
  PanelRightOpen,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import type { ToolLifecycleEntry } from "@/features/agents/types/request.types";

import {
  getInlineRenderer,
  getToolDisplayName,
  shouldKeepExpandedOnStream,
} from "../registry/registry";
import { prefetchRenderer } from "../dynamic/fetcher";
import { ToolUpdatesOverlay } from "./ToolUpdatesOverlay";

// ─── Public props ─────────────────────────────────────────────────────────────

export interface ToolCallVisualizationProps {
  entries: ToolLifecycleEntry[];
  /**
   * Optional. Metadata only — used by the floating-window button so
   * re-clicks from any tool group in the same request focus the same
   * window. Never used to fetch "all tools for this request".
   */
  requestId?: string;
  /** True when content has started streaming — triggers auto-collapse. */
  hasContent?: boolean;
  /** Persisted (post-stream) snapshot — some renderers render compactly. */
  isPersisted?: boolean;
  className?: string;
}

// ─── Shell implementation ─────────────────────────────────────────────────────

const ToolCallVisualizationInner: React.FC<{
  entries: ToolLifecycleEntry[];
  /**
   * Optional live request id. When set, the window-panel surface
   * subscribes to live lifecycle entries and stays in sync as new
   * events stream in. Entries-driven callers (persisted snapshots)
   * leave this undefined and pass an `entries` snapshot to the window.
   */
  requestId?: string;
  hasContent?: boolean;
  isPersisted?: boolean;
  className?: string;
}> = ({
  entries,
  requestId,
  hasContent = false,
  isPersisted = false,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isOverlayOpen, setIsOverlayOpen] = useState<boolean>(false);
  const [initialOverlayTab, setInitialOverlayTab] = useState<
    string | undefined
  >(undefined);
  const dispatch = useAppDispatch();

  // Prefetch any dynamic renderers for tools in this group.
  useEffect(() => {
    for (const e of entries) {
      if (e.toolName) prefetchRenderer(e.toolName);
    }
  }, [entries]);

  const phase = useMemo<"starting" | "processing" | "complete">(() => {
    if (entries.length === 0) return "starting";
    const anyActive = entries.some(
      (e) =>
        e.status === "started" ||
        e.status === "progress" ||
        e.status === "step",
    );
    if (anyActive) return "processing";
    const allTerminal = entries.every(
      (e) => e.status === "completed" || e.status === "error",
    );
    return allTerminal ? "complete" : "processing";
  }, [entries]);

  const headerTool = entries[0] ?? null;
  const toolDisplayName = useMemo(() => {
    if (entries.length > 1) return `${entries.length} Tools`;
    return getToolDisplayName(headerTool?.toolName ?? null);
  }, [entries.length, headerTool?.toolName]);

  const headerSubtitle = useMemo(() => {
    if (!headerTool) return null;
    const args = headerTool.arguments ?? {};
    const val =
      (args as Record<string, unknown>).query ??
      (args as Record<string, unknown>).q ??
      (args as Record<string, unknown>).search;
    if (typeof val === "string" && val.length > 0) return val;
    if (Array.isArray(val) && val.length > 0) return String(val[0]);
    return null;
  }, [headerTool]);

  // Auto-collapse once the tool is done AND something after it has begun
  // (next tool started, or text streaming began). Per-tool override:
  // registry entries can opt out via `keepExpandedOnStream: true` (e.g.
  // web search renderers may want to keep results visible). Defaults
  // collapse when complete.
  useEffect(() => {
    if (!hasContent || phase !== "complete") return;
    const anyStayExpanded = entries.some((e) =>
      shouldKeepExpandedOnStream(e.toolName),
    );
    if (!anyStayExpanded) setIsExpanded(false);
  }, [hasContent, phase, entries]);

  if (entries.length === 0) return null;

  const handleOpenOverlay = (tabId?: string) => {
    setInitialOverlayTab(tabId);
    setIsOverlayOpen(true);
  };

  const handleOpenWindowPanel = useCallback(
    (initialTab?: string) => {
      // Live mode: ONE window per request. Re-clicking from any tool group in
      // the same request focuses the same window, and `callIds: []` tells the
      // panel "show every tool in the request" via LiveEntriesProvider — so
      // the sidebar fills up as new tools stream in. The clicked tool is
      // hinted via initialCallId so the window opens focused on it.
      //
      // Snapshot mode (no requestId): each group is a self-contained snapshot.
      // Stable per-group id keeps re-clicks from spawning duplicates.
      const seedCallId = entries[0]?.callId ?? "no-entry";
      const instanceId = requestId
        ? `tool-call-request-${requestId}`
        : `tool-call-snapshot-${seedCallId}`;
      dispatch(
        openOverlay({
          overlayId: "toolCallWindow",
          instanceId,
          data: {
            requestId: requestId ?? null,
            callIds: requestId ? [] : entries.map((e) => e.callId),
            entries: requestId ? null : entries,
            initialCallId: seedCallId !== "no-entry" ? seedCallId : null,
            initialTab: initialTab ?? null,
          },
        }),
      );
    },
    [dispatch, entries, requestId],
  );

  return (
    <div
      className={cn(
        "relative w-full mb-2 rounded-md overflow-hidden",
        "bg-muted/30 dark:bg-muted/20",
        "border border-border/60",
        className,
      )}
    >
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between px-2.5 py-1 text-left",
          "hover:bg-muted/60 dark:hover:bg-muted/40 transition-colors",
          isExpanded && "border-b border-border/60",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {phase === "complete" ? (
            <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Loader2 className="w-3.5 h-3.5 shrink-0 text-blue-500 dark:text-blue-400 animate-spin" />
          )}
          <span className="font-medium text-xs text-foreground truncate">
            {toolDisplayName}
          </span>
          {headerSubtitle && (
            <span className="text-xs text-muted-foreground font-mono truncate">
              · {headerSubtitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {phase !== "complete" && (
            <Sparkles className="w-3 h-3 mr-0.5 text-blue-500 dark:text-blue-400 animate-pulse" />
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenWindowPanel();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                handleOpenWindowPanel();
              }
            }}
            className="p-0.5 hover:bg-muted rounded transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            title="Open in floating window"
          >
            <PanelRightOpen className="w-3 h-3" />
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setInitialOverlayTab(undefined);
              setIsOverlayOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                setInitialOverlayTab(undefined);
                setIsOverlayOpen(true);
              }
            }}
            className="p-0.5 hover:bg-muted rounded transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            title="Open fullscreen overlay"
          >
            <Maximize2 className="w-3 h-3" />
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-2 py-1.5 space-y-2">
          {entries.map((entry) => {
            const InlineRenderer = getInlineRenderer(entry.toolName);
            const groupDisplayName = getToolDisplayName(entry.toolName);
            return (
              <div key={entry.callId}>
                {entries.length > 1 && (
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    {groupDisplayName}
                  </div>
                )}
                <InlineRenderer
                  entry={entry}
                  events={entry.events}
                  onOpenOverlay={handleOpenOverlay}
                  onOpenWindowPanel={handleOpenWindowPanel}
                  toolGroupId={entry.callId}
                  isPersisted={isPersisted}
                />
              </div>
            );
          })}
        </div>
      )}

      <ToolUpdatesOverlay
        isOpen={isOverlayOpen}
        onClose={() => {
          setIsOverlayOpen(false);
          setInitialOverlayTab(undefined);
        }}
        entries={entries}
        initialTab={initialOverlayTab}
      />
    </div>
  );
};

// ─── Public component ─────────────────────────────────────────────────────────

export const ToolCallVisualization: React.FC<ToolCallVisualizationProps> = ({
  entries,
  requestId,
  hasContent,
  isPersisted,
  className,
}) => (
  <ToolCallVisualizationInner
    entries={entries}
    requestId={requestId}
    hasContent={hasContent}
    isPersisted={isPersisted}
    className={className}
  />
);

export default ToolCallVisualization;
