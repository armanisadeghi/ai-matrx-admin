"use client";

import React, { memo, useCallback, useState } from "react";
import { NodeProps, Handle, Position, useNodeId, useReactFlow } from "@xyflow/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Download } from "lucide-react";
import { SourceInputNodeToolbar } from "./SourceInputNodeToolbar";
import SourceInputNodeSettings from "./SourceInputNodeSettings";

import { getNodeStyles, getStatusIcon, getExecutionRequiredIcon, getStatusIconStyle, getExecutionRequiredIconStyle, NODE_ICON_SIZES } from "../../../utils/nodeStyles";
import { getHandleColor } from "../../../utils/nodeStyles";
import { useAppSelector } from "@/lib/redux";
import { selectFieldLabel } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { useDataBrokerWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";
import { workflowSelectors } from "@/lib/redux/workflow/selectors";

interface SourceInputNodeData extends Record<string, unknown> {
    brokerId: string;
    mappedItemId: string;
    source: string;
    sourceId: string;
    isActive?: boolean;
    displayMode?: "detailed" | "compact";
    showToolbar?: boolean;
    onDisplayModeChange?: (mode: "detailed" | "compact") => void;
}

interface SourceInputNodeProps extends NodeProps {
    data: SourceInputNodeData;
}

const SourceInputNodeComponent: React.FC<SourceInputNodeProps> = ({
    data,
    selected,
    dragging,
    positionAbsoluteX,
    positionAbsoluteY,
}) => {
    const nodeId = useNodeId();
    const { setNodes } = useReactFlow();
    const { dataBrokerRecordsById } = useDataBrokerWithFetch();

    // Get current source using the proper selector - much simpler!
    const currentSource = useAppSelector((state) => 
        workflowSelectors.userInputSourceByBrokerId(state, data.brokerId)
    );

    // Use Redux data as single source of truth, fallback to React Flow data only for node ID
    const brokerId = currentSource?.brokerId || data.brokerId;
    const mappedItemId = currentSource?.sourceDetails?.mappedItemId || data.mappedItemId;
    const source = currentSource?.sourceDetails?.source || data.source;
    const sourceId = currentSource?.sourceDetails?.sourceId || data.sourceId;
    const workflowId = data.sourceId || ""; // Assuming sourceId is workflowId for this context

    const fieldLabel = useAppSelector((state) => selectFieldLabel(state, mappedItemId));

    // UI state only
    const [isActive, setIsActive] = useState(true);
    const [internalDisplayMode, setInternalDisplayMode] = useState<"detailed" | "compact">("detailed");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Determine current display mode
    const displayMode = data.displayMode ?? internalDisplayMode;
    const isCompact = displayMode === "compact";

    // Get node styles (using sourceInput type)
    const nodeStyles = getNodeStyles("sourceInput");

    // Handle active state toggle
    const handleActiveToggle = useCallback((checked: boolean) => {
        setIsActive(checked);
        // TODO: In the future, this could dispatch to Redux to save the state
    }, []);

    // Handle display mode toggle
    const handleDisplayModeToggle = useCallback(() => {
        const newMode = displayMode === "detailed" ? "compact" : "detailed";

        // Always update the React Flow node data to ensure consistency
        if (nodeId) {
            setNodes((nds) =>
                nds.map((node) =>
                    node.id === nodeId
                        ? {
                              ...node,
                              data: {
                                  ...node.data,
                                  displayMode: newMode,
                              },
                          }
                        : node
                )
            );
        }

        // Also call the callback if provided (for external state management)
        if (data.onDisplayModeChange) {
            data.onDisplayModeChange(newMode);
        } else {
            // Update internal state as fallback
            setInternalDisplayMode(newMode);
        }
    }, [displayMode, data.onDisplayModeChange, nodeId, setNodes]);

    // Handle double-click to open settings
    const handleDoubleClick = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsSettingsOpen(true);
    }, []);

    // Handle settings
    const handleSettings = useCallback(() => {
        setIsSettingsOpen(true);
    }, []);

    // Get broker display name (use name if available, otherwise ID)
    const brokerDisplayName = dataBrokerRecordsById[brokerId]?.name || brokerId;
    
    // Generate display text using broker name
    const sourceDisplayText = `${brokerDisplayName} Input`;

    // Compact node rendering
    if (isCompact) {
        return (
            <>
                {/* Compact Node Toolbar */}
                <SourceInputNodeToolbar
                    isVisible={selected && data.showToolbar !== false}
                    positionAbsoluteX={positionAbsoluteX}
                    positionAbsoluteY={positionAbsoluteY}
                    onSettings={handleSettings}
                    isCompact={true}
                    displayMode={displayMode}
                    onDisplayModeToggle={handleDisplayModeToggle}
                    workflowId={workflowId}
                    currentMapping={{
                        brokerId,
                        mappedItemId,
                        source,
                        sourceId,
                    }}
                />

                {/* Compact Node */}
                <div
                    className={`
                        relative w-16 h-16 rounded-full
                        ${nodeStyles.borderColor} 
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
                    {/* Icon */}
                    <Download className="w-4 h-4 text-foreground" />

                    {/* Truncated name on hover */}
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg border border-border whitespace-nowrap max-w-32 truncate">
                            {sourceDisplayText}
                        </div>
                    </div>

                    {/* Simple handles for source input */}
                    <Handle
                        type="source"
                        position={Position.Left}
                        id="component-id"
                        className={`${getHandleColor('input')}`}
                        style={{ left: -8, top: '50%' }}
                    />
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="broker-id"
                        className={`${getHandleColor('output')}`}
                        style={{ right: -8, top: '50%' }}
                    />
                </div>

                {/* Settings Modal */}
                <SourceInputNodeSettings
                    isOpen={isSettingsOpen}
                    onOpenChange={setIsSettingsOpen}
                    workflowId={workflowId}
                    currentMapping={{
                        brokerId,
                        mappedItemId,
                        source,
                        sourceId,
                    }}
                />
            </>
        );
    }

    // Detailed node rendering
    return (
        <>
            {/* Node Toolbar */}
            <SourceInputNodeToolbar
                isVisible={selected && data.showToolbar !== false}
                positionAbsoluteX={positionAbsoluteX}
                positionAbsoluteY={positionAbsoluteY}
                onSettings={handleSettings}
                isCompact={false}
                displayMode={displayMode}
                onDisplayModeToggle={handleDisplayModeToggle}
                workflowId={workflowId}
                currentMapping={{
                    brokerId,
                    mappedItemId,
                    source,
                    sourceId,
                }}
            />

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
                            <Download className="w-3 h-3 text-foreground flex-shrink-0 align-middle" />
                            <span className="font-medium text-xs truncate text-foreground align-middle">
                                {sourceDisplayText}
                            </span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0 relative">
                    {/* Handles */}
                    <div className="relative flex items-center mb-1">
                        <Handle
                            type="source"
                            position={Position.Left}
                            id="component-id"
                            className={`${getHandleColor('input')}`}
                            style={{ 
                                left: -10
                            }}
                        />
                        <div className="text-[8px] text-muted-foreground pr-2">
                            <div className="font-mono text-[7px] opacity-70">
                                {fieldLabel || mappedItemId}
                            </div>
                        </div>
                    </div>

                    <div className="relative flex items-center justify-end mb-1">
                        <div className="text-[8px] text-muted-foreground pl-2 text-right">
                            <div className="font-mono text-[7px] opacity-70">
                                {brokerDisplayName}
                            </div>
                        </div>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="broker-id"
                            className={`${getHandleColor('output')}`}
                            style={{ 
                                right: -10
                            }}
                        />
                    </div>

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
                                checked={isActive}
                                onCheckedChange={handleActiveToggle}
                                className="h-2.5 w-5 border data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600 [&>*]:h-2 [&>*]:w-2 [&>*]:data-[state=checked]:translate-x-2.5"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Settings Modal */}
            <SourceInputNodeSettings
                isOpen={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
                workflowId={workflowId}
                currentMapping={{
                    brokerId,
                    mappedItemId,
                    source,
                    sourceId,
                }}
            />
        </>
    );
};

export const SourceInputNode = memo(SourceInputNodeComponent); 