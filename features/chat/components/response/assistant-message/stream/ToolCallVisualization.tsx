"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CheckCircle, Loader2, Sparkles, ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
import { ToolCallObject } from "@/lib/redux/socket-io/socket.types";
import { cn } from "@/lib/utils";
import { ToolUpdatesOverlay } from "@/features/chat/components/response/tool-updates";
import { getToolName, getInlineRenderer, shouldKeepExpandedOnStream, getToolDisplayName } from "@/features/chat/components/response/tool-renderers";

interface ToolCallVisualizationProps {
    toolUpdates: ToolCallObject[];
    hasContent?: boolean;
    className?: string;
}

const ToolCallVisualization: React.FC<ToolCallVisualizationProps> = ({ toolUpdates, hasContent = false, className }) => {
    const [visibleUpdates, setVisibleUpdates] = useState<number>(0);
    const [currentPhase, setCurrentPhase] = useState<"starting" | "processing" | "complete">("starting");
    const [isExpanded, setIsExpanded] = useState<boolean>(true);
    const [isOverlayOpen, setIsOverlayOpen] = useState<boolean>(false);
    const [initialOverlayTab, setInitialOverlayTab] = useState<string | undefined>(undefined);

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

    // Group updates by tool call ID to handle multiple tools
    const toolGroups = useMemo(() => {
        const groups = new Map<string, ToolCallObject[]>();
        
        toolUpdates.forEach(update => {
            const id = update.id || 'default';
            if (!groups.has(id)) {
                groups.set(id, []);
            }
            groups.get(id)!.push(update);
        });
        
        return Array.from(groups.values());
    }, [toolUpdates]);
    
    // Get info for the first tool (for header display)
    const firstToolGroup = toolGroups[0] || [];
    const toolName = useMemo(() => {
        const inputUpdate = firstToolGroup.find((u) => u.type === "mcp_input");
        return inputUpdate?.mcp_input?.name || null;
    }, [firstToolGroup]);
    
    // Get the pretty display name
    const toolDisplayName = useMemo(() => {
        if (toolGroups.length > 1) {
            return `${toolGroups.length} Tools`; // Multiple tools
        }
        return getToolDisplayName(toolName);
    }, [toolName, toolGroups.length]);

    // Auto-collapse when content starts streaming (unless any tool wants to stay expanded)
    useEffect(() => {
        if (hasContent && currentPhase === "complete") {
            // Check if ANY tool should stay expanded
            const anyToolShouldStayExpanded = toolGroups.some(group => {
                const groupInputUpdate = group.find((u) => u.type === "mcp_input");
                const groupToolName = groupInputUpdate?.mcp_input?.name || null;
                return shouldKeepExpandedOnStream(groupToolName);
            });
            
            if (!anyToolShouldStayExpanded) {
                setIsExpanded(false);
            }
        }
    }, [hasContent, currentPhase, toolGroups]);

    // Get query from mcp_input arguments (for first tool)
    const query = useMemo(() => {
        const inputUpdate = firstToolGroup.find((u) => u.type === "mcp_input");
        if (inputUpdate?.mcp_input?.arguments) {
            const args = inputUpdate.mcp_input.arguments;
            const queryValue = args.query || args.q || args.search;
            return typeof queryValue === "string" ? queryValue : null;
        }
        return null;
    }, [firstToolGroup]);

    // Render all tool groups with their appropriate renderers
    const renderAllUpdates = () => {
        if (visibleUpdates === 0) return null;
        
        // Callback to open overlay with specific tab
        const handleOpenOverlay = (initialTab?: string) => {
            setInitialOverlayTab(initialTab);
            setIsOverlayOpen(true);
        };
        
        // Calculate how many updates to show from each group
        const visibleToolUpdates = toolUpdates.slice(0, visibleUpdates);
        
        return (
            <div className="space-y-4">
                {toolGroups.map((group, groupIndex) => {
                    // Get tool name for this group
                    const groupInputUpdate = group.find((u) => u.type === "mcp_input");
                    const groupToolName = groupInputUpdate?.mcp_input?.name || null;
                    const groupDisplayName = getToolDisplayName(groupToolName);
                    
                    // Get the appropriate renderer for this tool
                    const InlineRenderer = getInlineRenderer(groupToolName);
                    
                    // Filter visible updates for this group
                    const groupVisibleUpdates = group.filter(update => 
                        visibleToolUpdates.some(v => v.id === update.id)
                    );
                    
                    if (groupVisibleUpdates.length === 0) return null;
                    
                    // Calculate current index for this group
                    const currentIndex = groupVisibleUpdates.length - 1;
                    
                    return (
                        <div key={groupIndex}>
                            {/* Tool label if multiple tools */}
                            {toolGroups.length > 1 && (
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                        {groupDisplayName}
                                    </div>
                                </div>
                            )}
                            <InlineRenderer 
                                toolUpdates={group}
                                currentIndex={currentIndex}
                                onOpenOverlay={handleOpenOverlay}
                            />
                        </div>
                    );
                })}
            </div>
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
                                {toolDisplayName}
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
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            setInitialOverlayTab(undefined); // Start from the beginning
                            setIsOverlayOpen(true);
                        }}
                        className="p-1 hover:bg-blue-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                        title="View detailed tool information"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                setInitialOverlayTab(undefined); // Start from the beginning
                                setIsOverlayOpen(true);
                            }
                        }}
                    >
                        <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                </div>
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="px-4 py-3 space-y-3">
                    {/* Render all updates in chronological order */}
                    {renderAllUpdates()}
                    
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

            {/* Tool Updates Overlay */}
            <ToolUpdatesOverlay
                isOpen={isOverlayOpen}
                onClose={() => {
                    setIsOverlayOpen(false);
                    setInitialOverlayTab(undefined); // Reset the initial tab when closing
                }}
                toolUpdates={toolUpdates}
                initialTab={initialOverlayTab}
            />
        </div>
    );
};

export default ToolCallVisualization;

