"use client";

import React, { useCallback } from "react";
import { NodeToolbar as ReactFlowNodeToolbar, Position, useReactFlow, useNodeId, Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Settings, Maximize2, Minimize2, Trash2, Copy, LucideIcon, Plus, Minus } from "lucide-react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { duplicateWorkflowNode, deleteWorkflowNode } from "@/lib/redux/workflow-nodes/thunks";

export interface ToolbarAction {
    icon: LucideIcon;
    onClick: () => void;
    tooltip?: string;
}

export interface BaseNodeToolbarProps {
    nodeId: string;
    isVisible: boolean;
    isCompact: boolean;
    displayMode: "detailed" | "compact";
    positionAbsoluteX?: number;
    positionAbsoluteY?: number;
    onSettings: () => void;
    onDuplicate?: () => void;
    onDelete: () => void;
    onDisplayModeToggle: () => void;
    onAddInput?: () => void;
    onRemoveInput?: () => void;
    canRemoveInput?: boolean;
    additionalActions?: ToolbarAction[];
    // For workflow nodes, use Redux-based duplication/deletion
    useWorkflowActions?: boolean;
}

const BaseNodeToolbar: React.FC<BaseNodeToolbarProps> = ({
    nodeId,
    isVisible,
    isCompact,
    displayMode,
    positionAbsoluteX = 0,
    positionAbsoluteY = 0,
    onSettings,
    onDuplicate,
    onDelete,
    onDisplayModeToggle,
    onAddInput,
    onRemoveInput,
    canRemoveInput = true,
    additionalActions = [],
    useWorkflowActions = false,
}) => {
    const dispatch = useAppDispatch();
    const { deleteElements, addNodes } = useReactFlow();
    const currentNodeId = useNodeId();
    const effectiveNodeId = nodeId || currentNodeId;

    // Handle duplication with Redux + React Flow (for workflow nodes)
    const handleDuplicate = useCallback(async () => {
        if (!effectiveNodeId) return;
        
        if (useWorkflowActions) {
            try {
                // Get the newly created node from the thunk
                const newNode = await dispatch(duplicateWorkflowNode(effectiveNodeId)).unwrap();
                
                const reactFlowNode = {
                    ...newNode.ui_data,
                    id: newNode.id,
                } as Node;
                addNodes([reactFlowNode]);
                
            } catch (error) {
                console.error('Failed to duplicate node:', error);
            }
        } else if (onDuplicate) {
            onDuplicate();
        }
    }, [effectiveNodeId, positionAbsoluteX, positionAbsoluteY, dispatch, addNodes, onDuplicate, useWorkflowActions]);

    // Handle deletion with Redux (for workflow nodes)
    const handleDelete = useCallback(async () => {
        if (!effectiveNodeId) return;
        
        if (useWorkflowActions) {
            try {
                // Delete from Redux first
                await dispatch(deleteWorkflowNode(effectiveNodeId)).unwrap();
                
                // Then remove from React Flow UI
                deleteElements({ nodes: [{ id: effectiveNodeId }] });
            } catch (error) {
                console.error('Failed to delete node:', error);
                // If Redux deletion fails, still remove from UI as fallback
                deleteElements({ nodes: [{ id: effectiveNodeId }] });
            }
        } else {
            onDelete();
        }
    }, [effectiveNodeId, dispatch, deleteElements, onDelete, useWorkflowActions]);

    const handleSettings = useCallback(() => {
        if (onSettings) {
            onSettings();
        } else {
            console.log('Open settings for node:', effectiveNodeId);
        }
    }, [effectiveNodeId, onSettings]);

    return (
        <ReactFlowNodeToolbar
            isVisible={isVisible}
            position={Position.Top}
            offset={isCompact ? 20 : 12}
            className="flex items-center gap-1 bg-background border border-border rounded-lg shadow-lg p-1"
        >
            {/* Core Actions */}
            <Button
                size="sm"
                variant="ghost"
                onClick={handleSettings}
                className="h-6 w-6 p-0"
                title="Node Settings"
            >
                <Settings className="h-3 w-3" />
            </Button>

            <Button
                size="sm"
                variant="ghost"
                onClick={handleDuplicate}
                className="h-6 w-6 p-0"
                title="Duplicate Node"
            >
                <Copy className="h-3 w-3" />
            </Button>

            <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                title="Delete Node"
            >
                <Trash2 className="h-3 w-3" />
            </Button>

            {onDisplayModeToggle && (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDisplayModeToggle}
                    className="h-6 w-6 p-0"
                    title={displayMode === 'compact' ? 'Expand Node' : 'Collapse Node'}
                >
                    {displayMode === 'compact' ? (
                        <Maximize2 className="h-3 w-3" />
                    ) : (
                        <Minimize2 className="h-3 w-3" />
                    )}
                </Button>
            )}

            {/* Input/Output management actions */}
            {(onAddInput || onRemoveInput) && (
                <>
                    <div className="w-px h-4 bg-border mx-1" />
                    
                    {onAddInput && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onAddInput}
                            className="h-6 w-6 p-0"
                            title="Add Input"
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    )}
                    
                    {onRemoveInput && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onRemoveInput}
                            className="h-6 w-6 p-0"
                            disabled={!canRemoveInput}
                            title="Remove Input"
                        >
                            <Minus className="h-3 w-3" />
                        </Button>
                    )}
                </>
            )}

            {/* Additional Actions */}
            {additionalActions.length > 0 && (
                <>
                    <div className="w-px h-4 bg-border mx-1" />
                    {additionalActions.map((action, index) => (
                        <Button 
                            key={index} 
                            size="sm" 
                            variant="ghost" 
                            onClick={action.onClick} 
                            className="h-6 w-6 p-0" 
                            title={action.tooltip}
                        >
                            <action.icon className="h-3 w-3" />
                        </Button>
                    ))}
                </>
            )}
        </ReactFlowNodeToolbar>
    );
};

export default BaseNodeToolbar;
