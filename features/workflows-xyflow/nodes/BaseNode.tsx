"use client";

import React, { useState, useCallback, memo } from "react";
import { NodeProps, Handle, Position, useNodeId, useReactFlow } from "@xyflow/react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { LucideIcon } from "lucide-react";
import {
    getHandleColor,
    getNodeStyles,
    getExecutionRequiredIcon,
    getExecutionRequiredIconStyle,
    getStatusIcon,
    getStatusIconStyle,
    NODE_ICON_SIZES,
    getNodeConfig,
} from "@/features/workflows-xyflow/utils/nodeStyles";
import { NodeHandles, NodeHandle, CompactNodeHandles } from "@/features/workflows-xyflow/nodes/handles";

// Base interface for all node data
export interface BaseNodeData extends Record<string, unknown> {
    nodeType?: string;
    displayMode?: "detailed" | "compact";
    isActive?: boolean;
    showToolbar?: boolean;
    status?: string;
    executionRequired?: boolean;
}

// Configuration interface for node customization
export interface NodeConfig {
    // Node appearance
    nodeType?: string;
    icon?: LucideIcon;
    displayText?: string;
    
    // Simple handle arrays
    inputHandles?: NodeHandle[];
    outputHandles?: NodeHandle[];
    isValidConnection?: (connection: any) => boolean;
    
    // Custom content components
    CompactContent?: React.ComponentType;
    DetailedContent?: React.ComponentType;
    
    // Toolbar configuration
    ToolbarComponent?: React.ComponentType<{
        nodeId: string;
        isVisible: boolean;
        isCompact: boolean;
        displayMode: "detailed" | "compact";
        onDisplayModeToggle: () => void;
        onSettings?: () => void;
        customActions?: React.ReactNode;
    }>;
    
    // Settings modal
    SettingsComponent?: React.ComponentType<{
        nodeId: string;
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
    }>;
    
    // Event handlers
    onActiveToggle?: (nodeId: string, active: boolean) => void;
    onDisplayModeToggle?: (nodeId: string, newDisplayMode: "detailed" | "compact") => void;
    onDoubleClick?: (nodeId: string) => void;
    onSettings?: (nodeId: string) => void;
    
    // Feature flags
    showActiveToggle?: boolean;
    showStatusIcons?: boolean;
    allowCompactMode?: boolean;
}

interface BaseNodeProps extends Omit<NodeProps, 'data'> {
    config: NodeConfig;
}

