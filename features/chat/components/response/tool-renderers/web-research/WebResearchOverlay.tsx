"use client";

import React, { useState } from "react";
import {
    Globe,
    ExternalLink,
    FileSearch,
    LayoutGrid,
    FileText,
    Copy,
    Check,
    Search,
    BookOpen,
    ChevronDown,
    ChevronUp,
    BookOpenCheck,
    ClipboardList,
    Link2,
    Sparkles,
} from "lucide-react";
import { ToolRendererProps } from "../types";
import { ToolCallObject } from "@/lib/redux/socket-io/socket.types";
import BasicMarkdownContent from "@/components/mardown-display/chat-markdown/BasicMarkdownContent";

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
    browsingUrls: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser — extracts ALL data from the tool updates
// ─────────────────────────────────────────────────────────────────────────────

function parseWebResearch(updates: ToolCallObject[]): ParsedWebResearch {
    // 1. Queries and instructions from mcp_input
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

    // 2. All browsed URLs
    const browsingUrls = updates
        .filter(
            (u) =>
                u.type === "user_visible_message" &&
                u.user_visible_message?.startsWith("Browsing ")
        )
        .map((u) => u.user_visible_message?.replace("Browsing ", "") || "");

    // 3. Full AI analysis from step_data (web_result_summary)
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

    // 4. mcp_output.result — fallback for analysis + unread sources
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

    // Clean up leading/trailing --- separators
    aiAnalysis = aiAnalysis
        .replace(/^---\s*\n?/, "")
        .replace(/\n?---\s*$/, "")
        .trim();

    // 5. Parse unread sources
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

    return { queries, instructions, aiAnalysis, unreadSources, browsingUrls };
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

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Collapsible text block for long content */
function CollapsibleText({
    text,
    maxChars = 400,
}: {
    text: string;
    maxChars?: number;
}) {
    const [expanded, setExpanded] = useState(false);

    if (text.length <= maxChars) {
        return (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {text}
            </p>
        );
    }

    return (
        <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {expanded ? text : text.slice(0, maxChars) + "..."}
            </p>
            <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1.5 flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
            >
                {expanded ? (
                    <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        Show less
                    </>
                ) : (
                    <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        Show more
                    </>
                )}
            </button>
        </div>
    );
}

/** Source card for an unread source with full data */
function SourceCard({
    source,
    index,
}: {
    source: UnreadSource;
    index: number;
}) {
    const [copySuccess, setCopySuccess] = useState(false);
    const favicon = getFaviconUrl(source.url);
    const domain = getDomain(source.url);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = `${source.title}\n${source.url}\n\n${source.description}\n\n${source.contentPreview}`;
        try {
            await navigator.clipboard.writeText(text);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-green-300 dark:hover:border-green-700 transition-colors">
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-6 h-6 mt-0.5 relative">
                    {favicon ? (
                        <img
                            src={favicon}
                            alt=""
                            className="w-6 h-6 rounded"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                    "none";
                                const sibling = (e.target as HTMLImageElement)
                                    .nextElementSibling;
                                if (sibling)
                                    sibling.classList.remove("hidden");
                            }}
                        />
                    ) : null}
                    <Globe
                        className={`w-6 h-6 text-slate-400 ${favicon ? "hidden" : ""}`}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                        {source.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 hover:underline group"
                        >
                            <span>{domain}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                        {source.date && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {source.date}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex-shrink-0 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
                    title="Copy source"
                >
                    {copySuccess ? (
                        <Check className="w-4 h-4 text-green-500" />
                    ) : (
                        <Copy className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Description */}
            {source.description && (
                <div className="mb-2">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-1 uppercase tracking-wider">
                        Description
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {source.description}
                    </p>
                </div>
            )}

            {/* Content Preview */}
            {source.contentPreview && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-1 uppercase tracking-wider">
                        Content Preview
                    </p>
                    <CollapsibleText text={source.contentPreview} maxChars={300} />
                </div>
            )}

            {/* Visit Link */}
            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                    Read full article
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const WebResearchOverlay: React.FC<ToolRendererProps> = ({
    toolUpdates,
    currentIndex,
}) => {
    const [viewMode, setViewMode] = useState<
        "analysis" | "sources" | "fulltext"
    >("analysis");
    const [copySuccess, setCopySuccess] = useState(false);

    const visibleUpdates =
        currentIndex !== undefined
            ? toolUpdates.slice(0, currentIndex + 1)
            : toolUpdates;

    const parsed = parseWebResearch(visibleUpdates);

    if (
        !parsed.aiAnalysis &&
        parsed.unreadSources.length === 0 &&
        parsed.browsingUrls.length === 0
    ) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                <div className="text-center">
                    <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No research data available</p>
                </div>
            </div>
        );
    }

    // Build full text export
    const generateFullText = () => {
        let text = "";

        // Search queries
        if (parsed.queries.length > 0) {
            text += `SEARCH QUERIES\n${"=".repeat(80)}\n`;
            parsed.queries.forEach((q, i) => {
                text += `${i + 1}. ${q}\n`;
            });
            text += "\n";
        }

        // Instructions
        if (parsed.instructions) {
            text += `SEARCH INSTRUCTIONS\n${"=".repeat(80)}\n${parsed.instructions}\n\n`;
        }

        // Pages read
        if (parsed.browsingUrls.length > 0) {
            text += `PAGES READ (${parsed.browsingUrls.length})\n${"=".repeat(80)}\n`;
            parsed.browsingUrls.forEach((url, i) => {
                text += `${i + 1}. ${url}\n`;
            });
            text += "\n";
        }

        // AI Analysis
        if (parsed.aiAnalysis) {
            text += `AI RESEARCH ANALYSIS\n${"=".repeat(80)}\n${parsed.aiAnalysis}\n\n`;
        }

        // Additional Sources
        if (parsed.unreadSources.length > 0) {
            text += `\nADDITIONAL SOURCES (${parsed.unreadSources.length})\n${"=".repeat(80)}\n\n`;
            parsed.unreadSources.forEach((source, i) => {
                text += `${i + 1}. ${source.title}`;
                if (source.date) text += ` (${source.date})`;
                text += `\n   URL: ${source.url}\n`;
                text += `   Domain: ${getDomain(source.url)}\n`;
                if (source.description) {
                    text += `   Description: ${source.description}\n`;
                }
                if (source.contentPreview) {
                    text += `   Content: ${source.contentPreview}\n`;
                }
                text += `\n${"-".repeat(80)}\n\n`;
            });
        }

        return text;
    };

    const fullText = generateFullText();

    const handleCopyAll = async () => {
        try {
            await navigator.clipboard.writeText(fullText);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Search Queries */}
            {parsed.queries.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <Search className="w-3.5 h-3.5" />
                        Search Queries
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {parsed.queries.map((q, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300"
                            >
                                <Search className="w-3 h-3 flex-shrink-0" />
                                {q}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Agent Instructions */}
            {parsed.instructions && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <ClipboardList className="w-3.5 h-3.5" />
                        Agent Instructions
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-800/50">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {parsed.instructions}
                        </p>
                    </div>
                </div>
            )}

            {/* Pages Read */}
            {parsed.browsingUrls.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <BookOpenCheck className="w-3.5 h-3.5" />
                        Pages Read ({parsed.browsingUrls.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {parsed.browsingUrls.map((url, i) => {
                            const favicon = getFaviconUrl(url);
                            return (
                                <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700 transition-colors text-xs text-slate-700 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400 group"
                                >
                                    <div className="w-4 h-4 flex-shrink-0 relative">
                                        {favicon ? (
                                            <img
                                                src={favicon}
                                                alt=""
                                                className="w-4 h-4 rounded"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display =
                                                        "none";
                                                    const sibling = (e.target as HTMLImageElement)
                                                        .nextElementSibling;
                                                    if (sibling) sibling.classList.remove("hidden");
                                                }}
                                            />
                                        ) : null}
                                        <Globe
                                            className={`w-4 h-4 text-slate-400 ${favicon ? "hidden" : ""}`}
                                        />
                                    </div>
                                    <span className="truncate max-w-[180px]">
                                        {getDomain(url)}
                                    </span>
                                    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Stats and View Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <Globe className="w-4 h-4" />
                        <span className="font-medium">
                            {parsed.browsingUrls.length} read
                        </span>
                    </div>
                    {parsed.unreadSources.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Link2 className="w-4 h-4" />
                            <span className="font-medium">
                                {parsed.unreadSources.length} additional
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setViewMode("analysis")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            viewMode === "analysis"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Analysis</span>
                    </button>
                    <button
                        onClick={() => setViewMode("sources")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            viewMode === "sources"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        <span>Sources</span>
                    </button>
                    <button
                        onClick={() => setViewMode("fulltext")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            viewMode === "fulltext"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>Raw</span>
                    </button>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* Analysis View — Rich markdown rendering of the AI analysis     */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {viewMode === "analysis" && (
                <div className="space-y-6">
                    {/* AI Research Analysis */}
                    {parsed.aiAnalysis && (
                        <div className="p-5 rounded-xl border border-green-200 dark:border-green-800/60 bg-gradient-to-br from-white to-green-50/30 dark:from-slate-800/50 dark:to-green-950/10">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    AI Research Analysis
                                </h2>
                                <CopyButton text={parsed.aiAnalysis} />
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-green-800 dark:prose-headings:text-green-300 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-li:text-slate-700 dark:prose-li:text-slate-300">
                                <BasicMarkdownContent
                                    content={parsed.aiAnalysis}
                                />
                            </div>
                        </div>
                    )}

                    {/* Additional Sources Summary within Analysis view */}
                    {parsed.unreadSources.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <Link2 className="w-4 h-4" />
                                {parsed.unreadSources.length} Additional Sources Found
                            </div>
                            <div className="space-y-2">
                                {parsed.unreadSources.slice(0, 6).map(
                                    (source, index) => (
                                        <a
                                            key={index}
                                            href={source.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-green-300 dark:hover:border-green-700 transition-colors group"
                                        >
                                            <div className="flex-shrink-0 w-5 h-5 mt-0.5 relative">
                                                <img
                                                    src={getFaviconUrl(source.url)}
                                                    alt=""
                                                    className="w-5 h-5 rounded"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display =
                                                            "none";
                                                        const sibling = (e.target as HTMLImageElement)
                                                            .nextElementSibling;
                                                        if (sibling)
                                                            sibling.classList.remove("hidden");
                                                    }}
                                                />
                                                <Globe className="w-5 h-5 text-slate-400 hidden" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 leading-tight">
                                                    {source.title}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-xs text-green-600 dark:text-green-400">
                                                        {getDomain(source.url)}
                                                    </span>
                                                    {source.date && (
                                                        <span className="text-xs text-slate-400">
                                                            &middot; {source.date}
                                                        </span>
                                                    )}
                                                    <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                {source.description && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                                        {source.description}
                                                    </p>
                                                )}
                                            </div>
                                        </a>
                                    )
                                )}
                                {parsed.unreadSources.length > 6 && (
                                    <button
                                        onClick={() => setViewMode("sources")}
                                        className="w-full py-2 text-center text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                                    >
                                        View all {parsed.unreadSources.length} sources &rarr;
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* Sources View — All sources with full details                   */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {viewMode === "sources" && (
                <div className="space-y-4">
                    {parsed.unreadSources.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
                            <div className="text-center">
                                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">
                                    No additional source cards — all data is in the analysis
                                </p>
                            </div>
                        </div>
                    ) : (
                        parsed.unreadSources.map((source, index) => (
                            <SourceCard
                                key={index}
                                source={source}
                                index={index}
                            />
                        ))
                    )}
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* Full Text View — Complete raw document for copying              */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {viewMode === "fulltext" && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={handleCopyAll}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                copySuccess
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                        >
                            {copySuccess ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    <span>Copy All Text</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            {fullText}
                        </pre>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
                    {parsed.browsingUrls.length} pages read &middot;{" "}
                    {parsed.unreadSources.length} additional sources &middot;{" "}
                    {parsed.queries.length} search queries
                </p>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Small inline copy button
// ─────────────────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="ml-auto flex-shrink-0 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
            title="Copy analysis"
        >
            {copied ? (
                <Check className="w-4 h-4 text-green-500" />
            ) : (
                <Copy className="w-4 h-4" />
            )}
        </button>
    );
}
