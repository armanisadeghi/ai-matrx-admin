"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Globe,
    FileSearch,
    CheckCircle,
    Loader2,
    Search,
    BookOpenCheck,
    ScanSearch,
    ExternalLink,
    Link2,
    Brain,
} from "lucide-react";
import { ToolRendererProps } from "../types";
import { ToolCallObject } from "@/lib/redux/socket-io/socket.types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UnreadSource {
    title: string;
    url: string;
    date: string;
    description: string;
    contentPreview: string;
}

interface ParsedWebResearch {
    queries: string[];
    instructions: string;
    aiAnalysis: string;
    unreadSources: UnreadSource[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser — extracts ALL data from the tool updates
// ─────────────────────────────────────────────────────────────────────────────

function parseWebResearch(updates: ToolCallObject[]): ParsedWebResearch {
    const inputUpdate = updates.find((u) => u.type === "mcp_input");
    const args = inputUpdate?.mcp_input?.arguments ?? {};
    const queries: string[] = Array.isArray(args.queries)
        ? (args.queries as string[])
        : typeof args.query === "string"
          ? [args.query as string]
          : [];
    const instructions =
        typeof args.instructions === "string"
            ? (args.instructions as string)
            : "";

    const summaryUpdate = updates.find(
        (u) =>
            u.type === "step_data" &&
            u.step_data?.type === "web_result_summary"
    );
    const summaryContent = summaryUpdate?.step_data?.content as
        | Record<string, unknown>
        | undefined;
    const stepDataAnalysis =
        typeof summaryContent?.text === "string"
            ? (summaryContent.text as string)
            : "";

    const outputUpdate = updates.find((u) => u.type === "mcp_output");
    const rawResult = outputUpdate?.mcp_output?.result;
    const outputText =
        typeof rawResult === "string"
            ? rawResult
            : rawResult != null
              ? JSON.stringify(rawResult)
              : "";

    let aiAnalysis = stepDataAnalysis;
    if (!aiAnalysis && outputText) {
        const unreadMarker = outputText.indexOf(
            "\n---\nHere are other search results"
        );
        if (unreadMarker > 0) {
            aiAnalysis = outputText.slice(0, unreadMarker).trim();
        } else {
            aiAnalysis = outputText;
        }
        aiAnalysis = aiAnalysis
            .replace(/^Top results for[^\n]*\n/, "")
            .trim();
    }

    aiAnalysis = aiAnalysis
        .replace(/^---\s*\n?/, "")
        .replace(/\n?---\s*$/, "")
        .trim();

    const unreadSources: UnreadSource[] = [];
    const unreadSection = outputText.match(
        /---\nHere are other search results[^\n]*:\n([\s\S]*)$/
    );
    if (unreadSection) {
        const block = unreadSection[1].trim();
        const cleanBlock = block.replace(/---\nNext steps:[\s\S]*$/, "").trim();
        const entries = cleanBlock.split(/\n(?=Title:)/);
        for (const entry of entries) {
            if (!entry.trim()) continue;
            const titleMatch = entry.match(
                /Title:\s*(.+?)(?:\s*\(([^)]+)\))?\s*$/m
            );
            const urlMatch = entry.match(/Url:\s*(.+)/m);
            const descMatch = entry.match(
                /Description:\s*([\s\S]*?)(?=\nContent Preview:|$)/m
            );
            const previewMatch = entry.match(
                /Content Preview:\s*([\s\S]*?)$/m
            );

            if (titleMatch && urlMatch) {
                unreadSources.push({
                    title: titleMatch[1].trim(),
                    date: titleMatch[2]?.trim() ?? "",
                    url: urlMatch[1].trim(),
                    description: descMatch?.[1]?.trim() ?? "",
                    contentPreview: previewMatch?.[1]?.trim() ?? "",
                });
            }
        }
    }

    return { queries, instructions, aiAnalysis, unreadSources };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace("www.", "");
    } catch {
        return url;
    }
}

