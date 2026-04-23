"use client";

import React from "react";
import { Globe, ExternalLink, AlertTriangle, FileText, Maximize2 } from "lucide-react";
import type { ToolRendererProps } from "../types";

const REDUNDANT_PATTERNS = [
    /^executing\s/i,
    /^running\s/i,
    /^calling\s/i,
    /^tool call result$/i,
    /^tool result$/i,
    /^result$/i,
    /^completed$/i,
    /^done$/i,
    /^finished$/i,
    /^success$/i,
];

function isRedundantMessage(message: string): boolean {
    const trimmed = message.trim();
    return REDUNDANT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function extractPreviewText(result: unknown): string | null {
    if (result == null) return null;
    if (typeof result === "string" && result.length > 0) {
        const cleaned = result.replace(/^[\s\n]+/, "").replace(/\n{3,}/g, "\n\n");
        if (cleaned.length > 0) {
            return cleaned.length > 200 ? cleaned.slice(0, 200) + "..." : cleaned;
        }
        return null;
    }
    if (typeof result === "object" && !Array.isArray(result)) {
        const obj = result as Record<string, unknown>;
        for (const key of ["text", "content", "summary", "message", "description"]) {
            if (typeof obj[key] === "string" && (obj[key] as string).length > 0) {
                const text = obj[key] as string;
                return text.length > 200 ? text.slice(0, 200) + "..." : text;
            }
        }
    }
    return null;
}

function extractResultStats(result: unknown): string | null {
    if (result == null) return null;
    if (typeof result === "string") {
        const lines = result.split("\n").filter((l) => l.trim().length > 0);
        if (lines.length > 3) return `${lines.length} lines of content`;
        if (result.length > 100) return `${Math.round(result.length / 100) / 10}k characters`;
    }
    if (typeof result === "object" && result !== null) {
        const obj = result as Record<string, unknown>;
        for (const key of Object.keys(obj)) {
            if (Array.isArray(obj[key])) {
                const count = (obj[key] as unknown[]).length;
                const label = key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
                return `${count} ${label}`;
            }
        }
        for (const key of ["count", "total", "totalResults", "total_results"]) {
            if (typeof obj[key] === "number") return `${obj[key]} results`;
        }
    }
    return null;
}

function extractUrl(message: string): string | null {
    const urlMatch = message.match(/https?:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0] : null;
}

/**
 * Universal fallback renderer for tools without custom displays.
 *
 * Uses `events[].message` (all non-redundant user-visible messages) for
 * activity feed, `entry.result` for preview/stats, `entry.errorMessage`
 * for error display.
 */
export const GenericRenderer: React.FC<ToolRendererProps> = ({
    entry,
    events,
    onOpenOverlay,
    toolGroupId,
}) => {
    const isComplete = entry.status === "completed";
    const hasError = entry.status === "error";
    const hasResult = isComplete || hasError;

    const allMessages: string[] = events
        ? events.map((e) => e.message).filter((m): m is string => typeof m === "string" && m.length > 0)
        : entry.latestMessage
          ? [entry.latestMessage]
          : [];

    const meaningfulMessages = allMessages.filter((m) => !isRedundantMessage(m));

    const previewText = isComplete ? extractPreviewText(entry.result) : null;
    const resultStats = isComplete ? extractResultStats(entry.result) : null;

    const activityMessages = meaningfulMessages.map((msg) => ({
        text: msg,
        url: extractUrl(msg),
    }));

    const displayMessages = hasResult ? activityMessages.slice(-3) : activityMessages.slice(-2);

    const groupId = toolGroupId ?? entry.callId;

    return (
        <div className="space-y-2.5">
            {displayMessages.length > 0 && (
                <div className="space-y-1.5">
                    {displayMessages.map((msg, index) => (
                        <div
                            key={`msg-${index}`}
                            className="flex items-center gap-2 text-xs animate-in fade-in slide-in-from-bottom duration-300"
                            style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
                        >
                            {msg.url ? (
                                <>
                                    <Globe className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                    <span className="text-slate-500 dark:text-slate-400 truncate">
                                        {msg.text.replace(msg.url, "").trim() || "Browsing"}
                                    </span>
                                    <a
                                        href={msg.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 truncate max-w-[300px] inline-flex items-center gap-1"
                                    >
                                        <span className="truncate">{new URL(msg.url).hostname.replace("www.", "")}</span>
                                        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
                                    </a>
                                </>
                            ) : (
                                <span className="text-slate-600 dark:text-slate-400">{msg.text}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {hasError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 animate-in fade-in duration-300">
                    <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-red-700 dark:text-red-300">Tool call failed</p>
                        {entry.errorMessage && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 line-clamp-2">
                                {entry.errorMessage}
                            </p>
                        )}
                    </div>
                    {onOpenOverlay && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenOverlay(`tool-group-${groupId}`);
                            }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex-shrink-0"
                        >
                            Details
                        </button>
                    )}
                </div>
            )}

            {isComplete && onOpenOverlay && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenOverlay(`tool-group-${groupId}`);
                    }}
                    className="w-full text-left rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all duration-200 group animate-in fade-in slide-in-from-bottom duration-300 overflow-hidden cursor-pointer"
                >
                    {previewText && (
                        <div className="px-3.5 pt-3 pb-2">
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                {previewText}
                            </p>
                        </div>
                    )}
                    <div
                        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${
                            previewText ? "border-t border-slate-200 dark:border-slate-700" : ""
                        }`}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                {resultStats ? `View result — ${resultStats}` : "View full result"}
                            </span>
                        </div>
                        <Maximize2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors flex-shrink-0" />
                    </div>
                </button>
            )}
        </div>
    );
};
