"use client";

import React, { memo, useCallback, useEffect, useState } from "react";
import { NodeProps, useUpdateNodeInternals, NodeResizer, useNodeId, useReactFlow } from "@xyflow/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WorkflowNode } from "@/lib/redux/workflow-nodes/types";
import {
    getNodeStyles,
    getNodeIcon,
    getStatusIcon,
    getExecutionRequiredIcon,
    getStatusIconStyle,
    getExecutionRequiredIconStyle,
    NODE_ICON_SIZES,
} from "../../utils/nodeStyles";
import { NodeToolbar } from "./NodeToolbar";
import { WorkflowNodeHandles } from "./WorkflowNodeHandles";
import { WorkflowCompactNodeHandles } from "./WorkflowCompactNodeHandles";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { workflowNodesActions } from "@/lib/redux/workflow-nodes/slice";
import { NodeEditorOne } from "./dynamic-node-editor/FlexibleNodeEditor";
import { Switch } from "@/components/ui/switch";

interface WorkflowNodeComponentProps extends Omit<NodeProps, "data"> {
    data: WorkflowNode & {
        displayMode?: "detailed" | "compact";
        onDisplayModeChange?: (mode: "detailed" | "compact") => void;
    };
}

const WorkflowNodeComponent: React.FC<WorkflowNodeComponentProps> = ({
    data,
    type,
    selected,
    dragging,
    positionAbsoluteX,
    positionAbsoluteY,
    ...nodeProps
}) => {
    const updateNodeInternals = useUpdateNodeInternals();
    const nodeId = useNodeId();
    const { updateNodeData } = useReactFlow();
    const dispatch = useAppDispatch();

    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId || ""));
    const nodeStatus = useAppSelector((state) => workflowNodesSelectors.nodeStatus(state, nodeId || ""));
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Display mode is stored in React Flow node data (UI-only concern)
    const displayMode = data.displayMode ?? "detailed";
    const isCompact = displayMode === "compact";

    // Update node internals when handles change
    useEffect(() => {
        if (nodeId) {
            updateNodeInternals(nodeId);
        }
    }, [nodeData?.inputs?.length, nodeData?.outputs?.length, nodeId, updateNodeInternals]);

    // Set default active state if not already set
    useEffect(() => {
        if (nodeId && nodeData && nodeData.is_active === null) {
            dispatch(workflowNodesActions.updateField({ id: nodeId, field: "is_active", value: true }));
        }
    }, [nodeId, nodeData, dispatch]);

    // Get node styles from utility
    const baseNodeStyles = getNodeStyles(nodeData?.node_type);

    // Override styles for inactive nodes
    const nodeStyles = {
        ...baseNodeStyles,
        borderColor: nodeData?.is_active ? baseNodeStyles.borderColor : "border-gray-500 dark:border-gray-400",
        backgroundColor: nodeData?.is_active ? baseNodeStyles.backgroundColor : "bg-gray-50 dark:bg-gray-950/20",
        iconColor: "text-blue-500 dark:text-blue-400",
    };

    // Enhanced handle connection validation
    const isValidConnection = useCallback((connection: any) => {
        // Prevent self-connections
        if (connection.source === connection.target) return false;

        // Add custom validation logic based on handle types
        const sourceHandle = connection.sourceHandle;
        const targetHandle = connection.targetHandle;

        // Example: Only allow data outputs to connect to data inputs
        if (sourceHandle?.includes("data") && !targetHandle?.includes("data")) {
            return false;
        }

        return true;
    }, []);

    const handleDisplayModeToggle = useCallback(() => {
        const newMode = displayMode === "detailed" ? "compact" : "detailed";

        // Use React Flow's direct method to update node data
        if (nodeId) {
            updateNodeData(nodeId, { displayMode: newMode });
        }
    }, [displayMode, nodeId, updateNodeData]);

    // Handle opening node editor
    const handleOpenEditor = useCallback(() => {
        setIsEditorOpen(true);
    }, []);

    const handleEditorOpenChange = useCallback((open: boolean) => {
        setIsEditorOpen(open);
    }, []);

    // Handle active state toggle
    const handleActiveToggle = useCallback(
        (checked: boolean) => {
            if (nodeId) {
                dispatch(workflowNodesActions.updateField({ id: nodeId, field: "is_active", value: checked }));
            }
        },
        [nodeId, dispatch]
    );

    // Handle double-click to open editor
    const handleDoubleClick = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            handleOpenEditor();
        },
        [handleOpenEditor]
    );

    const canRemoveInput = (nodeData?.inputs?.length || 0) > 0;
    const NodeIcon = getNodeIcon(nodeData?.node_type);

    // Compact node rendering
    if (isCompact) {
        return (
            <>
                {/* Compact Node Toolbar */}
                <NodeToolbar
                    isVisible={selected}
                    positionAbsoluteX={positionAbsoluteX}
                    positionAbsoluteY={positionAbsoluteY}
                    onSettings={handleOpenEditor}
                    canRemoveInput={canRemoveInput}
                    isCompact={true}
                    displayMode={displayMode}
                    onDisplayModeToggle={handleDisplayModeToggle}
                />

                {/* Compact Node */}
                <div
                    className={`relative w-16 h-16 rounded-full
                                ${nodeStyles.borderColor} 
                                ${nodeStyles.backgroundColor}
                                ${selected ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background" : ""}
                                ${dragging ? "shadow-2xl scale-110" : "shadow-lg hover:shadow-xl"}
                                ${!nodeData?.is_active ? "opacity-60" : ""}
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
                    <NodeIcon className={`w-4 h-4 ${nodeStyles.iconColor}`} />

                    {/* Truncated name on hover */}
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg border border-border whitespace-nowrap max-w-32 truncate">
                            {nodeData?.step_name}
                        </div>
                    </div>

                    {/* Compact handles positioned around the circle */}
                    <WorkflowCompactNodeHandles
                        nodeId={nodeId || ""}
                        inputs={nodeData?.inputs}
                        outputs={nodeData?.outputs}
                        isValidConnection={isValidConnection}
                    />
                </div>
            </>
        );
    }

    // Detailed node rendering
    return (
        <>
            {/* Node Toolbar */}
            <NodeToolbar
                isVisible={selected}
                positionAbsoluteX={positionAbsoluteX}
                positionAbsoluteY={positionAbsoluteY}
                onSettings={handleOpenEditor}
                canRemoveInput={canRemoveInput}
                isCompact={false}
                displayMode={displayMode}
                onDisplayModeToggle={handleDisplayModeToggle}
            />

            {/* Main Node Card */}
            <Card
                className={`
                  min-w-[200px] max-w-[300px] 
                  ${nodeStyles.borderColor}
                  ${nodeStyles.backgroundColor}
                  ${selected ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background" : ""}
                  ${dragging ? "shadow-2xl scale-105" : "shadow-lg hover:shadow-xl"}
                  ${!nodeData?.is_active ? "opacity-70" : ""}
                  transition-all duration-200
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
                            <NodeIcon className={`w-3 h-3 ${nodeStyles.iconColor} flex-shrink-0 align-middle`} />
                            <span className="font-medium text-[10px] tracking-wide truncate text-white align-middle subpixel-antialiased">
                                {nodeData?.step_name}
                            </span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0 relative">
                    {/* Handles Component */}
                    <WorkflowNodeHandles
                        nodeId={nodeId || ""}
                        inputs={nodeData?.inputs}
                        outputs={nodeData?.outputs}
                        isValidConnection={isValidConnection}
                    />

                    {/* Status indicators */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-border">
                        <div className="flex items-center gap-2">
                            {/* Execution Required Icon - Always visible */}
                            {React.createElement(getExecutionRequiredIcon(), {
                                className: `${NODE_ICON_SIZES.small} ${getExecutionRequiredIconStyle(nodeData?.execution_required)}`,
                            })}

                            {/* Status Icon - Always visible */}
                            {React.createElement(getStatusIcon(nodeStatus), {
                                className: `${NODE_ICON_SIZES.small} ${getStatusIconStyle(nodeStatus)} ${
                                    nodeStatus === "executing" ? "animate-spin" : ""
                                }`,
                            })}
                        </div>

                        {/* Active Toggle Switch */}
                        <div className="flex items-center gap-0.5">
                            <span className="text-[8px] text-muted-foreground leading-none">Active</span>
                            <Switch
                                checked={nodeData?.is_active}
                                onCheckedChange={handleActiveToggle}
                                className="h-2.5 w-5 border data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600 [&>*]:h-2 [&>*]:w-2 [&>*]:data-[state=checked]:translate-x-2.5"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Node Editor Modal */}
            {nodeId && <NodeEditorOne nodeId={nodeId} isOpen={isEditorOpen} onOpenChange={handleEditorOpenChange} />}
        </>
    );
};

// Export memoized component for performance
export const WorkflowNodeItem = memo(WorkflowNodeComponent);