function getFaviconUrl(url: string): string {
    try {
        const hostname = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
        return "";
    }
}

function extractAnalysisPreview(analysis: string, maxChars = 400): string {
    if (!analysis) return "";
    const lines = analysis.split("\n");
    const contentLines: string[] = [];
    let chars = 0;
    for (const line of lines) {
        const trimmed = line.trim();
        if (
            !trimmed ||
            trimmed === "---" ||
            trimmed.startsWith("Summarized Content from")
        )
            continue;
        contentLines.push(trimmed);
        chars += trimmed.length;
        if (chars >= maxChars) break;
    }
    const result = contentLines.join(" ");
    return result.length > maxChars
        ? result.slice(0, maxChars) + "..."
        : result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-page loading phases
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_PHASES = [
    "Scraping page content...",
    "Reading page content...",
    "Extracting key information...",
    "Sending to research agent...",
    "Analyzing content...",
    "Summarizing findings...",
] as const;

/** Random duration between 3–7 seconds for natural, staggered phase timing */
function getRandomDuration(): number {
    return Math.floor(Math.random() * 4001) + 3000;
}

function BrowsingCard({
    url,
    index,
    isComplete,
    onPhasesComplete,
}: {
    url: string;
    index: number;
    isComplete: boolean;
    onPhasesComplete?: () => void;
}) {
    const domain = getDomain(url);
    const favicon = getFaviconUrl(url);

    // Stable ref for the completion callback — avoids resetting timers on parent re-renders
    const onCompleteRef = useRef(onPhasesComplete);
    onCompleteRef.current = onPhasesComplete;

    // Each card gets its own random phase durations, stable across re-renders
    const [phaseDurations] = useState(() =>
        PAGE_PHASES.map(() => getRandomDuration())
    );

    const [phase, setPhase] = useState(0);
    const [phasesComplete, setPhasesComplete] = useState(false);

    useEffect(() => {
        if (isComplete || phasesComplete) return;

        const timeouts: ReturnType<typeof setTimeout>[] = [];
        let cumulativeDelay = 0;

        // Schedule each phase transition with its own random duration
        for (let i = 1; i < phaseDurations.length; i++) {
            cumulativeDelay += phaseDurations[i - 1];
            const phaseIndex = i;
            timeouts.push(
                setTimeout(() => {
                    setPhase(phaseIndex);
                }, cumulativeDelay)
            );
        }

        // After all phases complete, mark card as done and notify parent
        cumulativeDelay += phaseDurations[phaseDurations.length - 1];
        timeouts.push(
            setTimeout(() => {
                setPhasesComplete(true);
                onCompleteRef.current?.();
            }, cumulativeDelay)
        );

        return () => timeouts.forEach((t) => clearTimeout(t));
    }, [isComplete, phasesComplete, phaseDurations]);

    const showAsDone = isComplete || phasesComplete;
    const isActivelyProcessing = !showAsDone;

    return (
        <div
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all animate-in fade-in slide-in-from-left ${
                isActivelyProcessing
                    ? "bg-primary/5 border-primary/30 shadow-sm"
                    : "bg-muted/30 border-border"
            }`}
            style={{
                animationDelay: `${index * 80}ms`,
                animationDuration: "300ms",
                animationFillMode: "backwards",
            }}
        >
            <div className="flex-shrink-0 w-5 h-5 relative">
                {favicon ? (
                    <img
                        src={favicon}
                        alt=""
                        className="w-5 h-5 rounded"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                                "none";
                            const sibling = (
                                e.target as HTMLImageElement
                            ).nextElementSibling;
                            if (sibling) sibling.classList.remove("hidden");
                        }}
                    />
                ) : null}
                <Globe
                    className={`w-5 h-5 text-muted-foreground ${favicon ? "hidden" : ""}`}
                />
            </div>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium text-foreground truncate max-w-[200px] hover:text-primary"
                title={url}
            >
                {domain}
            </a>
            <div className="ml-auto flex-shrink-0">
                {isActivelyProcessing ? (
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-foreground font-medium animate-in fade-in" key={phase}>
                            {PAGE_PHASES[phase]}
                        </span>
                        <div className="flex gap-0.5">
                            <span
                                className="w-1 h-1 rounded-full bg-primary"
                                style={{
                                    animation:
                                        "pulseWave 1.4s infinite ease-in-out",
                                }}
                            />
                            <span
                                className="w-1 h-1 rounded-full bg-primary"
                                style={{
                                    animation:
                                        "pulseWave 1.4s infinite ease-in-out 0.2s",
                                }}
                            />
                            <span
                                className="w-1 h-1 rounded-full bg-primary"
                                style={{
                                    animation:
                                        "pulseWave 1.4s infinite ease-in-out 0.4s",
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <BookOpenCheck className="w-3.5 h-3.5 text-primary" />
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom waiting indicator — shows after all pages have timed out
// ─────────────────────────────────────────────────────────────────────────────

const WAITING_MESSAGES = [
    "Full agent analysis in progress...",
    "Comparing information from diverse sources...",
    "Preparing list of additional resources...",
    "Ensuring alignment with instructions...",
    "Considering source authority...",
    "Putting it all together...",
    "Reasoning...",
] as const;

function WaitingIndicator() {
    // Each message gets its own random duration for natural timing
    const [messageDurations] = useState(() =>
        WAITING_MESSAGES.map(() => getRandomDuration())
    );
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        if (messageIndex >= WAITING_MESSAGES.length - 1) return;

        const timeout = setTimeout(() => {
            setMessageIndex((prev) => prev + 1);
        }, messageDurations[messageIndex]);

        return () => clearTimeout(timeout);
    }, [messageIndex, messageDurations]);

    const isReasoning = messageIndex >= WAITING_MESSAGES.length - 1;

    return (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-muted/20 animate-in fade-in slide-in-from-bottom">
            <Brain className="w-4 h-4 text-primary flex-shrink-0" />
            <span
                className="text-xs font-medium text-muted-foreground animate-in fade-in"
                key={messageIndex}
            >
                {WAITING_MESSAGES[messageIndex]}
            </span>
            {isReasoning && (
                <div className="flex gap-0.5 ml-1">
                    <span
                        className="w-1 h-1 rounded-full bg-primary"
                        style={{
                            animation: "pulseWave 1.4s infinite ease-in-out",
                        }}
                    />
                    <span
                        className="w-1 h-1 rounded-full bg-primary"
                        style={{
                            animation:
                                "pulseWave 1.4s infinite ease-in-out 0.2s",
                        }}
                    />
                    <span
                        className="w-1 h-1 rounded-full bg-primary"
                        style={{
                            animation:
                                "pulseWave 1.4s infinite ease-in-out 0.4s",
                        }}
                    />
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat line helper
// ─────────────────────────────────────────────────────────────────────────────

function buildStatLine(
    queryCount: number,
    browsingUrlCount: number,
    unreadSourceCount: number
): string {
    const parts: string[] = [];
    if (queryCount > 0) {
        parts.push(
            `${queryCount} ${queryCount === 1 ? "Query" : "Queries"}`
        );
    }
    // Deep reads: use actual count if streaming data available, else estimate
    if (browsingUrlCount > 0) {
        parts.push(
            `${browsingUrlCount} Deep ${browsingUrlCount === 1 ? "Read" : "Reads"}`
        );
    } else if (queryCount > 0) {
        // Fallback: ~3 per query
        const estimate = queryCount * 3;
        parts.push(`~${estimate} Deep Reads`);
    }
    if (unreadSourceCount > 0) {
        parts.push(
            `${unreadSourceCount} Additional ${unreadSourceCount === 1 ? "Source" : "Sources"}`
        );
    }
    return parts.join(" \u00B7 ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const WebResearchInline: React.FC<ToolRendererProps> = ({
    toolUpdates,
    currentIndex,
    onOpenOverlay,
    toolGroupId = "default",
}) => {
    const visibleUpdates =
        currentIndex !== undefined
            ? toolUpdates.slice(0, currentIndex + 1)
            : toolUpdates;

    if (visibleUpdates.length === 0) return null;

    // Extract browsing URLs
    const browsingUrls = visibleUpdates
        .filter(
            (u) =>
                u.type === "user_visible_message" &&
                (u.user_message || u.user_visible_message)?.startsWith("Browsing ")
        )
        .map((u) => (u.user_message || u.user_visible_message)?.replace("Browsing ", "") || "");

    // Extract queries (always available, even from DB)
    const inputUpdate = visibleUpdates.find((u) => u.type === "mcp_input");
    const inputArgs = inputUpdate?.mcp_input?.arguments ?? {};
    const queries: string[] = Array.isArray(inputArgs.queries)
        ? (inputArgs.queries as string[])
        : typeof inputArgs.query === "string"
          ? [inputArgs.query as string]
          : [];

    // Check completion
    const outputUpdate = visibleUpdates.find((u) => u.type === "mcp_output");
    const isComplete = !!outputUpdate;

    // Check for summarizing step
    const isSummarizing = visibleUpdates.some(
        (u) =>
            u.type === "step_data" &&
            (u.step_data as unknown as Record<string, unknown> | undefined)
                ?.status === "summarizing"
    );

    // Parse all data when complete
    const parsed = isComplete ? parseWebResearch(visibleUpdates) : null;
    const analysisPreview = parsed
        ? extractAnalysisPreview(parsed.aiAnalysis)
        : "";

    // Track card completion for immediate WaitingIndicator transition
    const completedCardsRef = useRef(new Set<string>());
    const [allCardsFinished, setAllCardsFinished] = useState(false);

    // Reset when new URLs arrive (more cards to wait for)
    useEffect(() => {
        if (browsingUrls.length > completedCardsRef.current.size) {
            setAllCardsFinished(false);
        }
    }, [browsingUrls.length]);

    const handleCardComplete = (url: string) => {
        completedCardsRef.current.add(url);
        if (completedCardsRef.current.size >= browsingUrls.length) {
            setAllCardsFinished(true);
        }
    };

    // Timer-based fallback for waiting indicator (max card duration = 6 phases × 7s + buffer)
    const [showWaitingFallback, setShowWaitingFallback] = useState(false);

    useEffect(() => {
        if (isComplete || browsingUrls.length === 0) {
            setShowWaitingFallback(false);
            return;
        }

        setShowWaitingFallback(false);
        const timer = setTimeout(() => {
            setShowWaitingFallback(true);
        }, PAGE_PHASES.length * 7000 + 2000);

        return () => clearTimeout(timer);
    }, [isComplete, browsingUrls.length]);

    // Show waiting indicator: immediately when all cards finish, on server summarizing signal, or timeout fallback
    const showWaitingIndicator =
        !isComplete &&
        browsingUrls.length > 0 &&
        (allCardsFinished || showWaitingFallback || isSummarizing);

    return (
        <div className="space-y-3">
            {/* Search Queries — show during streaming */}
            {!isComplete &&
                queries.length > 0 &&
                (() => (
                    <div className="flex flex-wrap gap-1.5">
                        {queries.map((q, i) => (
                            <div
                                key={i}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-left"
                                style={{
                                    animationDelay: `${i * 40}ms`,
                                    animationDuration: "200ms",
                                    animationFillMode: "backwards",
                                }}
                            >
                                <Search className="w-3 h-3 text-primary flex-shrink-0" />
                                <span
                                    className="text-xs text-foreground truncate max-w-[280px]"
                                    title={q}
                                >
                                    {q}
                                </span>
                            </div>
                        ))}
                    </div>
                ))()}

            {/* Status Bar */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isComplete ? (
                    <>
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="font-medium">
                            {buildStatLine(
                                queries.length,
                                browsingUrls.length,
                                parsed?.unreadSources.length ?? 0
                            )}
                        </span>
                    </>
                ) : isSummarizing ? (
                    <>
                        <ScanSearch className="w-4 h-4 text-primary animate-pulse" />
                        <span className="font-medium">
                            Analyzing {browsingUrls.length} sources...
                        </span>
                    </>
                ) : (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="font-medium">
                            Deep reading {browsingUrls.length}{" "}
                            {browsingUrls.length === 1 ? "page" : "pages"}...
                        </span>
                    </>
                )}
            </div>

            {/* Live Browsing Progress */}
            {!isComplete && browsingUrls.length > 0 && (
                <div className="space-y-1.5">
                    {browsingUrls.map((url, index) => (
                        <BrowsingCard
                            key={url}
                            url={url}
                            index={index}
                            isComplete={isComplete}
                            onPhasesComplete={() => handleCardComplete(url)}
                        />
                    ))}
                </div>
            )}

            {/* Bottom Waiting Indicator — below pages, after all timed out */}
            {showWaitingIndicator && (
                <WaitingIndicator />
            )}

            {/* AI Analysis Preview */}
            {isComplete && analysisPreview && (
                <div
                    className="p-3 rounded-lg bg-primary/5 border border-primary/15 animate-in fade-in slide-in-from-bottom"
                    style={{
                        animationDuration: "300ms",
                        animationFillMode: "backwards",
                    }}
                >
                    <div className="flex items-center gap-1.5 mb-2">
                        <FileSearch className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                            Research Analysis
                        </span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed line-clamp-4">
                        {analysisPreview}
                    </p>
                </div>
            )}

            {/* Top unread sources preview — show first 3 */}
            {isComplete && parsed && parsed.unreadSources.length > 0 && (
                <div className="space-y-1.5">
                    {parsed.unreadSources.slice(0, 3).map((source, index) => (
                        <a
                            key={index}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors group animate-in fade-in slide-in-from-bottom"
                            style={{
                                animationDelay: `${(index + 1) * 70}ms`,
                                animationDuration: "300ms",
                                animationFillMode: "backwards",
                            }}
                        >
                            <div className="flex-shrink-0 w-5 h-5 mt-0.5 relative">
                                <img
                                    src={getFaviconUrl(source.url)}
                                    alt=""
                                    className="w-5 h-5 rounded"
                                    onError={(e) => {
                                        (
                                            e.target as HTMLImageElement
                                        ).style.display = "none";
                                        const sibling = (
                                            e.target as HTMLImageElement
                                        ).nextElementSibling;
                                        if (sibling)
                                            sibling.classList.remove("hidden");
                                    }}
                                />
                                <Globe className="w-5 h-5 text-muted-foreground hidden" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-foreground line-clamp-1 group-hover:text-primary">
                                    {source.title}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-primary mt-0.5">
                                    <span className="truncate">
                                        {getDomain(source.url)}
                                    </span>
                                    {source.date && (
                                        <span className="text-muted-foreground flex-shrink-0">
                                            &middot; {source.date}
                                        </span>
                                    )}
                                    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                {source.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                        {source.description}
                                    </p>
                                )}
                            </div>
                        </a>
                    ))}
                    {parsed.unreadSources.length > 3 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                            <Link2 className="w-3.5 h-3.5" />
                            <span>
                                +{parsed.unreadSources.length - 3} more sources
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* View Full Research Button */}
            {isComplete && onOpenOverlay && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenOverlay(`tool-group-${toolGroupId}`);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer animate-in fade-in slide-in-from-bottom"
                    style={{
                        animationDelay: "300ms",
                        animationDuration: "300ms",
                        animationFillMode: "backwards",
                    }}
                >
                    <FileSearch className="w-4 h-4" />
                    <span>
                        View complete research report
                        {parsed &&
                            ` (${buildStatLine(
                                queries.length,
                                browsingUrls.length,
                                parsed.unreadSources.length
                            )})`}
                    </span>
                </button>
            )}
        </div>
    );
};
