"use client";

/**
 * ToolCallVisualization (canonical, v2 contract)
 *
 * The ONE shell for rendering tool calls in this codebase.
 *
 * Two modes:
 *
 *   1. Request-driven (live stream + live persistence):
 *        <ToolCallVisualization requestId={requestId} />
 *
 *      Reads ToolLifecycleEntry[] from the active-requests slice via the
 *      canonical selectors (in emission order) and drives the registry.
 *
 *   2. Entries-driven (persistence / tests / fixtures):
 *        <ToolCallVisualization entries={entries} />
 *
 *      Accepts ToolLifecycleEntry[] directly. Used by the persisted-turn
 *      path and the testing harness.
 *
 * There is no ToolCallObject anywhere in this tree.
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
import { useOrderedToolLifecycles } from "../redux/hooks";
import { ToolUpdatesOverlay } from "./ToolUpdatesOverlay";

// ─── Public props ─────────────────────────────────────────────────────────────

type RequestDriven = {
  requestId: string;
  entries?: never;
};
type EntriesDriven = {
  /**
   * Optional request id even on the entries-driven path. Live chat-stream
   * tool cards (`InlineToolCard` in ToolHandlers) render one lifecycle entry
   * at a time but still belong to a request — passing `requestId` here lets
   * the floating-window button merge every tool from that request into one
   * per-request window instead of spawning a window per card.
   */
  requestId?: string;
  entries: ToolLifecycleEntry[];
};

export type ToolCallVisualizationProps = (RequestDriven | EntriesDriven) & {
  /** True when content has started streaming — triggers auto-collapse. */
  hasContent?: boolean;
  /** Persisted (post-stream) snapshot — some renderers render compactly. */
  isPersisted?: boolean;
  className?: string;
};

// ─── Internal request-driven wrapper ──────────────────────────────────────────

const RequestDrivenShell: React.FC<{
  requestId: string;
  hasContent?: boolean;
  isPersisted?: boolean;
  className?: string;
}> = ({ requestId, hasContent, isPersisted, className }) => {
  const entries = useOrderedToolLifecycles(requestId);
  return (
    <ToolCallVisualizationInner
      entries={entries}
      requestId={requestId}
      hasContent={hasContent}
      isPersisted={isPersisted}
      className={className}
    />
  );
};

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

  console.log("[TOOL CALL VISUALIZATION INNER] entries:", entries);
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

  // Auto-collapse when content starts streaming (unless any tool wants to
  // stay expanded).
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
        "relative w-full mb-4 rounded-xl overflow-hidden",
        "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900",
        "border border-blue-200 dark:border-slate-700",
        "shadow-sm",
        className,
      )}
    >
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-blue-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {phase === "complete" ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
            )}
          </div>
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                {toolDisplayName}
              </span>
              {phase === "complete" && (
                <span className="text-xs text-green-600 dark:text-green-400">
                  Complete
                </span>
              )}
            </div>
            {headerSubtitle && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {headerSubtitle}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {phase !== "complete" && (
            <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-pulse" />
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
            className="p-1 hover:bg-blue-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
            title="Open in floating window"
          >
            <PanelRightOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />
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
            className="p-1 hover:bg-blue-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
            title="Open fullscreen overlay"
          >
            <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 py-3 space-y-4">
          {entries.map((entry) => {
            console.log(
              "[DIAG-3 InlineRenderer] callId=%s toolName=%s result type=%s result=%o",
              entry.callId,
              entry.toolName,
              typeof entry.result,
              entry.result,
            );
            const InlineRenderer = getInlineRenderer(entry.toolName);
            const groupDisplayName = getToolDisplayName(entry.toolName);
            return (
              <div key={entry.callId}>
                {entries.length > 1 && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {groupDisplayName}
                    </div>
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

          {phase === "processing" && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"
                  style={{ width: "60%" }}
                />
              </div>
            </div>
          )}
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

export const ToolCallVisualization: React.FC<ToolCallVisualizationProps> = (
  props,
) => {
  if ("requestId" in props && props.requestId) {
    // console.log(
    //   "[TOOL CALL VISUALIZATION] Returning RequestDrivenShell for requestId:",
    //   props.requestId,
    // );
    return (
      <RequestDrivenShell
        requestId={props.requestId}
        hasContent={props.hasContent}
        isPersisted={props.isPersisted}
        className={props.className}
      />
    );
  }
  // console.log(
  //   "[TOOL CALL VISUALIZATION] Returning ToolCallVisualizationInner for entries:",
  //   props.entries,
  // );
  return (
    <ToolCallVisualizationInner
      entries={props.entries ?? []}
      requestId={props.requestId}
      hasContent={props.hasContent}
      isPersisted={props.isPersisted}
      className={props.className}
    />
  );
};

export default ToolCallVisualization;
