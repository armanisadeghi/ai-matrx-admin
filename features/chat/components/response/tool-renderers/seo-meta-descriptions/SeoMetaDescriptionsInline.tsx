"use client";

import React, { useState } from "react";
import { CheckCircle, AlertTriangle, FileText, Copy, Check } from "lucide-react";
import { ToolRendererProps } from "../types";

interface DescriptionAnalysis {
    description: string;
    pixel_width: number;
    character_count: number;
    desktop_ok: boolean;
    seo_length_ok: boolean;
    description_ok: boolean;
}

interface SeoDescriptionsResult {
    description_analysis: DescriptionAnalysis[];
    count: number;
}

/**
 * Compact inline renderer for SEO Meta Descriptions checker
 * Shows description validation with clear pass/fail indicators and copy buttons
 */
export const SeoMetaDescriptionsInline: React.FC<ToolRendererProps> = ({ 
    toolUpdates,
    currentIndex,
    onOpenOverlay,
    globalIndexOffset = 0 
}) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    
    const visibleUpdates = currentIndex !== undefined 
        ? toolUpdates.slice(0, currentIndex + 1) 
        : toolUpdates;
    
    const copyToClipboard = async (text: string, index: number) => {
        await navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };
    
    if (visibleUpdates.length === 0) return null;
    
    return (
        <>
            {visibleUpdates.map((update, index) => {
                // Handle SEO descriptions output
                if (update.type === "mcp_output" && update.mcp_output) {
                    const rawResult = update.mcp_output.result;
                    if (!rawResult || typeof rawResult !== 'object') return null;
                    const result = rawResult as SeoDescriptionsResult;
                    
                    if (!result.description_analysis || result.description_analysis.length === 0) {
                        return null;
                    }
                    
                    const analysis = result.description_analysis;
                    const displayItems = analysis.slice(0, 10); // Show first 10
                    const hasMore = analysis.length > displayItems.length;
                    const passedCount = analysis.filter(a => a.description_ok).length;
                    const failedCount = analysis.length - passedCount;
                    
                    return (
                        <div key={`seo-descriptions-${index}`} className="space-y-2">
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
                            
                            {/* Description Results - Compact Layout */}
                            <div className="space-y-1.5">
                                {displayItems.map((item, itemIndex) => (
                                    <div
                                        key={itemIndex}
                                        className={`
                                            flex items-start gap-2 py-2 px-3 rounded-lg border animate-in fade-in slide-in-from-left
                                            ${item.description_ok 
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
                                        {/* Status Icon */}
                                        {item.description_ok ? (
                                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                        )}
                                        
                                        {/* Index */}
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-6 flex-shrink-0 mt-0.5">
                                            #{itemIndex + 1}
                                        </span>
                                        
                                        {/* Description Text */}
                                        <p className="flex-1 text-xs text-slate-700 dark:text-slate-300 line-clamp-2 min-w-0">
                                            {item.description}
                                        </p>
                                        
                                        {/* Metrics */}
                                        <div className="flex items-center gap-2 text-xs font-mono flex-shrink-0 mt-0.5">
                                            <span className={item.description_ok ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}>
                                                {item.character_count}c
                                            </span>
                                            <span className="text-slate-400">|</span>
                                            <span className={item.description_ok ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}>
                                                {item.pixel_width}px
                                            </span>
                                        </div>
                                        
                                        {/* Copy Button */}
                                        <button
                                            onClick={() => copyToClipboard(item.description, itemIndex)}
                                            className="flex-shrink-0 p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors mt-0.5"
                                            title="Copy description"
                                        >
                                            {copiedIndex === itemIndex ? (
                                                <Check className="w-3.5 h-3.5 text-green-600" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            {/* View all button if there are more results */}
                            {hasMore && onOpenOverlay && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenOverlay(`tool-update-${globalIndexOffset + index}`);
                                    }}
                                    className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 animate-in fade-in slide-in-from-bottom"
                                    style={{ 
                                        animationDelay: `${displayItems.length * 50}ms`,
                                        animationDuration: '200ms',
                                        animationFillMode: 'backwards'
                                    }}
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>View all {analysis.length} descriptions</span>
                                </button>
                            )}
                        </div>
                    );
                }
                
                return null;
            })}
        </>
    );
};

