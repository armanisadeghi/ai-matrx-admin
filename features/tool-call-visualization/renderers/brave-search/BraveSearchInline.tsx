"use client";

import React, { useMemo } from "react";
import { Globe, Search } from "lucide-react";
import { GiArchiveResearch } from "react-icons/gi";
import type { ToolRendererProps } from "../../types";
import { filterStepEvents, isTerminal } from "../_shared";

interface BraveSite {
    hostname: string;
    favicon?: string;
    url: string;
}

/**
 * Compact inline renderer for Brave Search results.
 *
 * Consumes `events` directly and filters for `brave_default_page` tool_step
 * payloads — matches the server's emission order without any client-side
 * reshaping.
 */
export const BraveSearchInline: React.FC<ToolRendererProps> = ({
    entry,
    events,
    onOpenOverlay,
    toolGroupId = "default",
}) => {
    const bravePages = useMemo(
        () => filterStepEvents(events, "brave_default_page"),
        [events],
    );

    const shownHostnames = useMemo(() => new Set<string>(), []);

    const batches = useMemo(() => {
        const out: Array<{
            key: string;
            message: string | null;
            webResults: Array<Record<string, unknown>>;
            uniqueSites: BraveSite[];
        }> = [];
        for (let i = 0; i < bravePages.length; i++) {
            const { event, metadata } = bravePages[i];
            const content = (metadata.content ?? metadata) as Record<string, unknown>;
            const webResults = ((content?.web as Record<string, unknown> | undefined)
                ?.results ?? []) as Array<Record<string, unknown>>;

            const uniqueSites: BraveSite[] = [];
            for (const result of webResults) {
                if (uniqueSites.length >= 5) break;
                try {
                    const metaUrl = result.meta_url as Record<string, unknown> | undefined;
                    const hostname =
                        (metaUrl?.hostname as string) ||
                        new URL(result.url as string).hostname;
                    if (!shownHostnames.has(hostname)) {
                        shownHostnames.add(hostname);
                        uniqueSites.push({
                            hostname,
                            favicon: metaUrl?.favicon as string | undefined,
                            url: result.url as string,
                        });
                    }
                } catch {
                    // skip invalid URLs
                }
            }

            out.push({
                key: `brave-${event.call_id}-${i}`,
                message: typeof event.message === "string" ? event.message : null,
                webResults,
                uniqueSites,
            });
        }
        return out;
    }, [bravePages, shownHostnames]);

    const totalResultCount = useMemo(
        () => batches.reduce((n, b) => n + b.webResults.length, 0),
        [batches],
    );

    const complete = isTerminal(entry);

    // Progress messages emitted before any step_data arrived.
    const plainMessages = useMemo(() => {
        if (!events) return [];
        return events
            .filter(
                (e) =>
                    e.event !== "tool_step" &&
                    typeof e.message === "string" &&
                    (e.message as string).length > 0,
            )
            .map((e) => e.message as string);
    }, [events]);

    if (batches.length === 0 && plainMessages.length === 0 && !complete) {
        return null;
    }

    return (
        <div className="space-y-2">
            {plainMessages.map((msg, i) => (
                <div
                    key={`msg-${i}`}
                    className="text-xs text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-bottom duration-300"
                >
                    {msg}
                </div>
            ))}

            {batches.map((batch) => (
                <div key={batch.key} className="space-y-2">
                    {batch.message && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-bottom duration-300">
                            {batch.message}
                        </div>
                    )}

                    {batch.uniqueSites.length > 0 && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-left duration-500">
                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                                Analyzing {batch.webResults.length} sources:
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {batch.uniqueSites.map((site, i) => (
                                    <div
                                        key={site.hostname}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-bottom"
                                        style={{ animationDelay: `${i * 100}ms` }}
                                        title={site.url}
                                    >
                                        {site.favicon ? (
                                            <img
                                                src={site.favicon}
                                                alt=""
                                                className="w-4 h-4 rounded"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = "none";
                                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                                                }}
                                            />
                                        ) : (
                                            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        )}
                                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 hidden" />
                                        <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                                            {site.hostname}
                                        </span>
                                    </div>
                                ))}

                                {batch.webResults.length > batch.uniqueSites.length && onOpenOverlay && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenOverlay(`tool-group-${toolGroupId}`);
                                        }}
                                        className="flex items-center gap-1.5 px-2 py-0 rounded-md bg-blue-50 dark:bg-blue-900/20 animate-in fade-in slide-in-from-bottom hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                                        style={{ animationDelay: `${batch.uniqueSites.length * 100}ms` }}
                                        title={`Click to view all ${batch.webResults.length} sources`}
                                    >
                                        <GiArchiveResearch className="w-4 h-4" />
                                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                            +{batch.webResults.length - batch.uniqueSites.length} more...
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {complete && onOpenOverlay && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenOverlay(`tool-group-${toolGroupId}`);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer animate-in fade-in slide-in-from-bottom"
                    style={{ animationDuration: "300ms", animationFillMode: "backwards" }}
                >
                    <Search className="w-4 h-4" />
                    <span>
                        View {totalResultCount > 0 ? `all ${totalResultCount} search results` : "search results"}
                    </span>
                </button>
            )}
        </div>
    );
};
