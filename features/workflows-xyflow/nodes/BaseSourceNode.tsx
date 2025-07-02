"use client";

import React, { useState, useCallback, memo } from "react";
import { NodeProps, Handle, Position } from "@xyflow/react";
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
} from "@/features/workflows-xyflow/utils/nodeStyles";

export interface BaseSourceNodeData extends Record<string, unknown> {
    brokerId: string;
    workflowId: string;
    isActive?: boolean;
    displayMode?: "detailed" | "compact";
    showToolbar?: boolean;
    onDisplayModeChange?: (mode: "detailed" | "compact") => void;
}

export interface BaseSourceNodeProps extends NodeProps {
    data: BaseSourceNodeData;
}

interface BaseSourceNodeComponentProps extends BaseSourceNodeProps {
    // Display properties
    icon: LucideIcon;
    displayText: string;
    brokerDisplayName: string;
    leftHandleLabel?: string;
    rightHandleLabel?: string;

    // Custom content components
    CompactContent?: React.ComponentType;
    DetailedContent?: React.ComponentType<{
        leftHandleLabel?: string;
        rightHandleLabel?: string;
    }>;

    // Event handlers
    onActiveToggle?: (active: boolean) => void;
    onDoubleClick?: () => void;
    onSettings?: () => void;

    // Toolbar component
    ToolbarComponent?: React.ComponentType<{
        isVisible: boolean;
        positionAbsoluteX?: number;
        positionAbsoluteY?: number;
        onSettings: () => void;
        isCompact: boolean;
        displayMode: "detailed" | "compact";
        onDisplayModeToggle: () => void;
        workflowId: string;
        brokerId: string;
    }>;

    // Settings modal component
    SettingsComponent?: React.ComponentType<{
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
        workflowId: string;
        brokerId: string;
    }>;
}

