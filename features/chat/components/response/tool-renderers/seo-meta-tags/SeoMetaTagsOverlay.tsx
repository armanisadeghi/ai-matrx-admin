"use client";

import React, { useState, useMemo } from "react";
import { CheckCircle, AlertTriangle, FileText, Filter, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// SEO best practices limits
const TITLE_CHAR_LIMIT = 60;
const TITLE_PIXEL_LIMIT = 600;
const DESC_CHAR_LIMIT = 160;
const DESC_PIXEL_LIMIT = 920;

/**
 * Enhanced overlay renderer for SEO Meta Tags checker
 * Full detailed view with progress bars and recommendations
 */
export const SeoMetaTagsOverlay: React.FC<ToolRendererProps> = ({ toolUpdates }) => {
    const [filterStatus, setFilterStatus] = useState<"all" | "passed" | "failed">("all");
    
    // Extract SEO data from tool updates
    const seoData = useMemo(() => {
        const outputUpdate = toolUpdates.find((u) => u.type === "mcp_output");
        if (!outputUpdate?.mcp_output) return null;
        
        const rawResult = outputUpdate.mcp_output.result;
        if (!rawResult || typeof rawResult !== 'object') return null;
        const result = rawResult as SeoMetaTagsResult;
        if (!result.batch_analysis) return null;
        
        return result;
    }, [toolUpdates]);
    
    // Filter results
    const filteredResults = useMemo(() => {
        if (!seoData) return [];
        
        if (filterStatus === "passed") {
            return seoData.batch_analysis.filter(r => r.overall_ok);
        } else if (filterStatus === "failed") {
            return seoData.batch_analysis.filter(r => !r.overall_ok);
        }
        return seoData.batch_analysis;
    }, [seoData, filterStatus]);
    
    if (!seoData) {
        return (
            <div className="p-4 text-center text-slate-600 dark:text-slate-400">
                No SEO data available
            </div>
        );
    }
    
    const passedCount = seoData.batch_analysis.filter(a => a.overall_ok).length;
    const failedCount = seoData.count - passedCount;
    
    return (
        <div className="w-full h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4">
            {/* Header */}
            <div className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-6 h-6 text-white" />
                    <h1 className="text-2xl font-bold text-white">SEO Meta Tags Analysis</h1>
                </div>
                <div className="flex items-center gap-4 text-white/90">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-semibold">{passedCount} Passed</span>
                    </div>
                    {failedCount > 0 && (
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-semibold">{failedCount} Need Attention</span>
                        </div>
                    )}
                    <span className="ml-auto">Total: {seoData.count}</span>
                </div>
            </div>
            
            {/* Best Practices Info */}
            <div className="mb-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                        <p className="font-semibold mb-1">SEO Best Practices:</p>
                        <ul className="space-y-1 text-xs">
                            <li><strong>Title:</strong> ≤{TITLE_CHAR_LIMIT} characters or ≤{TITLE_PIXEL_LIMIT}px width</li>
                            <li><strong>Description:</strong> ≤{DESC_CHAR_LIMIT} characters or ≤{DESC_PIXEL_LIMIT}px width</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            {/* Filters */}
            <div className="mb-4 flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <Button
                    variant={filterStatus === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus("all")}
                >
                    All ({seoData.count})
                </Button>
                <Button
                    variant={filterStatus === "passed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus("passed")}
                    className={filterStatus === "passed" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                    Passed ({passedCount})
                </Button>
                {failedCount > 0 && (
                    <Button
                        variant={filterStatus === "failed" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterStatus("failed")}
                        className={filterStatus === "failed" ? "bg-orange-600 hover:bg-orange-700" : ""}
                    >
                        Needs Attention ({failedCount})
                    </Button>
                )}
            </div>
            
            {/* Results List */}
            <div className="space-y-4">
                {filteredResults.map((item, index) => (
                    <div
                        key={index}
                        className={`
                            bg-white dark:bg-slate-900 rounded-lg border-2 p-5
                            ${item.overall_ok 
                                ? 'border-green-300 dark:border-green-700' 
                                : 'border-orange-300 dark:border-orange-700'
                            }
                        `}
                    >
                        {/* Header with status */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                                {item.overall_ok ? (
                                    <>
                                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                            Optimized
                                        </Badge>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                            Needs Optimization
                                        </Badge>
                                    </>
                                )}
                            </div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                #{index + 1}
                            </span>
                        </div>
                        
                        {/* Title Section */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Title Tag</h3>
                                <Badge variant={item.title_ok ? "default" : "destructive"} className="text-xs">
                                    {item.title_ok ? "✓ Within Limits" : "⚠ Too Long"}
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-800 dark:text-slate-200 mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                {item.title}
                            </p>
                            
                            {/* Title Character Progress */}
                            <div className="mb-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-slate-600 dark:text-slate-400">Characters</span>
                                    <span className={`font-mono font-semibold ${item.title_ok ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                        {item.title_chars} / {TITLE_CHAR_LIMIT}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all ${item.title_ok ? 'bg-green-500' : 'bg-orange-500'}`}
                                        style={{ width: `${Math.min((item.title_chars / TITLE_CHAR_LIMIT) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                            
                            {/* Title Pixel Progress */}
                            <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-slate-600 dark:text-slate-400">Display Width</span>
                                    <span className={`font-mono font-semibold ${item.title_ok ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                        {item.title_pixels}px / {TITLE_PIXEL_LIMIT}px
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all ${item.title_ok ? 'bg-green-500' : 'bg-orange-500'}`}
                                        style={{ width: `${Math.min((item.title_pixels / TITLE_PIXEL_LIMIT) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Description Section */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Meta Description</h3>
                                <Badge variant={item.description_ok ? "default" : "destructive"} className="text-xs">
                                    {item.description_ok ? "✓ Within Limits" : "⚠ Too Long"}
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-800 dark:text-slate-200 mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                {item.description}
                            </p>
                            
                            {/* Description Character Progress */}
                            <div className="mb-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-slate-600 dark:text-slate-400">Characters</span>
                                    <span className={`font-mono font-semibold ${item.description_ok ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                        {item.description_chars} / {DESC_CHAR_LIMIT}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all ${item.description_ok ? 'bg-green-500' : 'bg-orange-500'}`}
                                        style={{ width: `${Math.min((item.description_chars / DESC_CHAR_LIMIT) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                            
                            {/* Description Pixel Progress */}
                            <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-slate-600 dark:text-slate-400">Display Width</span>
                                    <span className={`font-mono font-semibold ${item.description_ok ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                        {item.description_pixels}px / {DESC_PIXEL_LIMIT}px
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all ${item.description_ok ? 'bg-green-500' : 'bg-orange-500'}`}
                                        style={{ width: `${Math.min((item.description_pixels / DESC_PIXEL_LIMIT) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* No results message */}
            {filteredResults.length === 0 && (
                <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">
                        No results match the selected filter
                    </p>
                </div>
            )}
        </div>
    );
};

