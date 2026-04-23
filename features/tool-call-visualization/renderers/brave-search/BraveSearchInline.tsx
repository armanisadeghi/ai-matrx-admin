"use client";

import React, { useMemo } from "react";
import { Globe, Search } from "lucide-react";
import { GiArchiveResearch } from "react-icons/gi";
import { ToolRendererProps } from "../types";

/**
 * Compact inline renderer for Brave Search results
 * Shows up to 5 unique sites with favicons, a "+X more" pill, and a "View all" button
 */
export const BraveSearchInline: React.FC<ToolRendererProps> = ({ 
    toolUpdates, 
    currentIndex,
    onOpenOverlay,
    toolGroupId = "default" 
}) => {
    // Track shown hostnames across all updates to avoid duplicates
    const shownHostnames = useMemo(() => new Set<string>(), []);
    
    const visibleUpdates = currentIndex !== undefined 
        ? toolUpdates.slice(0, currentIndex + 1) 
        : toolUpdates;
    
    // Check if tool is complete (has output or error)
    const isComplete = visibleUpdates.some(u => u.type === "mcp_output" || u.type === "mcp_error");
    
    // Count total web results across all step_data updates
    const totalResultCount = useMemo(() => {
        let count = 0;
        for (const update of visibleUpdates) {
            if (update.type === "step_data" && update.step_data?.type === "brave_default_page") {
                const content = update.step_data.content as Record<string, unknown>;
                const webResults = (content?.web as Record<string, unknown>)?.results;
                if (Array.isArray(webResults)) count += webResults.length;
            }
        }
        return count;
    }, [visibleUpdates]);
    
    if (visibleUpdates.length === 0) return null;
    
    return (
        <div className="space-y-2">
            {visibleUpdates.map((update, index) => {
                // Render brave search results with message
                if (update.type === "step_data" && update.step_data?.type === "brave_default_page") {
                    const content = update.step_data.content as Record<string, unknown>;
                    const webResults = ((content?.web as Record<string, unknown>)?.results || []) as Array<Record<string, unknown>>;
                    
                    // Filter out duplicates and get up to 5 unique sites for this batch
                    const uniqueSitesForThisBatch: Array<{
                        hostname: string;
                        favicon?: string;
                        url: string;
                    }> = [];
                    
                    for (const result of webResults) {
                        if (uniqueSitesForThisBatch.length >= 5) break;
                        
                        try {
                            const metaUrl = result.meta_url as Record<string, unknown> | undefined;
                            const hostname = (metaUrl?.hostname as string) || new URL(result.url as string).hostname;
                            
                            // Only add if we haven't shown this hostname yet
                            if (!shownHostnames.has(hostname)) {
                                shownHostnames.add(hostname);
                                uniqueSitesForThisBatch.push({
                                    hostname,
                                    favicon: metaUrl?.favicon as string | undefined,
                                    url: result.url as string
                                });
                            }
                        } catch {
                            // Skip invalid URLs
                        }
                    }
                    
                    return (
                        <div key={`brave-${index}`} className="space-y-2">
                            {/* Always show user message first */}
                            {(update.user_message || update.user_visible_message) && (
                                <div className="text-xs text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-bottom duration-300">
                                    {update.user_message || update.user_visible_message}
                                </div>
                            )}
                            
                            {/* Then show the custom brave search visualization if we have sites */}
                            {uniqueSitesForThisBatch.length > 0 && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-left duration-500">
                                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                                        Analyzing {webResults.length} sources:
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {uniqueSitesForThisBatch.map((site, i) => (
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
                                                            // Fallback to Globe icon on error
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
                                        
                                        {/* Show "+X more" indicator if there are additional sites */}
                                        {webResults.length > uniqueSitesForThisBatch.length && onOpenOverlay && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenOverlay(`tool-group-${toolGroupId}`);
                                                }}
                                                className="flex items-center gap-1.5 px-2 py-0 rounded-md bg-blue-50 dark:bg-blue-900/20 animate-in fade-in slide-in-from-bottom hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                                                style={{ animationDelay: `${uniqueSitesForThisBatch.length * 100}ms` }}
                                                title={`Click to view all ${webResults.length} sources`}
                                            >
                                                <GiArchiveResearch className="w-4 h-4" />
                                                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                    +{webResults.length - uniqueSitesForThisBatch.length} more...
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                }
                
                // Render user messages (for non-step_data updates)
                if ((update.user_message || update.user_visible_message) && update.type !== "step_data") {
                    return (
                        <div
                            key={`message-${index}`}
                            className="text-xs text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-bottom duration-300"
                        >
                            {update.user_message || update.user_visible_message}
                        </div>
                    );
                }
                
                // Return null for other update types we don't render
                return null;
            })}
            
            {/* View all results button — always show when overlay is available and we have data */}
            {isComplete && onOpenOverlay && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenOverlay(`tool-group-${toolGroupId}`);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer animate-in fade-in slide-in-from-bottom"
                    style={{ animationDuration: '300ms', animationFillMode: 'backwards' }}
                >
                    <Search className="w-4 h-4" />
                    <span>View {totalResultCount > 0 ? `all ${totalResultCount} search results` : 'search results'}</span>
                </button>
            )}
        </div>
    );
};

