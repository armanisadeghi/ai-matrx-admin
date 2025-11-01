"use client";

import React, { useState } from "react";
import { X, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Resource } from "./ResourceChips";

interface ResourceDebugModalProps {
    resources: Resource[];
    isVisible: boolean;
}

export function ResourceDebugModal({ resources, isVisible }: ResourceDebugModalProps) {
    const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [minimized, setMinimized] = useState(false);

    if (!isVisible) return null;

    const toggleExpanded = (index: number) => {
        const newExpanded = new Set(expandedIndices);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedIndices(newExpanded);
    };

    const copyToClipboard = async (data: any, index: number) => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const copyAll = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(resources, null, 2));
            setCopiedIndex(-1);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999] w-96 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-semibold text-white">Resource Debug</span>
                    <span className="text-xs text-zinc-400">({resources.length})</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        onClick={() => setMinimized(!minimized)}
                    >
                        {minimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 rotate-180" />}
                    </Button>
                </div>
            </div>

            {!minimized && (
                <>
                    {/* Content */}
                    <div className="max-h-96 overflow-y-auto bg-zinc-900">
                        {resources.length === 0 ? (
                            <div className="p-4 text-center text-xs text-zinc-500">
                                No resources attached
                            </div>
                        ) : (
                            <div className="p-2 space-y-1">
                                {resources.map((resource, index) => {
                                    const isExpanded = expandedIndices.has(index);
                                    const isCopied = copiedIndex === index;

                                    return (
                                        <div
                                            key={index}
                                            className="border border-zinc-700 rounded bg-zinc-800/50 overflow-hidden"
                                        >
                                            {/* Resource Header */}
                                            <div
                                                className="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-zinc-700/50 transition-colors"
                                                onClick={() => toggleExpanded(index)}
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                                    ) : (
                                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                                    )}
                                                    <span className="text-xs font-medium text-white truncate">
                                                        {resource.type}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500">
                                                        #{index + 1}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0 text-zinc-400 hover:text-white hover:bg-zinc-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        copyToClipboard(resource.data, index);
                                                    }}
                                                >
                                                    {isCopied ? (
                                                        <Check className="w-3 h-3 text-green-500" />
                                                    ) : (
                                                        <Copy className="w-3 h-3" />
                                                    )}
                                                </Button>
                                            </div>

                                            {/* Expanded Content */}
                                            {isExpanded && (
                                                <div className="px-2 pb-2">
                                                    <pre className="text-[10px] text-zinc-300 bg-zinc-900 p-2 rounded overflow-x-auto max-h-48 overflow-y-auto font-mono">
                                                        {JSON.stringify(resource.data, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {resources.length > 0 && (
                        <div className="px-2 py-2 bg-zinc-800 border-t border-zinc-700 flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500">
                                Total: {resources.length} resource{resources.length !== 1 ? 's' : ''}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-700"
                                onClick={copyAll}
                            >
                                {copiedIndex === -1 ? (
                                    <>
                                        <Check className="w-3 h-3 mr-1 text-green-500" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copy All
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

