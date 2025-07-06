"use client";

import React, { useState, useCallback, memo } from "react";
import { NodeProps, useNodeId, useReactFlow } from "@xyflow/react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { LucideIcon } from "lucide-react";
import {
    getNodeStyles,
    getExecutionRequiredIcon,
    getExecutionRequiredIconStyle,
    getStatusIcon,
    getStatusIconStyle,
    NODE_ICON_SIZES,
    getNodeConfig,
} from "@/features/workflows-xyflow/utils/nodeStyles";
import { NodeHandles, NodeHandle, CompactNodeHandles } from "@/features/workflows-xyflow/nodes/handles";
import BaseNodeToolbar, { ToolbarAction } from "./BaseNodeToolbar";

export interface BaseNodeData extends Record<string, unknown> {
    nodeType?: string;
    displayMode?: "detailed" | "compact";
    isActive?: boolean;
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
    
    // Settings modal
    SettingsComponent?: React.ComponentType<{
        nodeId: string;
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
    }>;
    
    // Required handlers
    onDuplicate?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    
    // Additional toolbar actions
    additionalActions?: ToolbarAction[];
    
    // Event handlers
    onActiveToggle?: (nodeId: string, active: boolean) => void;
    onDoubleClick?: (nodeId: string) => void;
    
    // Feature flags
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
    const { updateNodeData, getNode, deleteElements } = useReactFlow();
    
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
        SettingsComponent,
        onDuplicate,
        onDelete,
        additionalActions = [],
        onActiveToggle,
        onDoubleClick,
        allowCompactMode = true,
    } = config;
    
    // Get node configuration from styles
    const nodeConfig = getNodeConfig(nodeType);
    const nodeStyles = getNodeStyles(nodeType);
    const IconComponent = icon || nodeConfig.icon;
    
    // Local state
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Extract data with defaults (displayMode comes from React Flow node data)
    const displayMode = data.displayMode ?? "detailed";
    const isActive = data.isActive !== false; // Default to true
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
    
    // Handle display mode toggle (exactly like WorkflowNode)
    const handleDisplayModeToggle = useCallback(() => {
        if (!allowCompactMode) return;
        const newMode = displayMode === "detailed" ? "compact" : "detailed";
        
        // Use React Flow's direct method to update node data (like WorkflowNode)
        if (nodeId) {
            updateNodeData(nodeId, { displayMode: newMode });
        }
    }, [displayMode, nodeId, updateNodeData, allowCompactMode]);
    
    // Handle settings
    const handleSettings = useCallback(() => {
        setIsSettingsOpen(true);
        console.log("Settings clicked for node:", nodeId);
    }, [nodeId]);
    
    // Handle duplicate
    const handleDuplicate = useCallback(() => {
        if (onDuplicate) {
            onDuplicate(nodeId);
        } else {
            console.log("Duplicate clicked for node:", nodeId);
        }
    }, [onDuplicate, nodeId]);
    
    // Handle delete
    const handleDelete = useCallback(() => {
        if (onDelete) {
            onDelete(nodeId);
        } else {
            // Default delete behavior
            deleteElements({ nodes: [{ id: nodeId }] });
            console.log("Delete clicked for node:", nodeId);
        }
    }, [onDelete, nodeId, deleteElements]);
    
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
                {/* Built-in Toolbar */}
                <BaseNodeToolbar
                    nodeId={nodeId}
                    isVisible={selected}
                    isCompact={true}
                    displayMode={displayMode}
                    onSettings={handleSettings}
                    onDuplicate={onDuplicate ? handleDuplicate : undefined}
                    onDelete={handleDelete}
                    onDisplayModeToggle={handleDisplayModeToggle}
                    additionalActions={additionalActions}
                />
                
                {/* Compact Node */}
                <div
                    className={`
                        relative w-16 h-16 rounded-full
                        border-2 border-gray-500
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
                    {/* Top Section: Icon and Label (in compact, just icon) */}
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
                    
                    {/* Center Section: Handles (fixed) */}
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
            {/* Built-in Toolbar */}
            <BaseNodeToolbar
                nodeId={nodeId}
                isVisible={selected}
                isCompact={false}
                displayMode={displayMode}
                onSettings={handleSettings}
                onDuplicate={onDuplicate ? handleDuplicate : undefined}
                onDelete={handleDelete}
                onDisplayModeToggle={handleDisplayModeToggle}
                additionalActions={additionalActions}
            />
            
            {/* Main Node Card */}
            <Card
                className={`
                    min-w-[200px] max-w-[300px] min-h-[200px] max-h-[300px]
                    border border-gray-500
                    ${selected ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background" : ""}
                    ${dragging ? "shadow-2xl scale-105" : "shadow-lg hover:shadow-xl"}
                    ${!isActive ? "opacity-70" : ""}
                    transition-all duration-200
                    bg-background dark:bg-background
                    border-2
                    ${selected ? "z-10" : ""}
                    group
                    cursor-pointer
                    flex flex-col
                `}
                onDoubleClick={handleDoubleClick}
            >
                {/* Top Section: Icon and Label (fixed) */}
                <CardHeader className="pb-2 relative flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="inline-flex items-center space-x-1">
                            <IconComponent className="w-3 h-3 text-foreground flex-shrink-0 align-middle" />
                            <span className="font-medium text-xs truncate text-foreground align-middle">
                                {displayText}
                            </span>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="pt-0 relative flex-grow flex flex-col">
                    {/* Center Section: Handles (fixed) and Custom Content */}
                    <div className="flex-grow">
                        <NodeHandles
                            inputHandles={inputHandles}
                            outputHandles={outputHandles}
                            isValidConnection={isValidConnection}
                        />
                        
                        {/* Custom detailed content - should only be used for additional info, not handles */}
                        {DetailedContent && <DetailedContent />}
                    </div>
                    
                    {/* Bottom Section: Status and controls (fixed) - Always at bottom */}
                    <div className="flex items-center justify-between mt-auto pt-1 border-t border-border flex-shrink-0">
                        {/* Status icons */}
                        <div className="flex items-center gap-2">
                            {React.createElement(getExecutionRequiredIcon(), {
                                className: `${NODE_ICON_SIZES.small} ${getExecutionRequiredIconStyle(executionRequired)}`,
                            })}
                            {React.createElement(getStatusIcon(status), {
                                className: `${NODE_ICON_SIZES.small} ${getStatusIconStyle(status)}`,
                            })}
                        </div>
                        
                        {/* Active toggle */}
                        <div className="flex items-center gap-0.5">
                            <span className="text-[8px] text-muted-foreground leading-none">Active</span>
                            <Switch
                                checked={isActive}
                                onCheckedChange={handleActiveToggle}
                                className="h-2.5 w-5 border data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600 [&>*]:h-2 [&>*]:w-2 [&>*]:data-[state=checked]:translate-x-2.5"
                            />
                        </div>
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
 