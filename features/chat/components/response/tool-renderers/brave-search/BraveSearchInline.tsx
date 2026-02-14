"use client";

import React, { useMemo } from "react";
import { Globe } from "lucide-react";
import { GiArchiveResearch } from "react-icons/gi";
import { ToolRendererProps } from "../types";

/**
 * Compact inline renderer for Brave Search results
 * Shows up to 5 unique sites with favicons and a "+X more" button
 */
export const BraveSearchInline: React.FC<ToolRendererProps> = ({ 
    toolUpdates, 
    currentIndex,
    onOpenOverlay,
    globalIndexOffset = 0 
}) => {
    // Track shown hostnames across all updates to avoid duplicates
    const shownHostnames = useMemo(() => new Set<string>(), []);
    
    const visibleUpdates = currentIndex !== undefined 
        ? toolUpdates.slice(0, currentIndex + 1) 
        : toolUpdates;
    
    if (visibleUpdates.length === 0) return null;
    
    return (
        <>
            {visibleUpdates.map((update, index) => {
                // Render brave search results with message
                if (update.type === "step_data" && update.step_data?.type === "brave_default_page") {
                    const content = update.step_data.content as any;
                    const webResults = content?.web?.results || [];
                    
                    // Filter out duplicates and get up to 5 unique sites for this batch
                    const uniqueSitesForThisBatch: Array<{
                        hostname: string;
                        favicon?: string;
                        url: string;
                    }> = [];
                    
                    for (const result of webResults) {
                        if (uniqueSitesForThisBatch.length >= 5) break;
                        
                        try {
                            const hostname = result.meta_url?.hostname || new URL(result.url).hostname;
                            
                            // Only add if we haven't shown this hostname yet
                            if (!shownHostnames.has(hostname)) {
                                shownHostnames.add(hostname);
                                uniqueSitesForThisBatch.push({
                                    hostname,
                                    favicon: result.meta_url?.favicon,
                                    url: result.url
                                });
                            }
                        } catch (e) {
                            // Skip invalid URLs
                        }
                    }
                    
                    return (
                        <div key={`brave-${index}`} className="space-y-2">
                            {/* Always show user visible message first */}
                            {update.user_visible_message && (
                                <div className="text-xs text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-bottom duration-300">
                                    {update.user_visible_message}
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
                                                    // Set the initial tab to this specific update
                                                    onOpenOverlay(`tool-update-${globalIndexOffset + index}`);
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
                
                // Render user visible messages (for non-step_data updates)
                if (update.user_visible_message && update.type !== "step_data") {
                    return (
                        <div
                            key={`message-${index}`}
                            className="text-xs text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-bottom duration-300"
                        >
                            {update.user_visible_message}
                        </div>
                    );
                }
                
                // Return null for other update types we don't render
                return null;
            })}
        </>
    );
};

