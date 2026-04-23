"use client";

import React, { useMemo } from "react";
import { Search, ExternalLink, Loader2, CheckCircle } from "lucide-react";
import type { ToolRendererProps } from "../../types";
import { getArg, resultAsString, isTerminal } from "../_shared";

interface SearchResult {
    query: string;
    results: Array<{ title: string; url: string; snippet: string }>;
}

/**
 * Parse the serialized `core_web_search` result text which may contain
 * multiple search sections of the form:
 *
 *   🔍 Results for "query":
 *   1. Title (URL) – Description
 *   ...
 */
function parseMultiSearchResult(text: string | null): SearchResult[] {
    if (!text) return [];
    const sections = text.split(/(?=🔍 Results for )/g);
    const out: SearchResult[] = [];
    for (const section of sections) {
        const queryMatch = section.match(/🔍 Results for "(.+?)":/);
        if (!queryMatch) continue;
        const query = queryMatch[1];
        const results: SearchResult["results"] = [];
        for (const line of section.split("\n")) {
            const m = line.match(/^\d+\.\s+(.+?)\s+\((.+?)\)\s+[–-]\s+(.+)$/);
            if (m) {
                results.push({ title: m[1].trim(), url: m[2].trim(), snippet: m[3].trim() });
            }
        }
        out.push({ query, results });
    }
    return out;
}

function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace("www.", "");
    } catch {
        return url;
    }
}

export const CoreWebSearchInline: React.FC<ToolRendererProps> = ({
    entry,
    onOpenOverlay,
    toolGroupId = "default",
}) => {
    const isComplete = isTerminal(entry);

    const queries: string[] = useMemo(() => {
        const argQueries = getArg<unknown>(entry, "queries");
        if (Array.isArray(argQueries)) {
            return argQueries.filter((q): q is string => typeof q === "string");
        }
        const singleQuery = getArg<unknown>(entry, "query");
        return typeof singleQuery === "string" ? [singleQuery] : [];
    }, [entry]);

    const searchResults = useMemo(
        () => parseMultiSearchResult(resultAsString(entry)),
        [entry],
    );

    // If the server didn't give us query args, fall back to the parsed result queries.
    const displayQueries = queries.length > 0
        ? queries
        : searchResults.map((r) => r.query);

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                {isComplete ? (
                    <>
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="font-medium">
                            Searched {displayQueries.length}{" "}
                            {displayQueries.length === 1 ? "query" : "queries"} •{" "}
                            {searchResults.reduce((a, r) => a + r.results.length, 0)} results
                        </span>
                    </>
                ) : (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">
                            Searching {displayQueries.length}{" "}
                            {displayQueries.length === 1 ? "query" : "queries"}...
                        </span>
                    </>
                )}
            </div>

            {displayQueries.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {displayQueries.map((query, index) => (
                        <div
                            key={index}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-left"
                            style={{
                                animationDelay: `${index * 40}ms`,
                                animationDuration: "200ms",
                                animationFillMode: "backwards",
                            }}
                        >
                            <Search className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <span
                                className="text-xs text-blue-700 dark:text-blue-300 truncate max-w-[300px]"
                                title={query}
                            >
                                {query}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {isComplete && searchResults.length > 0 && (
                <div className="space-y-3">
                    {searchResults.slice(0, 3).map((search, searchIndex) => (
                        <div
                            key={searchIndex}
                            className="space-y-1.5 animate-in fade-in slide-in-from-bottom"
                            style={{
                                animationDelay: `${displayQueries.length * 40 + searchIndex * 100}ms`,
                                animationDuration: "300ms",
                                animationFillMode: "backwards",
                            }}
                        >
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 px-1">
                                &quot;{search.query.length > 60 ? search.query.slice(0, 60) + "..." : search.query}&quot;
                            </div>

                            {search.results.slice(0, 2).map((result, resultIndex) => (
                                <a
                                    key={resultIndex}
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                                >
                                    <div className="flex items-start gap-2 mb-1">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                {result.title}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-0.5">
                                                <span className="truncate">{getDomain(result.url)}</span>
                                                <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                        {result.snippet}
                                    </p>
                                </a>
                            ))}

                            {search.results.length > 2 && (
                                <div className="text-xs text-slate-500 dark:text-slate-500 px-1">
                                    +{search.results.length - 2} more results
                                </div>
                            )}
                        </div>
                    ))}

                    {searchResults.length > 3 && (
                        <div className="text-xs text-slate-500 dark:text-slate-500 px-1">
                            +{searchResults.length - 3} more searches
                        </div>
                    )}
                </div>
            )}

            {isComplete && searchResults.length > 0 && onOpenOverlay && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenOverlay(`tool-group-${toolGroupId}`);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer animate-in fade-in slide-in-from-bottom"
                    style={{
                        animationDelay: `${displayQueries.length * 40 + Math.min(searchResults.length, 3) * 100 + 100}ms`,
                        animationDuration: "300ms",
                        animationFillMode: "backwards",
                    }}
                >
                    <Search className="w-4 h-4" />
                    <span>View all search results ({searchResults.length} searches)</span>
                </button>
            )}
        </div>
    );
};
