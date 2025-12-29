"use client";

import React, { useState } from "react";
import { CheckCircle, AlertTriangle, FileText, Copy, Check } from "lucide-react";
import { ToolRendererProps } from "../types";

interface MetaTagResult {
    title: string;
    description: string;
    title_pixels: number;
    title_chars: number;
    title_ok: boolean;
    description_pixels: number;
    description_chars: number;
    description_ok: boolean;
    overall_ok: boolean;
}

interface SeoMetaTagsResult {
    batch_analysis: MetaTagResult[];
    count: number;
}

/**
 * Compact inline renderer for SEO Meta Tags checker
 * Shows validation results with color-coded status indicators
 */
export const SeoMetaTagsInline: React.FC<ToolRendererProps> = ({ 
    toolUpdates,
    currentIndex,
    onOpenOverlay 
}) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    
    const visibleUpdates = currentIndex !== undefined 
        ? toolUpdates.slice(0, currentIndex + 1) 
        : toolUpdates;
    
    const copyToClipboard = async (text: string, index: number, type: 'title' | 'description') => {
        await navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };
    
    if (visibleUpdates.length === 0) return null;
    
    return (
        <>
            {visibleUpdates.map((update, index) => {
                // Handle SEO meta tags output
                if (update.type === "mcp_output" && update.mcp_output) {
                    const result = update.mcp_output.result as SeoMetaTagsResult;
                    
                    if (!result || !result.batch_analysis || result.batch_analysis.length === 0) {
                        return null;
                    }
                    
                    const analysis = result.batch_analysis;
                    const displayItems = analysis.slice(0, 10); // Show first 10
                    const hasMore = analysis.length > displayItems.length;
                    const passedCount = analysis.filter(a => a.overall_ok).length;
                    const failedCount = analysis.length - passedCount;
                    
                    return (
                        <div key={`seo-${index}`} className="space-y-3">
                            {/* Summary Stats */}
                            <div className="flex items-center gap-3 text-xs">
                                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="font-medium">{passedCount} passed</span>
                                </div>
                                {failedCount > 0 && (
                                    <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="font-medium">{failedCount} need attention</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Meta Tag Results - Compact Layout */}
                            <div className="space-y-1.5">
                                {displayItems.map((item, itemIndex) => (
                                    <div
                                        key={itemIndex}
                                        className={`
                                            relative py-2 px-3 rounded-lg border animate-in fade-in slide-in-from-left
                                            ${item.overall_ok 
                                                ? 'bg-green-50/50 dark:bg-green-950/10 border-green-300 dark:border-green-800' 
                                                : 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-300 dark:border-orange-800'
                                            }
                                        `}
                                        style={{ 
                                            animationDelay: `${itemIndex * 50}ms`,
                                            animationDuration: '200ms',
                                            animationFillMode: 'backwards'
                                        }}
                                    >
                                        {/* Header Row */}
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                {item.overall_ok ? (
                                                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                                )}
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                    #{itemIndex + 1}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-mono">
                                                <span className={item.title_ok ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}>
                                                    T: {item.title_chars}c/{item.title_pixels}px
                                                </span>
                                                <span className="text-slate-400">|</span>
                                                <span className={item.description_ok ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}>
                                                    D: {item.description_chars}c/{item.description_pixels}px
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Title */}
                                        <div className="flex items-start gap-2 mb-1.5">
                                            <p className="flex-1 text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                                                {item.title}
                                            </p>
                                            <button
                                                onClick={() => copyToClipboard(item.title, itemIndex * 2, 'title')}
                                                className="flex-shrink-0 p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                                                title="Copy title"
                                            >
                                                {copiedIndex === itemIndex * 2 ? (
                                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                                ) : (
                                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                                )}
                                            </button>
                                        </div>
                                        
                                        {/* Description */}
                                        <div className="flex items-start gap-2">
                                            <p className="flex-1 text-xs text-slate-700 dark:text-slate-300 line-clamp-1">
                                                {item.description}
                                            </p>
                                            <button
                                                onClick={() => copyToClipboard(item.description, itemIndex * 2 + 1, 'description')}
                                                className="flex-shrink-0 p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                                                title="Copy description"
                                            >
                                                {copiedIndex === itemIndex * 2 + 1 ? (
                                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                                ) : (
                                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* View all button if there are more results */}
                            {hasMore && onOpenOverlay && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenOverlay(`tool-update-${index}`);
                                    }}
                                    className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 animate-in fade-in slide-in-from-bottom"
                                    style={{ 
                                        animationDelay: `${displayItems.length * 80}ms`,
                                        animationDuration: '300ms',
                                        animationFillMode: 'backwards'
                                    }}
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>View all {analysis.length} meta tag analyses</span>
                                </button>
                            )}
                        </div>
                    );
                }
                
                // Don't render anything for other update types
                return null;
            })}
        </>
    );
};

