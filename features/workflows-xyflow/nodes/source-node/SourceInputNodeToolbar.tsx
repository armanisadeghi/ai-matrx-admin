"use client";
import React, { useCallback } from "react";
import { NodeToolbar as ReactFlowNodeToolbar, Position, useNodeId, useReactFlow } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Settings, Maximize2, Minimize2, Trash2 } from "lucide-react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { workflowActions } from "@/lib/redux/workflow/slice";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { useToast } from "@/components/ui/use-toast";

interface SourceInputNodeToolbarProps {
    isVisible: boolean;
    positionAbsoluteX?: number;
    positionAbsoluteY?: number;
    onSettings?: () => void;
    isCompact?: boolean;
    displayMode?: "detailed" | "compact";
    onDisplayModeToggle?: () => void;
    workflowId?: string;
    currentMapping?: {
        brokerId: string;
        mappedItemId: string;
        source: string;
        sourceId: string;
    };
}

export const SourceInputNodeToolbar: React.FC<SourceInputNodeToolbarProps> = ({
    isVisible,
    positionAbsoluteX = 0,
    positionAbsoluteY = 0,
    onSettings,
    isCompact = false,
    displayMode = "detailed",
    onDisplayModeToggle,
    workflowId,
    currentMapping,
}) => {
    const nodeId = useNodeId();
    const dispatch = useAppDispatch();
    const { deleteElements } = useReactFlow();
    const { toast } = useToast();

    const handleSettings = useCallback(() => {
        if (onSettings) {
            onSettings();
        } else {
            console.log("Open settings for source input node:", nodeId);
            // TODO: Implement default settings modal
        }
    }, [nodeId, onSettings]);

    const handleDelete = useCallback(async () => {
        if (!nodeId || !currentMapping) return;

        try {
            // Remove from workflow sources - use "user_input" as the sourceType since this is a user input source
            if (workflowId) {
                dispatch(workflowActions.selectWorkflow(workflowId));
                dispatch(
                    workflowActions.removeSource({
                        sourceType: "user_input",
                        brokerId: currentMapping.brokerId,
                    })
                );
            }

            // Remove from broker registry - use the correct property names
            dispatch(
                brokerActions.removeRegisterEntry({
                    source: currentMapping.source,
                    mappedItemId: currentMapping.mappedItemId,
                })
            );

            // Remove from React Flow UI
            deleteElements({ nodes: [{ id: nodeId }] });

            toast({
                title: "Source Input Deleted",
                description: "Source input node deleted successfully.",
            });
        } catch (error) {
            console.error("Failed to delete source input node:", error);
            toast({
                title: "Delete Failed",
                description: "Failed to delete source input node. Please try again.",
                variant: "destructive",
            });
            // If Redux deletion fails, still remove from UI as fallback
            deleteElements({ nodes: [{ id: nodeId }] });
        }
    }, [nodeId, currentMapping, workflowId, dispatch, deleteElements, toast]);

    return (
        <ReactFlowNodeToolbar
            isVisible={isVisible}
            position={Position.Top}
            offset={isCompact ? 20 : 12}
            className="flex items-center gap-1 bg-background border border-border rounded-lg shadow-lg p-1"
        >
            <Button size="sm" variant="ghost" onClick={handleSettings} className="h-6 w-6 p-0" title="Source Input Settings">
                <Settings className="h-3 w-3" />
            </Button>

            <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                title="Delete Source Input"
                disabled={!currentMapping}
            >
                <Trash2 className="h-3 w-3" />
            </Button>

            {onDisplayModeToggle && (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDisplayModeToggle}
                    className="h-6 w-6 p-0"
                    title={displayMode === "compact" ? "Expand Node" : "Collapse Node"}
                >
                    {displayMode === "compact" ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                </Button>
            )}
        </ReactFlowNodeToolbar>
    );
};
