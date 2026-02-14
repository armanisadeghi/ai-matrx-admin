"use client";

import React from "react";
import { Search, ExternalLink, Loader2, CheckCircle } from "lucide-react";
import { ToolRendererProps } from "../types";

interface SearchResult {
    query: string;
    results: Array<{
        title: string;
        url: string;
        snippet: string;
    }>;
}

/**
 * Inline renderer for core web search tool
 * Shows multiple parallel searches with compact results
 */
export const CoreWebSearchInline: React.FC<ToolRendererProps> = ({ 
    toolUpdates,
    currentIndex,
    onOpenOverlay,
    toolGroupId = "default" 
}) => {
    const visibleUpdates = currentIndex !== undefined 
        ? toolUpdates.slice(0, currentIndex + 1) 
        : toolUpdates;
    
    if (visibleUpdates.length === 0) return null;
    
    // Extract all queries from mcp_input updates
    const queries = visibleUpdates
        .filter(u => u.type === "mcp_input" && u.mcp_input?.arguments?.query)
        .map(u => u.mcp_input!.arguments.query as string);
    
    // Extract all results from mcp_output updates
    const outputUpdates = visibleUpdates.filter(u => u.type === "mcp_output");
    const isComplete = outputUpdates.length > 0;
    
    // Parse search results
    const parseResults = (resultText: string): SearchResult | null => {
        if (!resultText) return null;
        
        // Extract query from first line: "🔍 Results for \"query\":"
        const queryMatch = resultText.match(/🔍 Results for "(.+?)":/);
        if (!queryMatch) return null;
        
        const query = queryMatch[1];
        const results: Array<{ title: string; url: string; snippet: string }> = [];
        
        // Parse numbered results
        const lines = resultText.split('\n');
        for (const line of lines) {
            // Match format: "1. Title (URL) – Description..."
            const match = line.match(/^\d+\.\s+(.+?)\s+\((.+?)\)\s+[–-]\s+(.+)$/);
            if (match) {
                results.push({
                    title: match[1].trim(),
                    url: match[2].trim(),
                    snippet: match[3].trim()
                });
            }
        }
        
        return { query, results };
    };
    
    const searchResults: SearchResult[] = outputUpdates
        .map(u => {
            const raw = u.mcp_output?.result;
            const text = typeof raw === 'string' ? raw : raw != null ? JSON.stringify(raw) : '';
            return parseResults(text);
        })
        .filter((r): r is SearchResult => r !== null);
    
    const getDomain = (url: string) => {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return url;
        }
    };
    
    return (
        <div className="space-y-3">
            {/* Search Status */}
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                {isComplete ? (
                    <>
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="font-medium">
                            Searched {queries.length} {queries.length === 1 ? 'query' : 'queries'} • {searchResults.reduce((acc, r) => acc + r.results.length, 0)} results
                        </span>
                    </>
                ) : (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">Searching {queries.length} {queries.length === 1 ? 'query' : 'queries'}...</span>
                    </>
                )}
            </div>
            
            {/* Search Queries - Compact Pills */}
            {queries.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {queries.map((query, index) => (
                        <div
                            key={index}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-left"
                            style={{ 
                                animationDelay: `${index * 40}ms`,
                                animationDuration: '200ms',
                                animationFillMode: 'backwards'
                            }}
                        >
                            <Search className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <span className="text-xs text-blue-700 dark:text-blue-300 truncate max-w-[300px]" title={query}>
                                {query}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Top Results - Show 2 from each search */}
            {isComplete && searchResults.length > 0 && (
                <div className="space-y-3">
                    {searchResults.slice(0, 3).map((search, searchIndex) => (
                        <div
                            key={searchIndex}
                            className="space-y-1.5 animate-in fade-in slide-in-from-bottom"
                            style={{ 
                                animationDelay: `${(queries.length * 40) + (searchIndex * 100)}ms`,
                                animationDuration: '300ms',
                                animationFillMode: 'backwards'
                            }}
                        >
                            {/* Query Label */}
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 px-1">
                                "{search.query.length > 60 ? search.query.slice(0, 60) + '...' : search.query}"
                            </div>
                            
                            {/* Top 2 Results */}
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
            
            {/* View All Results Button */}
            {isComplete && searchResults.length > 0 && onOpenOverlay && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenOverlay(`tool-group-${toolGroupId}`);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 animate-in fade-in slide-in-from-bottom"
                    style={{ 
                        animationDelay: `${(queries.length * 40) + (Math.min(searchResults.length, 3) * 100) + 100}ms`,
                        animationDuration: '300ms',
                        animationFillMode: 'backwards'
                    }}
                >
                    <Search className="w-4 h-4" />
                    <span>View all search results ({searchResults.length} searches)</span>
                </button>
            )}
        </div>
    );
};