const BaseNodeComponent: React.FC<BaseNodeProps> = ({
    config,
    selected,
    dragging,
}) => {
    const nodeId = useNodeId();
    const { updateNodeData, getNode } = useReactFlow();
    
    if (!nodeId) {
        console.error("BaseNode: nodeId is required");
        return null;
    }
    
    const node = getNode(nodeId);
    const data = (node?.data || {}) as BaseNodeData;
    
    // Extract configuration with defaults
    const {
        nodeType = "default",
        icon,
        displayText = "Node",
        inputHandles = [],
        outputHandles = [],
        isValidConnection,
        CompactContent,
        DetailedContent,
        ToolbarComponent,
        SettingsComponent,
        onActiveToggle,
        onDisplayModeToggle,
        onDoubleClick,
        onSettings,
        showActiveToggle = true,
        showStatusIcons = true,
        allowCompactMode = true,
    } = config;
    
    // Get node configuration from styles
    const nodeConfig = getNodeConfig(nodeType);
    const nodeStyles = getNodeStyles(nodeType);
    const IconComponent = icon || nodeConfig.icon;
    
    // Local state
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Extract data with defaults
    const displayMode = data.displayMode || "detailed";
    const isActive = data.isActive !== false; // Default to true
    const showToolbar = data.showToolbar !== false; // Default to true
    const status = data.status || "pending";
    const executionRequired = data.executionRequired || false;
    
    const isCompact = displayMode === "compact";
    
    // Update node data helper
    const updateData = useCallback((updates: Partial<BaseNodeData>) => {
        updateNodeData(nodeId, updates);
    }, [nodeId, updateNodeData]);
    
    // Handle active toggle
    const handleActiveToggle = useCallback((active: boolean) => {
        updateData({ isActive: active });
        onActiveToggle?.(nodeId, active);
    }, [updateData, onActiveToggle, nodeId]);
    
    // Handle display mode toggle
    const handleDisplayModeToggle = useCallback(() => {
        if (!allowCompactMode) return;
        const newMode = displayMode === "detailed" ? "compact" : "detailed";
        
        if (onDisplayModeToggle) {
            // Use custom handler if provided
            onDisplayModeToggle(nodeId, newMode);
        } else {
            // Default behavior - update React Flow node data
            updateData({ displayMode: newMode });
        }
    }, [displayMode, updateData, allowCompactMode, onDisplayModeToggle, nodeId]);
    
    // Handle settings
    const handleSettings = useCallback(() => {
        setIsSettingsOpen(true);
        onSettings?.(nodeId);
    }, [onSettings, nodeId]);
    
    // Handle double click
    const handleDoubleClick = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        
        if (onDoubleClick) {
            onDoubleClick(nodeId);
        } else {
            handleSettings();
        }
    }, [onDoubleClick, handleSettings, nodeId]);
    
    // Compact mode rendering
    if (isCompact) {
        return (
            <>
                {/* Toolbar */}
                {ToolbarComponent && (
                    <ToolbarComponent
                        nodeId={nodeId}
                        isVisible={selected && showToolbar}
                        isCompact={true}
                        displayMode={displayMode}
                        onDisplayModeToggle={handleDisplayModeToggle}
                        onSettings={handleSettings}
                    />
                )}
                
                {/* Compact Node */}
                <div
                    className={`
                        relative w-16 h-16 rounded-full
                        border-2 border-red-500
                        ${nodeStyles.backgroundColor}
                        ${selected ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background" : ""}
                        ${dragging ? "shadow-2xl scale-110" : "shadow-lg hover:shadow-xl"}
                        ${!isActive ? "opacity-60" : ""}
                        transition-all duration-200
                        bg-background dark:bg-background
                        border-2
                        ${selected ? "z-10" : ""}
                        flex items-center justify-center
                        group
                        cursor-pointer
                    `}
                    onDoubleClick={handleDoubleClick}
                >
                    {/* Content */}
                    {CompactContent ? (
                        <CompactContent />
                    ) : (
                        <IconComponent className="w-4 h-4 text-foreground" />
                    )}
                    
                    {/* Tooltip on hover */}
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg border border-border whitespace-nowrap max-w-32 truncate">
                            {displayText}
                        </div>
                    </div>
                    
                    {/* Handles */}
                    <CompactNodeHandles
                        inputHandles={inputHandles}
                        outputHandles={outputHandles}
                        isValidConnection={isValidConnection}
                    />
                </div>
                
                {/* Settings Modal */}
                {SettingsComponent && (
                    <SettingsComponent
                        nodeId={nodeId}
                        isOpen={isSettingsOpen}
                        onOpenChange={setIsSettingsOpen}
                    />
                )}
            </>
        );
    }
    
    // Detailed mode rendering
    return (
        <>
            {/* Toolbar */}
            {ToolbarComponent && (
                <ToolbarComponent
                    nodeId={nodeId}
                    isVisible={selected && showToolbar}
                    isCompact={false}
                    displayMode={displayMode}
                    onDisplayModeToggle={handleDisplayModeToggle}
                    onSettings={handleSettings}
                />
            )}
            
            {/* Main Node Card */}
            <Card
                className={`
                    min-w-[200px] max-w-[300px] 
                    ${nodeStyles.borderColor} 
                    ${nodeStyles.backgroundColor}
                    ${selected ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background" : ""}
                    ${dragging ? "shadow-2xl scale-105" : "shadow-lg hover:shadow-xl"}
                    ${!isActive ? "opacity-70" : ""}
                    transition-all duration-200
                    bg-background dark:bg-background
                    border-2
                    ${selected ? "z-10" : ""}
                    group
                    cursor-pointer
                `}
                onDoubleClick={handleDoubleClick}
            >
                <CardHeader className="pb-2 relative">
                    <div className="flex items-center justify-between">
                        <div className="inline-flex items-center space-x-1">
                            <IconComponent className="w-3 h-3 text-foreground flex-shrink-0 align-middle" />
                            <span className="font-medium text-xs truncate text-foreground align-middle">
                                {displayText}
                            </span>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="pt-0 relative">
                    {/* Handles */}
                    <NodeHandles
                        inputHandles={inputHandles}
                        outputHandles={outputHandles}
                        isValidConnection={isValidConnection}
                    />
                    
                    {/* Custom detailed content - should only be used for additional info, not handles */}
                    {DetailedContent && <DetailedContent />}
                    
                    {/* Status and controls footer */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-border">
                        {/* Status icons */}
                        {showStatusIcons && (
                            <div className="flex items-center gap-2">
                                {React.createElement(getExecutionRequiredIcon(), {
                                    className: `${NODE_ICON_SIZES.small} ${getExecutionRequiredIconStyle(executionRequired)}`,
                                })}
                                {React.createElement(getStatusIcon(status), {
                                    className: `${NODE_ICON_SIZES.small} ${getStatusIconStyle(status)}`,
                                })}
                            </div>
                        )}
                        
                        {/* Active toggle */}
                        {showActiveToggle && (
                            <div className="flex items-center gap-0.5">
                                <span className="text-[8px] text-muted-foreground leading-none">Active</span>
                                <Switch
                                    checked={isActive}
                                    onCheckedChange={handleActiveToggle}
                                    className="h-2.5 w-5 border data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600 [&>*]:h-2 [&>*]:w-2 [&>*]:data-[state=checked]:translate-x-2.5"
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            
            {/* Settings Modal */}
            {SettingsComponent && (
                <SettingsComponent
                    nodeId={nodeId}
                    isOpen={isSettingsOpen}
                    onOpenChange={setIsSettingsOpen}
                />
            )}
        </>
    );
};

export const BaseNode = memo(BaseNodeComponent);
 