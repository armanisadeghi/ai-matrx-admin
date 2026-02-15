"use client";

import React from "react";
import {
    Globe,
    FileSearch,
    CheckCircle,
    Loader2,
    ChevronRight,
    ScanSearch,
    BookOpenCheck,
} from "lucide-react";
import { ToolRendererProps } from "../types";

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

function parseResearchFindings(summary: string | undefined) {
    if (!summary) return [];

    const lines = summary.split("\n");
    const findings: Array<{ title: string; url: string; preview: string }> = [];

    let currentTitle = "";
    let currentUrl = "";
    let currentPreview = "";

    for (const line of lines) {
        if (line.startsWith("Title:")) {
            if (currentTitle && currentUrl) {
                findings.push({
                    title: currentTitle,
                    url: currentUrl,
                    preview: currentPreview,
                });
            }
            currentTitle = line.replace("Title:", "").trim();
            currentPreview = "";
        } else if (line.startsWith("Url:")) {
            currentUrl = line.replace("Url:", "").trim();
        } else if (line.startsWith("Content Preview:")) {
            currentPreview = line.replace("Content Preview:", "").trim();
        } else if (
            currentPreview &&
            line.trim() &&
            !line.startsWith("---")
        ) {
            currentPreview += " " + line.trim();
        }
    }

    if (currentTitle && currentUrl) {
        findings.push({
            title: currentTitle,
            url: currentUrl,
            preview: currentPreview,
        });
    }

    return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Browsing card sub-component (used during live progress)
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
            {/* Favicon */}
            <div className="flex-shrink-0 w-5 h-5 relative">
                {favicon ? (
                    <img
                        src={favicon}
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
                ) : null}
                <Globe className={`w-5 h-5 text-slate-400 dark:text-slate-500 ${favicon ? "hidden" : ""}`} />
            </div>

            {/* Domain */}
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

            {/* Status indicator */}
            <div className="ml-auto flex-shrink-0">
                {isActivelyReading ? (
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            Reading
                        </span>
                        <div className="flex gap-0.5">
                            <span
                                className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400"
                                style={{ animation: "pulseWave 1.4s infinite ease-in-out" }}
                            />
                            <span
                                className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400"
                                style={{ animation: "pulseWave 1.4s infinite ease-in-out 0.2s" }}
                            />
                            <span
                                className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400"
                                style={{ animation: "pulseWave 1.4s infinite ease-in-out 0.4s" }}
                            />
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

    // Extract browsing URLs from user_visible_message updates
    const browsingUrls = visibleUpdates
        .filter(
            (u) =>
                u.type === "user_visible_message" &&
                u.user_visible_message?.startsWith("Browsing ")
        )
        .map((u) => u.user_visible_message?.replace("Browsing ", "") || "");

    // Check if research is complete and extract summary
    const outputUpdate = visibleUpdates.find((u) => u.type === "mcp_output");
    const isComplete = !!outputUpdate;
    const rawResult = outputUpdate?.mcp_output?.result;
    const researchSummary =
        typeof rawResult === "string"
            ? rawResult
            : rawResult != null
              ? JSON.stringify(rawResult)
              : undefined;

    // Check for summarizing step (step_data may have a loose shape at runtime)
    const isSummarizing = visibleUpdates.some(
        (u) =>
            u.type === "step_data" &&
            (u.step_data as unknown as Record<string, unknown> | undefined)?.status === "summarizing"
    );

    const findings = parseResearchFindings(researchSummary);

    return (
        <div className="space-y-3">
            {/* Status Bar */}
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                {isComplete ? (
                    <>
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="font-medium">
                            Researched {browsingUrls.length}{" "}
                            {browsingUrls.length === 1 ? "source" : "sources"} &bull;{" "}
                            {findings.length}{" "}
                            {findings.length === 1 ? "finding" : "findings"}
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

            {/* Live Browsing Progress — show each URL as it arrives */}
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

            {/* Research Findings — show after complete */}
            {isComplete && findings.length > 0 && (
                <div className="space-y-2">
                    {findings.slice(0, 5).map((finding, index) => (
                        <div
                            key={index}
                            className="p-3 rounded-lg bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/10 dark:to-emerald-950/10 border border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-bottom"
                            style={{
                                animationDelay: `${index * 60}ms`,
                                animationDuration: "300ms",
                                animationFillMode: "backwards",
                            }}
                        >
                            <div className="flex items-start gap-2 mb-2">
                                <ChevronRight className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <a
                                        href={finding.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1"
                                    >
                                        {finding.title}
                                    </a>
                                    <a
                                        href={finding.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-green-600 dark:text-green-400 hover:underline truncate block"
                                    >
                                        {getDomain(finding.url)}
                                    </a>
                                </div>
                            </div>
                            {finding.preview && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 pl-6">
                                    {finding.preview.slice(0, 300)}...
                                </p>
                            )}
                        </div>
                    ))}

                    {findings.length > 5 && (
                        <div className="text-xs text-slate-500 dark:text-slate-500 pl-2">
                            +{findings.length - 5} more findings...
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
                        animationDelay: `${Math.min(findings.length, 5) * 60}ms`,
                        animationDuration: "300ms",
                        animationFillMode: "backwards",
                    }}
                >
                    <FileSearch className="w-4 h-4" />
                    <span>
                        View complete research report ({findings.length}{" "}
                        findings)
                    </span>
                </button>
            )}
        </div>
    );
};