const BaseSourceNodeComponent: React.FC<BaseSourceNodeComponentProps> = ({
    data,
    selected,
    dragging,
    positionAbsoluteX,
    positionAbsoluteY,
    icon: Icon,
    displayText,
    brokerDisplayName,
    leftHandleLabel,
    rightHandleLabel,
    CompactContent,
    DetailedContent,
    onActiveToggle,
    onDoubleClick,
    onSettings,
    ToolbarComponent,
    SettingsComponent,
}) => {
    const { brokerId, workflowId, isActive = true, displayMode = "detailed", showToolbar = true } = data;

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [localIsActive, setLocalIsActive] = useState(isActive);

    // Get node styles
    const nodeStyles = getNodeStyles("source");

    // Handle active toggle
    const handleActiveToggle = useCallback(
        (active: boolean) => {
            setLocalIsActive(active);
            onActiveToggle?.(active);
        },
        [onActiveToggle]
    );

    // Handle settings
    const handleSettings = useCallback(() => {
        setIsSettingsOpen(true);
        onSettings?.();
    }, [onSettings]);

    // Handle double click
    const handleDoubleClick = useCallback(() => {
        if (onDoubleClick) {
            onDoubleClick();
        } else {
            handleSettings();
        }
    }, [onDoubleClick, handleSettings]);

    // Handle display mode toggle
    const handleDisplayModeToggle = useCallback(() => {
        const newMode = displayMode === "detailed" ? "compact" : "detailed";
        data.onDisplayModeChange?.(newMode);
    }, [displayMode, data]);

    // Compact mode rendering
    if (displayMode === "compact") {
        return (
            <>
                {/* Node Toolbar */}
                {ToolbarComponent && (
                    <ToolbarComponent
                        isVisible={selected && showToolbar}
                        positionAbsoluteX={positionAbsoluteX}
                        positionAbsoluteY={positionAbsoluteY}
                        onSettings={handleSettings}
                        isCompact={true}
                        displayMode={displayMode}
                        onDisplayModeToggle={handleDisplayModeToggle}
                        workflowId={workflowId}
                        brokerId={brokerId}
                    />
                )}

                {/* Compact Node */}
                <div
                    className={`
                        relative w-16 h-16 rounded-full
                        ${nodeStyles.borderColor} 
                        ${nodeStyles.backgroundColor}
                        ${selected ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background" : ""}
                        ${dragging ? "shadow-2xl scale-110" : "shadow-lg hover:shadow-xl"}
                        ${!localIsActive ? "opacity-60" : ""}
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
                    {/* Custom content or default icon */}
                    {CompactContent ? <CompactContent /> : <Icon className="w-4 h-4 text-foreground" />}

                    {/* Truncated name on hover */}
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg border border-border whitespace-nowrap max-w-32 truncate">
                            {displayText}
                        </div>
                    </div>

                    {/* Simple handles */}
                    <Handle
                        type="source"
                        position={Position.Left}
                        id="component-id"
                        className={`${getHandleColor("input")}`}
                        style={{ left: -8, top: "50%" }}
                    />
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="broker-id"
                        className={`${getHandleColor("output")}`}
                        style={{ right: -8, top: "50%" }}
                    />
                </div>

                {/* Settings Modal */}
                {SettingsComponent && (
                    <SettingsComponent
                        isOpen={isSettingsOpen}
                        onOpenChange={setIsSettingsOpen}
                        workflowId={workflowId}
                        brokerId={brokerId}
                    />
                )}
            </>
        );
    }

    // Detailed node rendering
    return (
        <>
            {/* Node Toolbar */}
            {ToolbarComponent && (
                <ToolbarComponent
                    isVisible={selected && showToolbar}
                    positionAbsoluteX={positionAbsoluteX}
                    positionAbsoluteY={positionAbsoluteY}
                    onSettings={handleSettings}
                    isCompact={false}
                    displayMode={displayMode}
                    onDisplayModeToggle={handleDisplayModeToggle}
                    workflowId={workflowId}
                    brokerId={brokerId}
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
                  ${!localIsActive ? "opacity-70" : ""}
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
                            <Icon className="w-3 h-3 text-foreground flex-shrink-0 align-middle" />
                            <span className="font-medium text-xs truncate text-foreground align-middle">{displayText}</span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0 relative">
                    {/* Custom detailed content or default handles */}
                    {DetailedContent ? (
                        <DetailedContent leftHandleLabel={leftHandleLabel} rightHandleLabel={rightHandleLabel} />
                    ) : (
                        <>
                            {/* Default handles */}
                            <div className="relative flex items-center mb-1">
                                <Handle
                                    type="source"
                                    position={Position.Left}
                                    id="component-id"
                                    className={`${getHandleColor("input")}`}
                                    style={{ left: -10 }}
                                />
                                <div className="text-[8px] text-muted-foreground pr-2">
                                    <div className="font-mono text-[7px] opacity-70">{leftHandleLabel || "Component ID"}</div>
                                </div>
                            </div>

                            <div className="relative flex items-center justify-end mb-1">
                                <div className="text-[8px] text-muted-foreground pl-2 text-right">
                                    <div className="font-mono text-[7px] opacity-70">{rightHandleLabel || brokerDisplayName}</div>
                                </div>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id="broker-id"
                                    className={`${getHandleColor("output")}`}
                                    style={{ right: -10 }}
                                />
                            </div>
                        </>
                    )}

                    {/* Status indicators */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-border">
                        <div className="flex items-center gap-2">
                            {/* Execution Required Icon - Always visible */}
                            {React.createElement(getExecutionRequiredIcon(), {
                                className: `${NODE_ICON_SIZES.small} ${getExecutionRequiredIconStyle(false)}`,
                            })}

                            {/* Status Icon - Always visible */}
                            {React.createElement(getStatusIcon("pending"), {
                                className: `${NODE_ICON_SIZES.small} ${getStatusIconStyle("pending")}`,
                            })}
                        </div>

                        {/* Active Toggle Switch */}
                        <div className="flex items-center gap-0.5">
                            <span className="text-[8px] text-muted-foreground leading-none">Active</span>
                            <Switch
                                checked={localIsActive}
                                onCheckedChange={handleActiveToggle}
                                className="h-2.5 w-5 border data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600 [&>*]:h-2 [&>*]:w-2 [&>*]:data-[state=checked]:translate-x-2.5"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Settings Modal */}
            {SettingsComponent && (
                <SettingsComponent isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} workflowId={workflowId} brokerId={brokerId} />
            )}
        </>
    );
};

export const BaseSourceNode = memo(BaseSourceNodeComponent);
 