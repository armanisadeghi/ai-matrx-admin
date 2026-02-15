"use client";

import React, { useMemo, useState } from "react";
import FullScreenOverlay, { TabDefinition } from "@/components/official/FullScreenOverlay";
import { ToolCallObject } from "@/lib/redux/socket-io/socket.types";
import { getOverlayRenderer, hasCustomRenderer, getResultsLabel, getToolDisplayName } from "@/features/chat/components/response/tool-renderers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MessageSquare, Settings2, Wrench, FileCode2, Copy, Check, WrapText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolUpdatesOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    toolUpdates: ToolCallObject[];
    initialTab?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content renderers for individual update types (used when no custom renderer)
// ─────────────────────────────────────────────────────────────────────────────

const InputView: React.FC<{ update: ToolCallObject }> = ({ update }) => {
    const [wordWrap, setWordWrap] = useState(false);

    if (!update.mcp_input) return null;
    const args = update.mcp_input.arguments;
    const argEntries = Object.entries(args);
    const fullInputJson = JSON.stringify(update.mcp_input, null, 2);

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
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
                        onClick={() => setWordWrap(w => !w)}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                            wordWrap
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                        )}
                        title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
                    >
                        <WrapText className="w-3.5 h-3.5" />
                        <span>Wrap</span>
                    </button>
                    <CopyButton text={fullInputJson} />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {update.user_visible_message && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <MessageSquare className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <p className="text-sm text-blue-900 dark:text-blue-100">{update.user_visible_message}</p>
                    </div>
                )}

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Parameters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {argEntries.length > 0 ? (
                            argEntries.map(([key, value]) => (
                                <div key={key} className="border-l-4 border-blue-400 dark:border-blue-600 pl-4 py-2">
                                    <div className="font-semibold text-sm text-foreground mb-1 font-mono">{key}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {typeof value === "string" ? (
                                            <div className={cn("bg-muted p-3 rounded", wordWrap ? "whitespace-pre-wrap break-words" : "overflow-auto")}>{value}</div>
                                        ) : typeof value === "number" || typeof value === "boolean" ? (
                                            <div className="bg-muted p-3 rounded font-mono">{String(value)}</div>
                                        ) : (
                                            <pre className={cn(
                                                "text-xs bg-muted p-3 rounded max-h-40",
                                                wordWrap ? "whitespace-pre-wrap break-words overflow-y-auto" : "overflow-auto"
                                            )}>
                                                {JSON.stringify(value, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No parameters</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>Raw Object</span>
                            <Badge variant="outline" className="text-xs">Reference</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className={cn(
                            "text-xs bg-muted p-4 rounded max-h-60",
                            wordWrap ? "whitespace-pre-wrap break-words overflow-y-auto" : "overflow-auto"
                        )}>
                            {fullInputJson}
                        </pre>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const OutputView: React.FC<{ update: ToolCallObject }> = ({ update }) => {
    if (!update.mcp_output) return null;

    const isSimpleString = typeof update.mcp_output === "string";
    const hasTextContent =
        typeof update.mcp_output === "object" &&
        update.mcp_output !== null &&
        ("result" in update.mcp_output || "text" in update.mcp_output || "content" in update.mcp_output);

    let textContent: string | null = null;
    if (isSimpleString) {
        textContent = update.mcp_output as unknown as string;
    } else if (hasTextContent) {
        const output = update.mcp_output as Record<string, unknown>;
        const raw = output.result || output.text || output.content;
        textContent = typeof raw === "string" ? raw : null;
    }

    return (
        <div className="p-4 space-y-4">
            {update.user_visible_message && (
                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <p className="text-sm text-green-900 dark:text-green-100">{update.user_visible_message}</p>
                </div>
            )}

            {textContent ? (
                <div className="bg-card p-4 rounded-lg border overflow-auto max-h-[75vh]">
                    <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                        {textContent}
                    </div>
                </div>
            ) : (
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-[75vh]">
                    {JSON.stringify(update.mcp_output, null, 2)}
                </pre>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Copy-to-clipboard button (inline icon that shows a checkmark after copying)
// ─────────────────────────────────────────────────────────────────────────────

const CopyButton: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
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
                className
            )}
            title={copied ? "Copied!" : "Copy to clipboard"}
        >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
        </button>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Raw data view — shows ALL tool call objects for this group as a JSON array
// This is the complete, unprocessed data exactly as it arrived from the server.
// ─────────────────────────────────────────────────────────────────────────────

const RawDataView: React.FC<{ group: ToolCallObject[] }> = ({ group }) => {
    const [wordWrap, setWordWrap] = useState(false);

    if (group.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">No raw data available</p>
            </div>
        );
    }

    const displayText = JSON.stringify(group, null, 2);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30 flex-shrink-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileCode2 className="w-3.5 h-3.5" />
                    <span>Complete raw data</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {group.length} {group.length === 1 ? "update" : "updates"}
                    </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setWordWrap(w => !w)}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                            wordWrap
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
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
                <pre className={cn(
                    "p-4 text-xs text-foreground font-mono leading-relaxed",
                    wordWrap ? "whitespace-pre-wrap break-words" : ""
                )}>
                    {displayText}
                </pre>
            </div>
        </div>
    );
};

const ErrorView: React.FC<{ update: ToolCallObject }> = ({ update }) => {
    if (!update.mcp_error) return null;

    return (
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
                    {update.user_visible_message && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                            <MessageSquare className="w-4 h-4 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-900 dark:text-red-100">{update.user_visible_message}</p>
                        </div>
                    )}
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-900 dark:text-red-100 font-mono">{update.mcp_error}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// ToolGroupTab: One tab's content with blue header + toggle icon
// ─────────────────────────────────────────────────────────────────────────────

interface ToolGroupTabProps {
    group: ToolCallObject[];
    toolLabel: string;
    toolDisplayName: string;
}

type ToolGroupView = "results" | "input" | "raw";

const ToolGroupTab: React.FC<ToolGroupTabProps> = ({ group, toolLabel, toolDisplayName }) => {
    const [activeView, setActiveView] = useState<ToolGroupView>("results");

    const toolName = useMemo(() => {
        const inputUpdate = group.find(u => u.type === "mcp_input");
        return inputUpdate?.mcp_input?.name || null;
    }, [group]);

    const inputUpdate = group.find(u => u.type === "mcp_input");
    const outputUpdate = group.find(u => u.type === "mcp_output");
    const errorUpdate = group.find(u => u.type === "mcp_error");
    const stepDataUpdates = group.filter(u => u.type === "step_data");
    const hasCustom = hasCustomRenderer(toolName);
    const hasInput = !!inputUpdate;
    const hasOutput = !!outputUpdate;

    // Extract a subtitle from the input arguments (query, url, etc.)
    const subtitle = useMemo(() => {
        if (!inputUpdate?.mcp_input?.arguments) return null;
        const args = inputUpdate.mcp_input.arguments;
        const val = args.query || args.q || args.search || args.url || args.urls;
        if (typeof val === "string") return val;
        if (Array.isArray(val)) return val.slice(0, 3).join(", ");
        return null;
    }, [inputUpdate]);

    // Count results for display
    const resultCount = useMemo(() => {
        if (!outputUpdate?.mcp_output) return null;
        const out = outputUpdate.mcp_output as Record<string, unknown>;
        // Try common patterns: result.articles.length, result.totalResults, etc.
        if (out.result && typeof out.result === "object" && out.result !== null) {
            const r = out.result as Record<string, unknown>;
            if (Array.isArray(r.articles)) return `${r.articles.length} articles`;
            if (typeof r.totalResults === "number") return `${r.totalResults} results`;
        }
        return null;
    }, [outputUpdate]);

    // Header title and subtitle based on active view
    const headerTitle = activeView === "input"
        ? `${toolDisplayName} — Input`
        : activeView === "raw"
            ? `${toolDisplayName} — Raw`
            : toolLabel;

    const headerSubtitle = activeView === "input"
        ? (toolName || toolDisplayName)
        : activeView === "raw"
            ? (toolName || toolDisplayName)
            : (subtitle || resultCount || toolDisplayName);

    const renderResults = () => {
        if (hasCustom && (outputUpdate || stepDataUpdates.length > 0)) {
            const OverlayRenderer = getOverlayRenderer(toolName);
            const targetUpdate = outputUpdate || stepDataUpdates[0];
            const targetIndex = group.indexOf(targetUpdate);
            return (
                <OverlayRenderer
                    toolUpdates={group}
                    currentIndex={targetIndex >= 0 ? targetIndex : 0}
                />
            );
        }

        if (errorUpdate) return <ErrorView update={errorUpdate} />;
        if (outputUpdate) return <OutputView update={outputUpdate} />;

        return (
            <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">Results not yet available</p>
            </div>
        );
    };

    const renderContent = () => {
        switch (activeView) {
            case "input":
                return inputUpdate ? <InputView update={inputUpdate} /> : null;
            case "raw":
                return <RawDataView group={group} />;
            case "results":
            default:
                return renderResults();
        }
    };

    // View button definitions — Raw is always available since there's always data
    const viewButtons: { view: ToolGroupView; icon: React.ReactNode; label: string; available: boolean }[] = [
        { view: "results", icon: <Wrench className="w-3.5 h-3.5" />, label: "Results", available: true },
        { view: "input", icon: <Settings2 className="w-3.5 h-3.5" />, label: "Input", available: hasInput },
        { view: "raw", icon: <FileCode2 className="w-3.5 h-3.5" />, label: "Raw", available: true },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Blue gradient header with view selector icons */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3 min-h-[3.75rem]">
                <div className="flex items-center justify-between h-full">
                    <div className="flex items-center gap-3 min-w-0">
                        <Wrench className="w-5 h-5 text-white/80 flex-shrink-0" />
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-white truncate">
                                {headerTitle}
                            </h2>
                            <p className="text-xs text-white/70 truncate mt-0.5">
                                {headerSubtitle}
                            </p>
                        </div>
                    </div>
                    {/* View selector — icon buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {viewButtons.filter(b => b.available).map(({ view, icon, label }) => (
                            <button
                                key={view}
                                onClick={() => setActiveView(view)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                                    activeView === view
                                        ? "bg-white/25 text-white"
                                        : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
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

            {/* Content area */}
            <div className="flex-1 overflow-auto">
                {renderContent()}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main overlay component
// ─────────────────────────────────────────────────────────────────────────────

function groupToolUpdates(toolUpdates: ToolCallObject[]): { id: string; group: ToolCallObject[] }[] {
    const groupMap = new Map<string, ToolCallObject[]>();
    const order: string[] = [];

    for (const update of toolUpdates) {
        const id = update.id || "default";
        if (!groupMap.has(id)) {
            groupMap.set(id, []);
            order.push(id);
        }
        groupMap.get(id)!.push(update);
    }

    return order.map(id => ({ id, group: groupMap.get(id)! }));
}

export const ToolUpdatesOverlay: React.FC<ToolUpdatesOverlayProps> = ({
    isOpen,
    onClose,
    toolUpdates,
    initialTab,
}) => {
    const { tabs, resolvedInitialTab } = useMemo(() => {
        const groups = groupToolUpdates(toolUpdates);

        const generatedTabs: TabDefinition[] = groups.map(({ id, group }) => {
            const inputUpdate = group.find(u => u.type === "mcp_input");
            const toolName = inputUpdate?.mcp_input?.name || null;
            const label = getResultsLabel(toolName);
            const displayName = getToolDisplayName(toolName);

            return {
                id: `tool-group-${id}`,
                label,
                content: (
                    <ToolGroupTab
                        group={group}
                        toolLabel={label}
                        toolDisplayName={displayName}
                    />
                ),
            };
        });

        // Resolve initialTab
        let resolved: string | undefined = undefined;

        if (initialTab) {
            if (generatedTabs.some(t => t.id === initialTab)) {
                resolved = initialTab;
            } else if (initialTab.startsWith("tool-update-")) {
                const globalIndex = parseInt(initialTab.replace("tool-update-", ""), 10);
                if (!isNaN(globalIndex) && globalIndex < toolUpdates.length) {
                    const targetUpdate = toolUpdates[globalIndex];
                    const targetGroupId = targetUpdate.id || "default";
                    const matchingTab = generatedTabs.find(t => t.id === `tool-group-${targetGroupId}`);
                    resolved = matchingTab?.id;
                }
            }
        }

        if (!resolved && generatedTabs.length > 0) {
            resolved = initialTab ? generatedTabs[generatedTabs.length - 1].id : undefined;
        }

        return { tabs: generatedTabs, resolvedInitialTab: resolved };
    }, [toolUpdates, initialTab]);

    const toolCount = tabs.length;
    const title = toolCount === 1 ? "Tool Details" : `Tool Details (${toolCount} Tools)`;

    return (
        <FullScreenOverlay
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description="View tool results and inputs"
            tabs={tabs}
            initialTab={resolvedInitialTab}
            width="95vw"
            height="95vh"
        />
    );
};
