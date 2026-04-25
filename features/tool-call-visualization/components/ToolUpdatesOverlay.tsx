"use client";

/**
 * ToolUpdatesOverlay (canonical, v3 contract)
 *
 * Top-level tab structure:
 *
 *   • Default (no custom contributions or multi-tool group):
 *       [ Results | Input | Raw ]
 *
 *   • Single-tool with `OverlayTabs` registered in the tool registry:
 *       [ ...OverlayTabs | Input | Raw ]   (the tool's tabs REPLACE "Results")
 *
 *   • Single-tool with only `OverlayComponent` (no OverlayTabs):
 *       [ Results=OverlayComponent | Input | Raw ]
 *
 *   • Single-tool in error state — always falls back to:
 *       [ Results (ErrorView) | Input | Raw ]
 *
 * For tool groups with multiple entries (rare), an inline entry selector
 * strip inside each tab lets the user pick which tool's data to inspect.
 *
 * This shell deliberately renders no heavy header / gradient / per-tool
 * outer tab — the FullScreenOverlay's own tab bar is the only outer chrome.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  FileCode2,
  MessageSquare,
  Settings2,
  WrapText,
} from "lucide-react";

import FullScreenOverlay, {
  type TabDefinition,
} from "@/components/official/FullScreenOverlay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { ToolLifecycleEntry } from "@/features/agents/types/request.types";

import {
  getOverlayRenderer,
  getOverlayTabs,
  getToolDisplayName,
  hasCustomRenderer,
} from "../registry/registry";
import type { ToolOverlayTabSpec, ToolRendererProps } from "../types";
import { resultAsString } from "../renderers/_shared";

// ─── Small local UI helpers ───────────────────────────────────────────────────

const CopyButton: React.FC<{ text: string; className?: string }> = ({
  text,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
        copied
          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
          : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
        className,
      )}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
};

// ─── Per-entry view components ────────────────────────────────────────────────

const InputView: React.FC<{ entry: ToolLifecycleEntry }> = ({ entry }) => {
  const [wordWrap, setWordWrap] = useState(false);
  const args = entry.arguments ?? {};
  const argEntries = Object.entries(args);
  const fullInputJson = JSON.stringify(
    { name: entry.toolName, arguments: args, callId: entry.callId },
    null,
    2,
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Settings2 className="w-3.5 h-3.5" />
          <span>Tool input</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {argEntries.length} {argEntries.length === 1 ? "param" : "params"}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWordWrap((w) => !w)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
              wordWrap
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
            )}
            title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
          >
            <WrapText className="w-3.5 h-3.5" />
            <span>Wrap</span>
          </button>
          <CopyButton text={fullInputJson} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {entry.latestMessage && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <MessageSquare className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-sm text-blue-900 dark:text-blue-100">
              {entry.latestMessage}
            </p>
          </div>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {argEntries.length > 0 ? (
              argEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="border-l-4 border-blue-400 dark:border-blue-600 pl-4 py-2"
                >
                  <div className="font-semibold text-sm text-foreground mb-1 font-mono">
                    {key}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {typeof value === "string" ? (
                      <div
                        className={cn(
                          "bg-muted p-3 rounded",
                          wordWrap
                            ? "whitespace-pre-wrap break-words"
                            : "overflow-auto",
                        )}
                      >
                        {value}
                      </div>
                    ) : typeof value === "number" ||
                      typeof value === "boolean" ? (
                      <div className="bg-muted p-3 rounded font-mono">
                        {String(value)}
                      </div>
                    ) : (
                      <pre
                        className={cn(
                          "text-xs bg-muted p-3 rounded max-h-40",
                          wordWrap
                            ? "whitespace-pre-wrap break-words overflow-y-auto"
                            : "overflow-auto",
                        )}
                      >
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No parameters
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <span>Raw Input</span>
              <Badge variant="outline" className="text-xs">
                Reference
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre
              className={cn(
                "text-xs bg-muted p-4 rounded max-h-60",
                wordWrap
                  ? "whitespace-pre-wrap break-words overflow-y-auto"
                  : "overflow-auto",
              )}
            >
              {fullInputJson}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const OutputView: React.FC<{ entry: ToolLifecycleEntry }> = ({ entry }) => {
  const textContent = resultAsString(entry);
  const isJson =
    entry.result != null &&
    typeof entry.result === "object" &&
    !Array.isArray(entry.result);

  if (entry.result == null) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-sm">No result available yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {entry.latestMessage && (
        <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <MessageSquare className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-900 dark:text-green-100">
            {entry.latestMessage}
          </p>
        </div>
      )}

      {textContent && !isJson ? (
        <div className="bg-card p-4 rounded-lg border overflow-auto max-h-[75vh]">
          <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
            {textContent}
          </div>
        </div>
      ) : (
        <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-[75vh]">
          {JSON.stringify(entry.result, null, 2)}
        </pre>
      )}
    </div>
  );
};

const ErrorView: React.FC<{ entry: ToolLifecycleEntry }> = ({ entry }) => (
  <div className="p-4">
    <Card className="border-red-300 dark:border-red-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Badge className="bg-red-500 dark:bg-red-600">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entry.latestMessage && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            <MessageSquare className="w-4 h-4 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-900 dark:text-red-100">
              {entry.latestMessage}
            </p>
          </div>
        )}
        {entry.errorMessage && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-900 dark:text-red-100 font-mono">
              {entry.errorType ? `[${entry.errorType}] ` : ""}
              {entry.errorMessage}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);

const RawDataView: React.FC<{ entry: ToolLifecycleEntry }> = ({ entry }) => {
  console.log(
    "[DIAG-4 RawDataView] callId=%s result type=%s result=%o",
    entry.callId,
    typeof entry.result,
    entry.result,
  );
  const [wordWrap, setWordWrap] = useState(false);
  const displayText = JSON.stringify({ entry, events: entry.events }, null, 2);
  console.log("[TOOL UPDATES OVERLAY] RawDataView entry:", entry);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileCode2 className="w-3.5 h-3.5" />
          <span>Complete tool data</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {entry.events.length}{" "}
            {entry.events.length === 1 ? "event" : "events"}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWordWrap((w) => !w)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
              wordWrap
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
            )}
            title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
          >
            <WrapText className="w-3.5 h-3.5" />
            <span>Wrap</span>
          </button>
          <CopyButton text={displayText} />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <pre
          className={cn(
            "p-4 text-xs text-foreground font-mono leading-relaxed",
            wordWrap ? "whitespace-pre-wrap break-words" : "",
          )}
        >
          {displayText}
        </pre>
      </div>
    </div>
  );
};

// ─── Multi-tool entry selector (only rendered when entries.length > 1) ────────

const EntrySelector: React.FC<{
  entries: ToolLifecycleEntry[];
  selectedCallId: string;
  onSelect: (callId: string) => void;
}> = ({ entries, selectedCallId, onSelect }) => {
  if (entries.length <= 1) return null;
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-muted/40 overflow-x-auto scrollbar-none flex-shrink-0">
      <span className="text-xs text-muted-foreground mr-1 flex-shrink-0">
        Tool
      </span>
      {entries.map((entry, idx) => {
        const label = getToolDisplayName(entry.toolName);
        const isActive = entry.callId === selectedCallId;
        return (
          <button
            key={entry.callId}
            onClick={() => onSelect(entry.callId)}
            className={cn(
              "flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border border-border",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="opacity-60 mr-1">{idx + 1}.</span>
            {label}
          </button>
        );
      })}
    </div>
  );
};

// ─── Tab content shells (render selected entry inside the active top tab) ─────

const ResultsTabContent: React.FC<{
  entries: ToolLifecycleEntry[];
  selectedCallId: string;
  onSelect: (callId: string) => void;
}> = ({ entries, selectedCallId, onSelect }) => {
  const entry =
    entries.find((e) => e.callId === selectedCallId) ?? entries[0] ?? null;

  if (entry) {
    console.log(
      "[DIAG-3b ToolGroupTab] callId=%s toolName=%s result type=%s result=%o",
      entry.callId,
      entry.toolName,
      typeof entry.result,
      entry.result,
    );
  }

  const renderBody = () => {
    if (!entry) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          <p className="text-sm">No tool data available</p>
        </div>
      );
    }

    if (entry.status === "error") return <ErrorView entry={entry} />;

    if (hasCustomRenderer(entry.toolName)) {
      const OverlayRenderer = getOverlayRenderer(entry.toolName);
      return (
        <OverlayRenderer
          entry={entry}
          events={entry.events}
          toolGroupId={entry.callId}
          isPersisted={false}
        />
      );
    }

    if (entry.result != null) return <OutputView entry={entry} />;

    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-sm">Results not yet available</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <EntrySelector
        entries={entries}
        selectedCallId={entry?.callId ?? ""}
        onSelect={onSelect}
      />
      <div className="flex-1 overflow-auto">{renderBody()}</div>
    </div>
  );
};

const InputTabContent: React.FC<{
  entries: ToolLifecycleEntry[];
  selectedCallId: string;
  onSelect: (callId: string) => void;
}> = ({ entries, selectedCallId, onSelect }) => {
  const entry =
    entries.find((e) => e.callId === selectedCallId) ?? entries[0] ?? null;

  return (
    <div className="flex flex-col h-full">
      <EntrySelector
        entries={entries}
        selectedCallId={entry?.callId ?? ""}
        onSelect={onSelect}
      />
      <div className="flex-1 overflow-hidden">
        {entry ? (
          <InputView entry={entry} />
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">No tool data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

const RawTabContent: React.FC<{
  entries: ToolLifecycleEntry[];
  selectedCallId: string;
  onSelect: (callId: string) => void;
}> = ({ entries, selectedCallId, onSelect }) => {
  const entry =
    entries.find((e) => e.callId === selectedCallId) ?? entries[0] ?? null;

  return (
    <div className="flex flex-col h-full">
      <EntrySelector
        entries={entries}
        selectedCallId={entry?.callId ?? ""}
        onSelect={onSelect}
      />
      <div className="flex-1 overflow-hidden">
        {entry ? (
          <RawDataView entry={entry} />
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">No tool data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Custom overlay-tab content shell ─────────────────────────────────────────
//
// Renders one of a tool's registered `ToolOverlayTabSpec` components for the
// currently selected entry. Used only in single-tool mode.

const CustomOverlayTabContent: React.FC<{
  entry: ToolLifecycleEntry;
  Component: React.ComponentType<ToolRendererProps>;
}> = ({ entry, Component }) => (
  <div className="flex flex-col h-full">
    <div className="flex-1 overflow-auto">
      <Component
        entry={entry}
        events={entry.events}
        toolGroupId={entry.callId}
        isPersisted={false}
      />
    </div>
  </div>
);

// ─── Main overlay ─────────────────────────────────────────────────────────────

export interface ToolUpdatesOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ToolLifecycleEntry[];
  /**
   * Optional initial focus. Accepts any of:
   *   - "input" | "raw"             → admin tabs (always present)
   *   - "results"                   → default Results tab (when no
   *                                    OverlayTabs are registered)
   *   - any custom tab id           → e.g. "report", "sources", "fulltext"
   *                                    when the tool registers OverlayTabs
   *   - "tool-group-{callId}"       → legacy contract; selects that entry
   *                                    and opens the first tab.
   */
  initialTab?: string;
}

