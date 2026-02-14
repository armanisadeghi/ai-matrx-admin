"use client";

import React, { useState } from "react";
import { Globe, ExternalLink, FileSearch, LayoutGrid, FileText, Copy, Check } from "lucide-react";
import { ToolRendererProps } from "../types";

/**
 * Overlay renderer for web research tool (web_search_v1)
 * Shows complete research findings with full content
 */
export const WebResearchOverlay: React.FC<ToolRendererProps> = ({ 
    toolUpdates,
    currentIndex 
}) => {
    const [viewMode, setViewMode] = useState<'cards' | 'fulltext'>('cards');
    const [copySuccess, setCopySuccess] = useState(false);
    
    const visibleUpdates = currentIndex !== undefined 
        ? toolUpdates.slice(0, currentIndex + 1) 
        : toolUpdates;
    
    const outputUpdate = visibleUpdates.find(u => u.type === "mcp_output");
    const rawResult = outputUpdate?.mcp_output?.result;
    // Safely coerce to string — result may be an object/array from DB
    const researchSummary = typeof rawResult === 'string'
        ? rawResult
        : rawResult != null ? JSON.stringify(rawResult) : undefined;
    
    if (!researchSummary) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                <div className="text-center">
                    <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No research data available</p>
                </div>
            </div>
        );
    }
    
    // Parse the research summary
    const parseResearchSummary = (summary: string) => {
        const lines = summary.split('\n');
        
        // Extract intro (first line before "---")
        const introEndIndex = lines.findIndex(line => line.trim() === '---');
        const intro = introEndIndex > 0 
            ? lines.slice(0, introEndIndex).join('\n').replace(/^Top results for /, '').trim()
            : '';
        
        // Parse findings
        const findings: Array<{ 
            title: string; 
            url: string; 
            preview: string;
            date?: string;
        }> = [];
        
        let currentTitle = '';
        let currentUrl = '';
        let currentPreview = '';
        let currentDate = '';
        
        for (let i = introEndIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('Title:')) {
                // Save previous finding
                if (currentTitle && currentUrl) {
                    findings.push({ 
                        title: currentTitle, 
                        url: currentUrl, 
                        preview: currentPreview.trim(),
                        date: currentDate || undefined
                    });
                }
                
                // Extract title and optional date
                const titleLine = line.replace('Title:', '').trim();
                const dateMatch = titleLine.match(/\((.*?)\)$/);
                if (dateMatch) {
                    currentDate = dateMatch[1];
                    currentTitle = titleLine.replace(/\s*\(.*?\)$/, '').trim();
                } else {
                    currentDate = '';
                    currentTitle = titleLine;
                }
                currentPreview = '';
            } else if (line.startsWith('Url:')) {
                currentUrl = line.replace('Url:', '').trim();
            } else if (line.startsWith('Content Preview:')) {
                currentPreview = line.replace('Content Preview:', '').trim();
            } else if (currentPreview && line.trim() && !line.startsWith('---') && !line.startsWith('Title:')) {
                currentPreview += ' ' + line.trim();
            }
        }
        
        // Add the last finding
        if (currentTitle && currentUrl) {
            findings.push({ 
                title: currentTitle, 
                url: currentUrl, 
                preview: currentPreview.trim(),
                date: currentDate || undefined
            });
        }
        
        return { intro, findings };
    };
    
    const { intro, findings } = parseResearchSummary(researchSummary);
    
    const getDomain = (url: string) => {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return url;
        }
    };
    
    // Generate full text version for copying/reading
    const generateFullText = () => {
        let text = '';
        
        if (intro) {
            text += `RESEARCH QUERY\n${'='.repeat(80)}\n${intro}\n\n\n`;
        }
        
        text += `RESEARCH FINDINGS (${findings.length} Sources)\n${'='.repeat(80)}\n\n`;
        
        findings.forEach((finding, index) => {
            text += `${index + 1}. ${finding.title}\n`;
            if (finding.date) {
                text += `   Date: ${finding.date}\n`;
            }
            text += `   Source: ${finding.url}\n`;
            text += `   Domain: ${getDomain(finding.url)}\n\n`;
            if (finding.preview) {
                text += `   ${finding.preview.replace(/\n/g, '\n   ')}\n\n`;
            }
            text += `${'-'.repeat(80)}\n\n`;
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
    
    return (
        <div className="p-6 space-y-6">
            {/* Research Context */}
            {intro && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                        <FileSearch className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                                Research Query
                            </h3>
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                {intro}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Header with Stats and View Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Globe className="w-4 h-4" />
                    <span className="font-medium">{findings.length} Sources Researched</span>
                </div>
                
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode('cards')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            viewMode === 'cards'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        <span>Cards</span>
                    </button>
                    <button
                        onClick={() => setViewMode('fulltext')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            viewMode === 'fulltext'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>Full Text</span>
                    </button>
                </div>
            </div>
            
            {/* Card View - Individual Findings */}
            {viewMode === 'cards' && (
            <div className="space-y-4">
                {findings.map((finding, index) => (
                    <div
                        key={index}
                        className="p-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-green-300 dark:hover:border-green-700 transition-colors"
                    >
                        {/* Finding Header */}
                        <div className="mb-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex-1">
                                    {finding.title}
                                </h3>
                                {finding.date && (
                                    <span className="text-xs text-slate-500 dark:text-slate-500 flex-shrink-0 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                        {finding.date}
                                    </span>
                                )}
                            </div>
                            <a
                                href={finding.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-green-600 dark:text-green-400 hover:underline group"
                            >
                                <Globe className="w-3.5 h-3.5" />
                                <span>{getDomain(finding.url)}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                        </div>
                        
                        {/* Full Content Preview */}
                        {finding.preview && (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {finding.preview}
                                </p>
                            </div>
                        )}
                        
                        {/* Visit Source Link */}
                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <a
                                href={finding.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                                Read full article
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                ))}
            </div>
            )}
            
            {/* Full Text View - Complete Document */}
            {viewMode === 'fulltext' && (
            <div className="space-y-4">
                {/* Copy Button */}
                <div className="flex justify-end">
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
                                <span>Copy All Text</span>
                            </>
                        )}
                    </button>
                </div>
                
                {/* Full Text Content */}
                <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                    <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
{fullText}
                    </pre>
                </div>
            </div>
            )}
            
            {/* Footer Note */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
                    Research completed from {findings.length} sources • All content previews shown in full
                </p>
            </div>
        </div>
    );
};

