"use client";

import React, { useState } from "react";
import { Search, ExternalLink, Globe, Copy, Check } from "lucide-react";
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
 * Overlay renderer for core web search tool
 * Shows all search queries and their complete results
 */
export const CoreWebSearchOverlay: React.FC<ToolRendererProps> = ({ 
    toolUpdates,
    currentIndex 
}) => {
    const [copySuccess, setCopySuccess] = useState(false);
    
    const visibleUpdates = currentIndex !== undefined 
        ? toolUpdates.slice(0, currentIndex + 1) 
        : toolUpdates;
    
    const outputUpdates = visibleUpdates.filter(u => u.type === "mcp_output");
    
    // Parse search results
    const parseResults = (resultText: string): SearchResult | null => {
        if (!resultText) return null;
        
        // Extract query from first line
        const queryMatch = resultText.match(/🔍 Results for "(.+?)":/);
        if (!queryMatch) return null;
        
        const query = queryMatch[1];
        const results: Array<{ title: string; url: string; snippet: string }> = [];
        
        // Parse numbered results
        const lines = resultText.split('\n');
        for (const line of lines) {
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
    
    const totalResults = searchResults.reduce((acc, r) => acc + r.results.length, 0);
    
    const getDomain = (url: string) => {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return url;
        }
    };
    
    // Generate full text for copying
    const generateFullText = () => {
        let text = `MULTI-QUERY WEB SEARCH RESULTS\n${'='.repeat(80)}\n`;
        text += `Total Searches: ${searchResults.length}\n`;
        text += `Total Results: ${totalResults}\n\n`;
        
        searchResults.forEach((search, index) => {
            text += `\nSEARCH ${index + 1}: "${search.query}"\n${'-'.repeat(80)}\n`;
            search.results.forEach((result, rIndex) => {
                text += `\n${rIndex + 1}. ${result.title}\n`;
                text += `   URL: ${result.url}\n`;
                text += `   Domain: ${getDomain(result.url)}\n`;
                text += `   ${result.snippet}\n`;
            });
            text += `\n${'='.repeat(80)}\n`;
        });
        
        return text;
    };
    
    const fullText = generateFullText();
    
    const handleCopyFullText = async () => {
        try {
            await navigator.clipboard.writeText(fullText);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };
    
    if (searchResults.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                <div className="text-center">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No search results available</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="p-6 space-y-6">
            {/* Header with Stats */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Multi-Query Search Results
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <Search className="w-4 h-4" />
                            <span>{searchResults.length} Searches</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            <span>{totalResults} Results</span>
                        </div>
                    </div>
                </div>
                
                {/* Copy Button */}
                <button
                    onClick={handleCopyFullText}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        copySuccess
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                            <span>Copy All</span>
                        </>
                    )}
                </button>
            </div>
            
            {/* All Search Results */}
            <div className="space-y-6">
                {searchResults.map((search, searchIndex) => (
                    <div
                        key={searchIndex}
                        className="p-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800/50 dark:to-slate-850/50"
                    >
                        {/* Search Query Header */}
                        <div className="flex items-start gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                            <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-1">
                                    Search Query {searchIndex + 1}
                                </div>
                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    "{search.query}"
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                    {search.results.length} {search.results.length === 1 ? 'result' : 'results'}
                                </div>
                            </div>
                        </div>
                        
                        {/* Results List */}
                        <div className="space-y-3">
                            {search.results.map((result, resultIndex) => (
                                <div
                                    key={resultIndex}
                                    className="p-4 rounded-lg bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                                >
                                    {/* Result Header */}
                                    <div className="flex items-start gap-2 mb-2">
                                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-300">
                                            {resultIndex + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <a
                                                href={result.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2 group"
                                            >
                                                {result.title}
                                            </a>
                                            <a
                                                href={result.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 hover:underline mt-1 group"
                                            >
                                                <Globe className="w-3 h-3" />
                                                <span className="truncate max-w-[500px]">{getDomain(result.url)}</span>
                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        </div>
                                    </div>
                                    
                                    {/* Snippet */}
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-8">
                                        {result.snippet}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
                    {searchResults.length} {searchResults.length === 1 ? 'search' : 'searches'} completed • {totalResults} total results
                </p>
            </div>
        </div>
    );
};

