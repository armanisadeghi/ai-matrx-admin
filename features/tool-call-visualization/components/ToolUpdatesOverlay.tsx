"use client";

/**
 * ToolUpdatesOverlay (canonical, v2 contract)
 *
 * Fullscreen tabbed overlay — one tab per tool call. Consumes
 * ToolLifecycleEntry[] directly, no ToolCallObject reshaping.
 *
 * Each tab has three views: Results (custom renderer or a default output
 * view), Input (arguments inspector), and Raw (full events + entry JSON).
 */

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  FileCode2,
  MessageSquare,
  Settings2,
  Wrench,
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
  getResultsLabel,
  getToolDisplayName,
  hasCustomRenderer,
} from "../registry/registry";
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

// ─── Default views used when a tool has no custom overlay ─────────────────────

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

// ─── Per-tab content (tool group) ─────────────────────────────────────────────

type ToolGroupView = "results" | "input" | "raw";

const ToolGroupTab: React.FC<{
  entry: ToolLifecycleEntry;
  toolLabel: string;
  toolDisplayName: string;
}> = ({ entry, toolLabel, toolDisplayName }) => {
  console.log(
    "[DIAG-3b ToolGroupTab] callId=%s toolName=%s result type=%s result=%o",
    entry.callId,
    entry.toolName,
    typeof entry.result,
    entry.result,
  );
  const [activeView, setActiveView] = useState<ToolGroupView>("results");

  const hasCustom = hasCustomRenderer(entry.toolName);

  const subtitle = useMemo(() => {
    const args = entry.arguments ?? {};
    const val =
      (args as Record<string, unknown>).query ??
      (args as Record<string, unknown>).q ??
      (args as Record<string, unknown>).search ??
      (args as Record<string, unknown>).url ??
      (args as Record<string, unknown>).urls;
    if (typeof val === "string") return val;
    if (Array.isArray(val)) return val.slice(0, 3).join(", ");
    return null;
  }, [entry.arguments]);

  const resultCount = useMemo(() => {
    const r = entry.result;
    if (!r || typeof r !== "object") return null;
    const obj = r as Record<string, unknown>;
    if (Array.isArray(obj.articles)) return `${obj.articles.length} articles`;
    if (typeof obj.totalResults === "number")
      return `${obj.totalResults} results`;
    if (typeof obj.total_results === "number")
      return `${obj.total_results} results`;
    if (typeof obj.count === "number") return `${obj.count} results`;
    return null;
  }, [entry.result]);

  const headerTitle =
    activeView === "input"
      ? `${toolDisplayName} — Input`
      : activeView === "raw"
        ? `${toolDisplayName} — Raw`
        : toolLabel;

  const headerSubtitle =
    activeView === "input" || activeView === "raw"
      ? entry.toolName || toolDisplayName
      : subtitle || resultCount || toolDisplayName;

  const renderResults = () => {
    if (entry.status === "error") {
      return <ErrorView entry={entry} />;
    }
    if (hasCustom) {
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

  const renderContent = () => {
    switch (activeView) {
      case "input":
        return <InputView entry={entry} />;
      case "raw":
        return <RawDataView entry={entry} />;
      case "results":
      default:
        return renderResults();
    }
  };

  const viewButtons: {
    view: ToolGroupView;
    icon: React.ReactNode;
    label: string;
  }[] = [
    {
      view: "results",
      icon: <Wrench className="w-3.5 h-3.5" />,
      label: "Results",
    },
    {
      view: "input",
      icon: <Settings2 className="w-3.5 h-3.5" />,
      label: "Input",
    },
    {
      view: "raw",
      icon: <FileCode2 className="w-3.5 h-3.5" />,
      label: "Raw",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-2">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-3 min-w-0">
            <Wrench className="w-5 h-5 text-white/80 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">
                {headerTitle}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {viewButtons.map(({ view, icon, label }) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border border-border",
                  activeView === view
                    ? "bg-white/25 text-white"
                    : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white",
                )}
                title={label}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
};

// ─── Main overlay ─────────────────────────────────────────────────────────────

export interface ToolUpdatesOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ToolLifecycleEntry[];
  initialTab?: string;
}

export const ToolUpdatesOverlay: React.FC<ToolUpdatesOverlayProps> = ({
  isOpen,
  onClose,
  entries,
  initialTab,
}) => {
  const { tabs, resolvedInitialTab } = useMemo(() => {
    const generated: TabDefinition[] = entries.map((entry) => {
      const label = getResultsLabel(entry.toolName);
      const displayName = getToolDisplayName(entry.toolName);
      return {
        id: `tool-group-${entry.callId}`,
        label,
        content: (
          <ToolGroupTab
            entry={entry}
            toolLabel={label}
            toolDisplayName={displayName}
          />
        ),
      };
    });

    let resolved: string | undefined;
    if (initialTab && generated.some((t) => t.id === initialTab)) {
      resolved = initialTab;
    } else if (generated.length > 0) {
      resolved = generated[generated.length - 1].id;
    }

    return { tabs: generated, resolvedInitialTab: resolved };
  }, [entries, initialTab]);

  const toolCount = tabs.length;

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title=""
      description="View tool results and inputs"
      tabs={tabs}
      initialTab={resolvedInitialTab}
      width="95vw"
      height="95vh"
    />
  );
};

export default ToolUpdatesOverlay;
