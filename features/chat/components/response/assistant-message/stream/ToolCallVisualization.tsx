"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Wrench, Search, Globe, CheckCircle, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { ToolCallObject } from "@/lib/redux/socket-io/socket.types";
import { cn } from "@/lib/utils";

interface ToolCallVisualizationProps {
    toolUpdates: ToolCallObject[];
    hasContent?: boolean;
    className?: string;
}

const ToolCallVisualization: React.FC<ToolCallVisualizationProps> = ({ toolUpdates, hasContent = false, className }) => {
    const [visibleUpdates, setVisibleUpdates] = useState<number>(0);
    const [currentPhase, setCurrentPhase] = useState<"starting" | "processing" | "complete">("starting");
    const [isExpanded, setIsExpanded] = useState<boolean>(true);

    // Determine the phase based on tool updates
    useEffect(() => {
        if (toolUpdates.length === 0) {
            setCurrentPhase("starting");
        } else {
            const lastUpdate = toolUpdates[toolUpdates.length - 1];
            if (lastUpdate.type === "mcp_output") {
                setCurrentPhase("complete");
            } else {
                setCurrentPhase("processing");
            }
        }
    }, [toolUpdates]);

    // Gradually reveal updates for smooth animation
    useEffect(() => {
        if (visibleUpdates < toolUpdates.length) {
            const timer = setTimeout(() => {
                setVisibleUpdates((prev) => prev + 1);
            }, 400); // Stagger each update by 400ms
            return () => clearTimeout(timer);
        }
    }, [visibleUpdates, toolUpdates.length]);

    // Reset when new tool call starts
    useEffect(() => {
        if (toolUpdates.length === 0) {
            setVisibleUpdates(0);
        }
    }, [toolUpdates]);

    // Auto-collapse when content starts streaming
    useEffect(() => {
        if (hasContent && currentPhase === "complete") {
            setIsExpanded(false);
        }
    }, [hasContent, currentPhase]);

    // Get the tool name from first mcp_input
    const toolName = useMemo(() => {
        const inputUpdate = toolUpdates.find((u) => u.type === "mcp_input");
        return inputUpdate?.mcp_input?.name || "Tool";
    }, [toolUpdates]);

    // Get query from mcp_input arguments
    const query = useMemo(() => {
        const inputUpdate = toolUpdates.find((u) => u.type === "mcp_input");
        if (inputUpdate?.mcp_input?.arguments) {
            const args = inputUpdate.mcp_input.arguments;
            const queryValue = args.query || args.q || args.search;
            return typeof queryValue === "string" ? queryValue : null;
        }
        return null;
    }, [toolUpdates]);

    // Get step_data updates for custom visualization
    const stepDataUpdates = useMemo(() => {
        return toolUpdates.filter((u) => u.type === "step_data");
    }, [toolUpdates]);

    // Custom rendering for brave_default_page
    const renderBraveSearchSteps = () => {
        if (!stepDataUpdates.length) return null;

        // Show websites being searched
        const elements = stepDataUpdates.slice(0, visibleUpdates - 1).map((update, index) => {
            if (update.step_data?.type === "brave_default_page") {
                const content = update.step_data.content as any;
                const webResults = content?.web?.results || [];
                
                // Show first 3-4 website favicons/names
                return (
                    <div
                        key={index}
                        className="flex items-center gap-2 animate-in fade-in slide-in-from-left duration-500"
                    >
                        <div className="flex -space-x-2">
                            {webResults.slice(0, 4).map((result: any, i: number) => (
                                <div
                                    key={i}
                                    className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-white dark:border-slate-800 flex items-center justify-center"
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                </div>
                            ))}
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                            Analyzing {webResults.length} sources...
                        </span>
                    </div>
                );
            }
            return null;
        }).filter(Boolean);

        if (elements.length === 0) return null;

        return (
            <div className="space-y-2 mt-3">
                {elements}
            </div>
        );
    };

    // Render user visible messages from updates
    const renderMessages = () => {
        const visibleMessages = toolUpdates.slice(0, visibleUpdates).filter((u) => u.user_visible_message);
        
        if (visibleMessages.length === 0) return null;
        
        return (
            <>
                {visibleMessages.map((update, index) => (
                    <div
                        key={index}
                        className="text-xs text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-bottom duration-300"
                        style={{ animationDelay: `${index * 200}ms` }}
                    >
                        {update.user_visible_message}
                    </div>
                ))}
            </>
        );
    };

    if (toolUpdates.length === 0) return null;

    return (
        <div
            className={cn(
                "relative w-full mb-4 rounded-xl overflow-hidden",
                "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900",
                "border border-blue-200 dark:border-slate-700",
                "shadow-sm",
                className
            )}
        >
            {/* Header - Clickable */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-blue-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        {currentPhase === "complete" ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                        )}
                    </div>
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                {toolName}
                            </span>
                            {currentPhase === "complete" && (
                                <span className="text-xs text-green-600 dark:text-green-400">Complete</span>
                            )}
                        </div>
                        {query && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                {query}
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {currentPhase !== "complete" && (
                        <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-pulse" />
                    )}
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                </div>
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="px-4 py-3 space-y-2">
                    {/* Custom rendering for recognized step types */}
                    {stepDataUpdates.some((u) => u.step_data?.type === "brave_default_page") && renderBraveSearchSteps()}
                    
                    {/* Generic messages */}
                    {renderMessages()}
                    
                    {/* Progress indicator */}
                    {currentPhase === "processing" && (
                        <div className="flex items-center gap-2 mt-3">
                            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ width: "60%" }} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ToolCallVisualization;

