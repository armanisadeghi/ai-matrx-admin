"use client";

import React from "react";
import { Globe, FileSearch, CheckCircle, Loader2, ChevronRight } from "lucide-react";
import { ToolRendererProps } from "../types";

/**
 * Inline renderer for web research tool (web_search_v1)
 * Shows browsing progress and research findings
 */
export const WebResearchInline: React.FC<ToolRendererProps> = ({ 
    toolUpdates,
    currentIndex,
    onOpenOverlay 
}) => {
    const visibleUpdates = currentIndex !== undefined 
        ? toolUpdates.slice(0, currentIndex + 1) 
        : toolUpdates;
    
    if (visibleUpdates.length === 0) return null;
    
    // Extract browsing URLs from user_visible_message updates
    const browsingUrls = visibleUpdates
        .filter(u => u.type === "user_visible_message" && u.user_visible_message?.startsWith("Browsing "))
        .map(u => u.user_visible_message?.replace("Browsing ", "") || "");
    
    // Check if research is complete and extract summary
    const outputUpdate = visibleUpdates.find(u => u.type === "mcp_output");
    const isComplete = !!outputUpdate;
    const researchSummary = outputUpdate?.mcp_output?.result as string | undefined;
    
    // Extract domain names for compact display
    const getDomain = (url: string) => {
        try {
            const hostname = new URL(url).hostname;
            return hostname.replace('www.', '');
        } catch {
            return url;
        }
    };
    
    // Parse research summary to extract key findings
    const parseResearchFindings = (summary: string | undefined) => {
        if (!summary) return [];
        
        const lines = summary.split('\n');
        const findings: Array<{ title: string; url: string; preview: string }> = [];
        
        let currentTitle = '';
        let currentUrl = '';
        let currentPreview = '';
        
        for (const line of lines) {
            if (line.startsWith('Title:')) {
                if (currentTitle && currentUrl) {
                    findings.push({ title: currentTitle, url: currentUrl, preview: currentPreview });
                }
                currentTitle = line.replace('Title:', '').trim();
                currentPreview = '';
            } else if (line.startsWith('Url:')) {
                currentUrl = line.replace('Url:', '').trim();
            } else if (line.startsWith('Content Preview:')) {
                currentPreview = line.replace('Content Preview:', '').trim();
            } else if (currentPreview && line.trim() && !line.startsWith('---')) {
                currentPreview += ' ' + line.trim();
            }
        }
        
        // Add the last finding
        if (currentTitle && currentUrl) {
            findings.push({ title: currentTitle, url: currentUrl, preview: currentPreview });
        }
        
        return findings;
    };
    
    const findings = parseResearchFindings(researchSummary);
    
    return (
        <div className="space-y-3">
            {/* Research Status */}
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                {isComplete ? (
                    <>
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="font-medium">Researched {browsingUrls.length} sources • {findings.length} findings</span>
                    </>
                ) : (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">Browsing {browsingUrls.length} sources...</span>
                    </>
                )}
            </div>
            
            {/* Research Findings - Show first 5 */}
            {isComplete && findings.length > 0 && (
                <div className="space-y-2">
                    {findings.slice(0, 5).map((finding, index) => (
                        <div
                            key={index}
                            className="p-3 rounded-lg bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/10 dark:to-emerald-950/10 border border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-bottom"
                            style={{ 
                                animationDelay: `${index * 60}ms`,
                                animationDuration: '300ms',
                                animationFillMode: 'backwards'
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
            
            {/* View Full Research Button - ALWAYS show when complete */}
            {isComplete && onOpenOverlay && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        const outputIndex = toolUpdates.findIndex(u => u.type === "mcp_output");
                        onOpenOverlay(outputIndex >= 0 ? `tool-update-${outputIndex}` : undefined);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 text-sm font-medium hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all duration-200 flex items-center justify-center gap-2 border border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 animate-in fade-in slide-in-from-bottom"
                    style={{ 
                        animationDelay: `${Math.min(findings.length, 5) * 60}ms`,
                        animationDuration: '300ms',
                        animationFillMode: 'backwards'
                    }}
                >
                    <FileSearch className="w-4 h-4" />
                    <span>View complete research report ({findings.length} findings)</span>
                </button>
            )}
        </div>
    );
};