export const ToolUpdatesOverlay: React.FC<ToolUpdatesOverlayProps> = ({
  isOpen,
  onClose,
  entries,
  initialTab,
}) => {
  // Resolve initial entry callId from the legacy "tool-group-{callId}" form.
  const requestedCallId = useMemo(() => {
    if (!initialTab) return null;
    const m = initialTab.match(/^tool-group-(.+)$/);
    if (m && entries.some((e) => e.callId === m[1])) return m[1];
    return null;
  }, [initialTab, entries]);

  const initialCallId =
    requestedCallId ?? entries[entries.length - 1]?.callId ?? "";

  const [selectedCallId, setSelectedCallId] = useState<string>(initialCallId);

  // Sync the selected entry whenever the overlay reopens with a different
  // initial tab / entry list.
  useEffect(() => {
    if (isOpen && initialCallId) setSelectedCallId(initialCallId);
  }, [isOpen, initialCallId]);

  // Selected entry — used to decide whether to expand custom OverlayTabs.
  const selectedEntry = useMemo(
    () =>
      entries.find((e) => e.callId === selectedCallId) ?? entries[0] ?? null,
    [entries, selectedCallId],
  );

  // Custom OverlayTabs are only expanded when:
  //   1. The group contains exactly one entry.
  //   2. That entry is not in error state.
  //   3. The tool's registry record provides OverlayTabs.
  const customOverlayTabs: ToolOverlayTabSpec[] | null = useMemo(() => {
    if (entries.length !== 1) return null;
    if (!selectedEntry) return null;
    if (selectedEntry.status === "error") return null;
    return getOverlayTabs(selectedEntry.toolName);
  }, [entries.length, selectedEntry]);

  const tabs: TabDefinition[] = useMemo(() => {
    const adminTabs: TabDefinition[] = [
      {
        id: "input",
        label: "Input",
        content: (
          <InputTabContent
            entries={entries}
            selectedCallId={selectedCallId}
            onSelect={setSelectedCallId}
          />
        ),
      },
      {
        id: "raw",
        label: "Raw",
        content: (
          <RawTabContent
            entries={entries}
            selectedCallId={selectedCallId}
            onSelect={setSelectedCallId}
          />
        ),
      },
    ];

    if (customOverlayTabs && selectedEntry) {
      const customTabDefs: TabDefinition[] = customOverlayTabs.map((spec) => ({
        id: spec.id,
        label: spec.label,
        content: (
          <CustomOverlayTabContent
            entry={selectedEntry}
            Component={spec.Component}
          />
        ),
      }));
      return [...customTabDefs, ...adminTabs];
    }

    return [
      {
        id: "results",
        label: "Results",
        content: (
          <ResultsTabContent
            entries={entries}
            selectedCallId={selectedCallId}
            onSelect={setSelectedCallId}
          />
        ),
      },
      ...adminTabs,
    ];
  }, [entries, selectedCallId, customOverlayTabs, selectedEntry]);

  // Resolve which tab to open initially. Honor any explicit id that exists
  // in the resolved tabs; otherwise fall back to the first tab.
  const resolvedTopTab = useMemo(() => {
    if (
      initialTab &&
      !initialTab.startsWith("tool-group-") &&
      tabs.some((t) => t.id === initialTab)
    ) {
      return initialTab;
    }
    return tabs[0]?.id ?? "results";
  }, [initialTab, tabs]);

  // Compute a meaningful title for the overlay header.
  const title = useMemo(() => {
    if (entries.length === 0) return "Tool";
    if (entries.length > 1) return `${entries.length} Tools`;
    return getToolDisplayName(entries[0].toolName);
  }, [entries]);

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="Tool results, input, and raw data"
      tabs={tabs}
      initialTab={resolvedTopTab}
      width="95vw"
      height="95vh"
    />
  );
};

export default ToolUpdatesOverlay;
