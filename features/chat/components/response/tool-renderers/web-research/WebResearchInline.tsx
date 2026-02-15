"use client";

import React from "react";
import {
    Globe,
    FileSearch,
    CheckCircle,
    Loader2,
    Search,
    BookOpenCheck,
    ScanSearch,
    ExternalLink,
    ChevronRight,
    Link2,
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
    // 1. Extract queries and instructions from mcp_input
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

    // 2. Extract the full AI analysis from step_data (web_result_summary)
    //    This is the most valuable content — the synthesized research report
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

    // 3. Extract from mcp_output.result — may duplicate step_data analysis + has unread sources
    const outputUpdate = updates.find((u) => u.type === "mcp_output");
    const rawResult = outputUpdate?.mcp_output?.result;
    const outputText =
        typeof rawResult === "string"
            ? rawResult
            : rawResult != null
              ? JSON.stringify(rawResult)
              : "";

    // The mcp_output starts with "Top results for ..." then the same analysis,
    // then a trailing section of unread sources
    // Use the step_data version as primary (it's identical), fall back to mcp_output
    let aiAnalysis = stepDataAnalysis;
    if (!aiAnalysis && outputText) {
        // Extract everything before the "Here are other search results" section
        const unreadMarker = outputText.indexOf(
            "\n---\nHere are other search results"
        );
        if (unreadMarker > 0) {
            aiAnalysis = outputText.slice(0, unreadMarker).trim();
        } else {
            aiAnalysis = outputText;
        }
        // Strip the "Top results for ..." preamble line
        aiAnalysis = aiAnalysis
            .replace(/^Top results for[^\n]*\n/, "")
            .trim();
    }

    // Clean up leading/trailing --- separators
    aiAnalysis = aiAnalysis
        .replace(/^---\s*\n?/, "")
        .replace(/\n?---\s*$/, "")
        .trim();

    // 4. Parse unread sources from mcp_output.result
    const unreadSources: UnreadSource[] = [];
    const unreadSection = outputText.match(
        /---\nHere are other search results[^\n]*:\n([\s\S]*)$/
    );
    if (unreadSection) {
        const block = unreadSection[1].trim();
        // Remove any trailing "---\nNext steps:..." block
        const cleanBlock = block.replace(/---\nNext steps:[\s\S]*$/, "").trim();

        // Parse each source entry — they have Title:, Url:, Description:, Content Preview:
        const entries = cleanBlock.split(/\n(?=Title:)/);
        for (const entry of entries) {
            if (!entry.trim()) continue;
            const titleMatch = entry.match(
                /Title:\s*(.+?)(?:\s*\(([^)]+)\))?\s*$/m
            );
            const urlMatch = entry.match(/Url:\s*(.+)/m);
            const descMatch = entry.match(/Description:\s*([\s\S]*?)(?=\nContent Preview:|$)/m);
            const previewMatch = entry.match(/Content Preview:\s*([\s\S]*?)$/m);

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

/** Extract a short preview from the AI analysis for inline display */
function extractAnalysisPreview(analysis: string, maxChars = 400): string {
    if (!analysis) return "";
    // Skip markdown headers and separators, get to the meat
    const lines = analysis.split("\n");
    const contentLines: string[] = [];
    let chars = 0;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "---" || trimmed.startsWith("Summarized Content from")) continue;
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
// Browsing card sub-component
// ─────────────────────────────────────────────────────────────────────────────

function BrowsingCard({
    url,
    index,
    isLast,
    isComplete,
}: {
    url: string;
    index: number;
    isLast: boolean;
    isComplete: boolean;
}) {
    const domain = getDomain(url);
    const favicon = getFaviconUrl(url);
    const isActivelyReading = isLast && !isComplete;

    return (
        <div
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all animate-in fade-in slide-in-from-left ${
                isActivelyReading
                    ? "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-300 dark:border-emerald-700 shadow-sm"
                    : isComplete
                      ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700"
                      : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
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
                            (e.target as HTMLImageElement).style.display = "none";
                            const sibling = (e.target as HTMLImageElement).nextElementSibling;
                            if (sibling) sibling.classList.remove("hidden");
                        }}
                    />
                ) : null}
                <Globe className={`w-5 h-5 text-slate-400 dark:text-slate-500 ${favicon ? "hidden" : ""}`} />
            </div>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[240px] hover:text-blue-600 dark:hover:text-blue-400"
                title={url}
            >
                {domain}
            </a>
            <div className="ml-auto flex-shrink-0">
                {isActivelyReading ? (
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Reading</span>
                        <div className="flex gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400" style={{ animation: "pulseWave 1.4s infinite ease-in-out" }} />
                            <span className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400" style={{ animation: "pulseWave 1.4s infinite ease-in-out 0.2s" }} />
                            <span className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400" style={{ animation: "pulseWave 1.4s infinite ease-in-out 0.4s" }} />
                        </div>
                    </div>
                ) : (
                    <BookOpenCheck className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
                )}
            </div>
        </div>
    );
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
                u.user_visible_message?.startsWith("Browsing ")
        )
        .map((u) => u.user_visible_message?.replace("Browsing ", "") || "");

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

    return (
        <div className="space-y-3">
            {/* Search Queries — show what was searched */}
            {!isComplete && (
                (() => {
                    const inputUpdate = visibleUpdates.find(
                        (u) => u.type === "mcp_input"
                    );
                    const args = inputUpdate?.mcp_input?.arguments ?? {};
                    const queries: string[] = Array.isArray(args.queries)
                        ? (args.queries as string[])
                        : typeof args.query === "string"
                          ? [args.query as string]
                          : [];
                    if (queries.length === 0) return null;
                    return (
                        <div className="flex flex-wrap gap-1.5">
                            {queries.map((q, i) => (
                                <div
                                    key={i}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 animate-in fade-in slide-in-from-left"
                                    style={{
                                        animationDelay: `${i * 40}ms`,
                                        animationDuration: "200ms",
                                        animationFillMode: "backwards",
                                    }}
                                >
                                    <Search className="w-3 h-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                    <span
                                        className="text-xs text-emerald-700 dark:text-emerald-300 truncate max-w-[280px]"
                                        title={q}
                                    >
                                        {q}
                                    </span>
                                </div>
                            ))}
                        </div>
                    );
                })()
            )}

            {/* Status Bar */}
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                {isComplete ? (
                    <>
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="font-medium">
                            Researched {browsingUrls.length}{" "}
                            {browsingUrls.length === 1 ? "source" : "sources"}
                            {parsed && parsed.unreadSources.length > 0 &&
                                ` + ${parsed.unreadSources.length} more found`}
                        </span>
                    </>
                ) : isSummarizing ? (
                    <>
                        <ScanSearch className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                        <span className="font-medium">
                            Analyzing {browsingUrls.length} sources...
                        </span>
                    </>
                ) : (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
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
                            key={url + index}
                            url={url}
                            index={index}
                            isLast={index === browsingUrls.length - 1}
                            isComplete={isComplete}
                        />
                    ))}
                </div>
            )}

            {/* AI Analysis Preview — the most valuable content */}
            {isComplete && analysisPreview && (
                <div
                    className="p-3 rounded-lg bg-gradient-to-r from-green-50/70 to-emerald-50/70 dark:from-green-950/15 dark:to-emerald-950/15 border border-green-200 dark:border-green-800/60 animate-in fade-in slide-in-from-bottom"
                    style={{ animationDuration: "300ms", animationFillMode: "backwards" }}
                >
                    <div className="flex items-center gap-1.5 mb-2">
                        <FileSearch className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                            AI Research Analysis
                        </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-4">
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
                            className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-green-300 dark:hover:border-green-700 transition-colors group animate-in fade-in slide-in-from-bottom"
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
                                        (e.target as HTMLImageElement).style.display = "none";
                                        const sibling = (e.target as HTMLImageElement).nextElementSibling;
                                        if (sibling) sibling.classList.remove("hidden");
                                    }}
                                />
                                <Globe className="w-5 h-5 text-slate-400 hidden" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-green-600 dark:group-hover:text-green-400">
                                    {source.title}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-0.5">
                                    <span className="truncate">{getDomain(source.url)}</span>
                                    {source.date && (
                                        <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">
                                            &middot; {source.date}
                                        </span>
                                    )}
                                    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                {source.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                        {source.description}
                                    </p>
                                )}
                            </div>
                        </a>
                    ))}
                    {parsed.unreadSources.length > 3 && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-500 px-1">
                            <Link2 className="w-3.5 h-3.5" />
                            <span>+{parsed.unreadSources.length - 3} more sources</span>
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
                    className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 text-sm font-medium hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all duration-200 flex items-center justify-center gap-2 border border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 cursor-pointer animate-in fade-in slide-in-from-bottom"
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
                            ` (${browsingUrls.length} read${parsed.unreadSources.length > 0 ? `, ${parsed.unreadSources.length} more` : ""})`}
                    </span>
                </button>
            )}
        </div>
    );
};
