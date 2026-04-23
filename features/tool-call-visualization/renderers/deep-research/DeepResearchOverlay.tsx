"use client";

import React, { useState, useMemo } from "react";
import {
    BookOpen,
    Globe,
    ExternalLink,
    Clock,
    Copy,
    Check,
    LayoutGrid,
    FileText,
    ChevronDown,
    ChevronUp,
    Link2,
} from "lucide-react";
import { ToolRendererProps } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ReadResult {
    url: string;
    readAt: string;
    title: string;
    text: string;
}

interface UnreadResult {
    title: string;
    url: string;
    snippet: string;
}

interface ParsedResearch {
    query: string;
    readResults: ReadResult[];
    unreadResults: UnreadResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser (shared with inline — duplicated to keep files self-contained)
// ─────────────────────────────────────────────────────────────────────────────

function parseResearchOutput(raw: string): ParsedResearch {
    const query =
        raw.match(/(?:results|searching) for ['"](.+?)['"]/i)?.[1] ?? "";

    const readResultRegex = /<read_result>([\s\S]*?)<\/read_result>/g;
    const readResults: ReadResult[] = [];
    let match: RegExpExecArray | null;

    while ((match = readResultRegex.exec(raw)) !== null) {
        const block = match[1];
        const url = block.match(/Url:\s*(.+)/)?.[1]?.trim() ?? "";
        const readAt = block.match(/Read At:\s*(.+)/)?.[1]?.trim() ?? "";
        const title = block.match(/Title:\s*(.+)/)?.[1]?.trim() ?? "";
        const textMatch = block.match(/Text:\s*\n?([\s\S]*)/);
        const text = textMatch?.[1]?.trim() ?? "";

        if (url || title) {
            readResults.push({ url, readAt, title, text });
        }
    }

    const unreadResults: UnreadResult[] = [];
    const unreadSection = raw.match(
        /Here are other search results[\s\S]*?:\n([\s\S]*)$/
    );
    if (unreadSection) {
        const lines = unreadSection[1].trim();
        const unreadRegex =
            /\d+\.\s+(.+?)\s+\((https?:\/\/[^\s)]+)\)\s+[–-]+\s+([\s\S]*?)(?=\n\d+\.|$)/g;
        let uMatch: RegExpExecArray | null;
        while ((uMatch = unreadRegex.exec(lines)) !== null) {
            unreadResults.push({
                title: uMatch[1].trim(),
                url: uMatch[2].trim(),
                snippet: uMatch[3].trim(),
            });
        }
    }

    return { query, readResults, unreadResults };
}

function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace("www.", "");
    } catch {
        return url;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible text helper
// ─────────────────────────────────────────────────────────────────────────────

const COLLAPSED_CHAR_LIMIT = 500;

function CollapsibleText({ text }: { text: string }) {
    const [expanded, setExpanded] = useState(false);
    const isLong = text.length > COLLAPSED_CHAR_LIMIT;

    return (
        <div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {expanded || !isLong
                    ? text
                    : text.slice(0, COLLAPSED_CHAR_LIMIT) + "..."}
            </p>
            {isLong && (
                <button
                    onClick={() => setExpanded((prev) => !prev)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Show less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Show full content ({Math.round(text.length / 1000)}k
                            chars)
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const DeepResearchOverlay: React.FC<ToolRendererProps> = ({
    toolUpdates,
    currentIndex,
}) => {
    const [viewMode, setViewMode] = useState<"cards" | "fulltext">("cards");
    const [copyAllSuccess, setCopyAllSuccess] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const visibleUpdates =
        currentIndex !== undefined
            ? toolUpdates.slice(0, currentIndex + 1)
            : toolUpdates;

    const outputUpdate = visibleUpdates.find((u) => u.type === "mcp_output");
    const rawResult = outputUpdate?.mcp_output?.result;
    const resultText =
        typeof rawResult === "string"
            ? rawResult
            : rawResult != null
              ? JSON.stringify(rawResult)
              : undefined;

    const parsed = useMemo(
        () => (resultText ? parseResearchOutput(resultText) : null),
        [resultText]
    );

    const readResults = parsed?.readResults ?? [];
    const unreadResults = parsed?.unreadResults ?? [];

    // ── Full text generation ────────────────────────────────────────────────

    const fullText = useMemo(() => {
        if (!parsed) return "";
        let text = "";

        if (parsed.query) {
            text += `RESEARCH QUERY\n${"=".repeat(80)}\n${parsed.query}\n\n`;
        }

        text += `SOURCES READ (${readResults.length})\n${"=".repeat(80)}\n\n`;

        readResults.forEach((r, i) => {
            text += `${i + 1}. ${r.title}\n`;
            text += `   URL: ${r.url}\n`;
            if (r.readAt) text += `   Read At: ${r.readAt}\n`;
            text += `\n${r.text}\n\n`;
            text += `${"-".repeat(80)}\n\n`;
        });

        if (unreadResults.length > 0) {
            text += `\nADDITIONAL SOURCES (${unreadResults.length})\n${"=".repeat(80)}\n\n`;
            unreadResults.forEach((u, i) => {
                text += `${i + 1}. ${u.title}\n`;
                text += `   URL: ${u.url}\n`;
                text += `   ${u.snippet}\n\n`;
            });
        }

        return text;
    }, [parsed, readResults, unreadResults]);

    // ── Copy handlers ───────────────────────────────────────────────────────

    const handleCopyAll = async () => {
        try {
            await navigator.clipboard.writeText(fullText);
            setCopyAllSuccess(true);
            setTimeout(() => setCopyAllSuccess(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleCopyCard = async (result: ReadResult, index: number) => {
        try {
            const text = `${result.title}\n${result.url}\n\n${result.text}`;
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    // ── Empty state ─────────────────────────────────────────────────────────

    if (!parsed || readResults.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                <div className="text-center">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No research data available</p>
                </div>
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="p-6 space-y-6">
            {/* Action Bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>
                            {readResults.length}{" "}
                            {readResults.length === 1 ? "Page" : "Pages"} Read
                        </span>
                    </div>
                    {unreadResults.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Link2 className="w-4 h-4" />
                            <span>{unreadResults.length} More Found</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <button
                        onClick={() => setViewMode("cards")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            viewMode === "cards"
                                ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        <span>Cards</span>
                    </button>
                    <button
                        onClick={() => setViewMode("fulltext")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            viewMode === "fulltext"
                                ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>Full Text</span>
                    </button>

                    {/* Copy All */}
                    <button
                        onClick={handleCopyAll}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            copyAllSuccess
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                    >
                        {copyAllSuccess ? (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                <span>Copy All</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Card View ─────────────────────────────────────────────────── */}
            {viewMode === "cards" && (
                <div className="space-y-5">
                    {readResults.map((result, index) => (
                        <div
                            key={index}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-violet-300 dark:hover:border-violet-700 transition-colors overflow-hidden"
                        >
                            {/* Card Header */}
                            <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-violet-50/80 to-purple-50/60 dark:from-violet-950/20 dark:to-purple-950/15 border-b border-slate-200 dark:border-slate-700">
                                <Globe className="w-4 h-4 text-violet-500 dark:text-violet-400 flex-shrink-0" />
                                <a
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-violet-600 dark:text-violet-400 hover:underline truncate"
                                >
                                    {getDomain(result.url)}
                                </a>
                                {result.readAt && (
                                    <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 ml-auto flex-shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {result.readAt.replace(
                                            /,?\s*at\s*/i,
                                            " "
                                        )}
                                    </span>
                                )}
                                <button
                                    onClick={() =>
                                        handleCopyCard(result, index)
                                    }
                                    className="flex-shrink-0 p-1.5 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                                    title="Copy this source"
                                >
                                    {copiedIndex === index ? (
                                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400" />
                                    )}
                                </button>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 space-y-3">
                                {/* Title */}
                                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                    {result.title || getDomain(result.url)}
                                </h3>

                                {/* Collapsible Content */}
                                {result.text && (
                                    <CollapsibleText text={result.text} />
                                )}

                                {/* Visit Source */}
                                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                                    <a
                                        href={result.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                                    >
                                        Read original article
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Unread Results Section */}
                    {unreadResults.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 pt-2">
                                <Link2 className="w-4 h-4" />
                                <span>
                                    Additional Sources ({unreadResults.length})
                                </span>
                            </div>
                            <div className="space-y-2">
                                {unreadResults.map((result, index) => (
                                    <a
                                        key={index}
                                        href={result.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                {index + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-1">
                                                    {result.title}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mt-0.5">
                                                    <Globe className="w-3 h-3" />
                                                    <span className="truncate">
                                                        {getDomain(result.url)}
                                                    </span>
                                                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                {result.snippet && (
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1.5">
                                                        {result.snippet}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Full Text View ────────────────────────────────────────────── */}
            {viewMode === "fulltext" && (
                <div className="space-y-4">
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
                    {readResults.length}{" "}
                    {readResults.length === 1 ? "source" : "sources"} researched
                    {unreadResults.length > 0 &&
                        ` + ${unreadResults.length} additional sources found`}
                </p>
            </div>
        </div>
    );
};
