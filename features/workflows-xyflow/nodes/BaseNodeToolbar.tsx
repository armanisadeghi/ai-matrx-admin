"use client";

import React, { useCallback } from "react";
import { NodeToolbar as ReactFlowNodeToolbar, Position, useReactFlow } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Settings, Maximize2, Minimize2, Trash2, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export interface BaseNodeToolbarProps {
    nodeId: string;
    isVisible: boolean;
    isCompact: boolean;
    displayMode: "detailed" | "compact";
    onDisplayModeToggle: () => void;
    onSettings?: () => void;
    customActions?: React.ReactNode;
    
    // Feature flags
    showSettings?: boolean;
    showDelete?: boolean;
    showDuplicate?: boolean;
    showDisplayModeToggle?: boolean;
    
    // Custom handlers
    onDelete?: (nodeId: string) => void;
    onDuplicate?: (nodeId: string) => void;
    
    // Positioning
    position?: Position;
    offset?: number;
}

export const BaseNodeToolbar: React.FC<BaseNodeToolbarProps> = ({
    nodeId,
    isVisible,
    isCompact,
    displayMode,
    onDisplayModeToggle,
    onSettings,
    customActions,
    showSettings = true,
    showDelete = true,
    showDuplicate = false,
    showDisplayModeToggle = true,
    onDelete,
    onDuplicate,
    position = Position.Top,
    offset,
}) => {
    const { deleteElements, getNode, addNodes } = useReactFlow();
    const { toast } = useToast();

    const handleSettings = useCallback(() => {
        if (onSettings) {
            onSettings();
        } else {
            console.log("Open settings for node:", nodeId);
        }
    }, [nodeId, onSettings]);

    const handleDelete = useCallback(async () => {
        if (!nodeId) return;

        try {
            if (onDelete) {
                await onDelete(nodeId);
            } else {
                // Default delete behavior
                deleteElements({ nodes: [{ id: nodeId }] });
                toast({
                    title: "Node Deleted",
                    description: "Node deleted successfully.",
                });
            }
        } catch (error) {
            console.error("Failed to delete node:", error);
            toast({
                title: "Delete Failed",
                description: "Failed to delete node. Please try again.",
                variant: "destructive",
            });
        }
    }, [nodeId, onDelete, deleteElements, toast]);

    const handleDuplicate = useCallback(async () => {
        if (!nodeId) return;

        try {
            if (onDuplicate) {
                await onDuplicate(nodeId);
            } else {
                // Default duplicate behavior
                const node = getNode(nodeId);
                if (node) {
                    const newNode = {
                        ...node,
                        id: `${nodeId}-copy-${Date.now()}`,
                        position: {
                            x: node.position.x + 50,
                            y: node.position.y + 50,
                        },
                        selected: false,
                    };
                    addNodes([newNode]);
                    toast({
                        title: "Node Duplicated",
                        description: "Node duplicated successfully.",
                    });
                }
            }
        } catch (error) {
            console.error("Failed to duplicate node:", error);
            toast({
                title: "Duplicate Failed",
                description: "Failed to duplicate node. Please try again.",
                variant: "destructive",
            });
        }
    }, [nodeId, onDuplicate, getNode, addNodes, toast]);

    return (
        <ReactFlowNodeToolbar
            isVisible={isVisible}
            position={position}
            offset={offset ?? (isCompact ? 20 : 12)}
            className="flex items-center gap-1 bg-background border border-border rounded-lg shadow-lg p-1"
        >
            {/* Settings */}
            {showSettings && (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSettings}
                    className="h-6 w-6 p-0"
                    title="Settings"
                >
                    <Settings className="h-3 w-3" />
                </Button>
            )}

            {/* Delete */}
            {showDelete && (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDelete}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    title="Delete"
                >
                    <Trash2 className="h-3 w-3" />
                </Button>
            )}

            {/* Duplicate */}
            {showDuplicate && (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDuplicate}
                    className="h-6 w-6 p-0"
                    title="Duplicate"
                >
                    <Copy className="h-3 w-3" />
                </Button>
            )}

            {/* Display Mode Toggle */}
            {showDisplayModeToggle && (
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

            {/* Custom Actions */}
            {customActions}
        </ReactFlowNodeToolbar>
    );
}; 