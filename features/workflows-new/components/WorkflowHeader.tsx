"use client";

import React, { useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import ActionFeedbackButton from "@/components/official/ActionFeedbackButton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
    Save,
    Play,
    Plus,
    Settings,
    Loader2,
    SquareFunction,
    Users,
    Shuffle,
    MoreHorizontal,
    GitBranch,
    Zap,
    Maximize,
    Grid3X3,
    CheckCircle2,
    Layout,
    Undo,
    Redo,
    Minimize2,
    Maximize2,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createNewNode, findGoodNodePosition } from "../utils/nodeTransforms";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { create } from "@/lib/redux/workflow-node/thunks";
import { Node } from "@xyflow/react";
import { FiEdit } from "react-icons/fi";
import { WorkflowEditOverlay } from "@/features/workflows-new/components/WorkflowEditOverlay";
import { workflowSelectors } from "@/lib/redux/workflow/selectors";
import { workflowNodeSelectors } from "@/lib/redux/workflow-node/selectors";

interface WorkflowHeaderProps {
    mode: "edit" | "view" | "execute";
    onSave?: () => Promise<void>;
    onAutoArrange?: () => void;
    onFitView?: () => void;
    onZoomToFit?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onCollapseAll?: () => void;
    onExpandAll?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    workflowId: string;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({ 
    mode, 
    onSave, 
    onAutoArrange, 
    onFitView, 
    onZoomToFit, 
    onUndo,
    onRedo,
    onCollapseAll,
    onExpandAll,
    canUndo = false,
    canRedo = false,
    workflowId 
}) => {
    const dispatch = useAppDispatch();

    // Get data from Redux using selectors
    const workflowData = useAppSelector(workflowSelectors.selectedWorkflow);
    const isLoading = useAppSelector(workflowSelectors.loading);
    const allNodesArray = useAppSelector(workflowNodeSelectors.allNodesArray);
    const nodeCount = allNodesArray.length;
    const userId = useAppSelector(selectUserId);

    const [isAddingNode, setIsAddingNode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [isWorkflowEditOpen, setIsWorkflowEditOpen] = useState(false);

    // Handle save with loading state
    const handleSave = async () => {
        if (onSave && !isSaving) {
            setIsSaving(true);
            try {
                await onSave();
            } catch (error) {
                console.error("Save failed:", error);
                throw error; // Re-throw to prevent success feedback on error
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleAddNode = async (nodeType: string) => {
        if (!userId) {
            console.error("User not authenticated");
            return;
        }

        setIsAddingNode(true);

        try {
            // Convert Redux nodes to React Flow format for position calculation
            const reactFlowNodes: Node[] = allNodesArray.map((node) => ({
                id: node.id,
                position: node.ui_data?.position || { x: 0, y: 0 },
                data: {},
                type: "default",
                measured: {
                    width: node.ui_data?.width || 200,
                    height: node.ui_data?.height || 150,
                },
            }));

            // Find a good position for the new node
            const position = findGoodNodePosition(reactFlowNodes);

            // Create the new node
            const newNodeData = createNewNode(nodeType, position, workflowId, userId);

            // Create the node via Redux thunk
            await dispatch(create(newNodeData));
        } catch (error) {
            console.error("Failed to add node:", error);
        } finally {
            setIsAddingNode(false);
        }
    };

    const handleExecute = async () => {
        setIsExecuting(true);
        try {
            // Simulate async execution
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("Execute workflow");
        } catch (error) {
            console.error("Execute failed:", error);
        } finally {
            setIsExecuting(false);
        }
    };

    const handleAutoArrange = () => {
        if (onAutoArrange) {
            onAutoArrange();
        }
    };

    const handleFitView = () => {
        if (onFitView) {
            onFitView();
        }
    };

    const nodeTypes = [
        { type: "functionNode", label: "Function", icon: <SquareFunction className="h-4 w-4" /> },
        { type: "userInput", label: "User Input", icon: <Users className="h-4 w-4" /> },
        { type: "brokerRelay", label: "Broker Relay", icon: <Shuffle className="h-4 w-4" /> },
        { type: "trigger", label: "Trigger", icon: <Zap className="h-4 w-4" /> },
        { type: "action", label: "Action", icon: <GitBranch className="h-4 w-4" /> },
    ];

    return (
        <div className="border-b border-border bg-background px-3 py-2">
            <div className="flex items-center justify-between">
                {/* Left side - Workflow info */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                            <h1 className="font-medium text-sm truncate text-foreground">{workflowData?.name || "Untitled Workflow"}</h1>
                            <IconButton
                                icon={<FiEdit className="h-3 w-3" />}
                                tooltip="Edit workflow"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6"
                                onClick={() => setIsWorkflowEditOpen(true)}
                            />
                        </div>
                    </div>
                </div>

                {/* Right side - Actions */}
                <div className="flex items-center space-x-1">
                    {/* History Controls */}
                    {mode === "edit" && (
                        <div className="flex items-center space-x-1">
                            <IconButton
                                icon={<Undo className="h-4 w-4" />}
                                tooltip="Undo"
                                variant="ghost"
                                size="sm"
                                onClick={onUndo}
                                disabled={!canUndo}
                                disabledTooltip="Nothing to undo"
                            />
                            <IconButton
                                icon={<Redo className="h-4 w-4" />}
                                tooltip="Redo"
                                variant="ghost"
                                size="sm"
                                onClick={onRedo}
                                disabled={!canRedo}
                                disabledTooltip="Nothing to redo"
                            />
                            <div className="w-px h-4 bg-border mx-1" />
                        </div>
                    )}

                    {/* Node Display Controls */}
                    <div className="flex items-center space-x-1">
                        <ActionFeedbackButton
                            icon={<Minimize2 className="h-4 w-4" />}
                            tooltip="Collapse All Nodes"
                            variant="ghost"
                            size="sm"
                            onClick={onCollapseAll}
                            successTooltip="All nodes collapsed!"
                            feedbackDuration={500}
                            successIcon={<Minimize2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />}
                        />
                        <ActionFeedbackButton
                            icon={<Maximize2 className="h-4 w-4" />}
                            tooltip="Expand All Nodes"
                            variant="ghost"
                            size="sm"
                            onClick={onExpandAll}
                            successTooltip="All nodes expanded!"
                            feedbackDuration={500}
                            successIcon={<Maximize2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />}
                        />
                        <div className="w-px h-4 bg-border mx-1" />
                    </div>

                    {/* View Controls */}
                    <div className="hidden sm:flex items-center space-x-1">
                        <ActionFeedbackButton
                            icon={<Layout className="h-4 w-4" />}
                            tooltip="Fit View"
                            variant="ghost"
                            size="sm"
                            onClick={handleFitView}
                            successTooltip="View fitted!"
                            feedbackDuration={500}
                            successIcon={<Layout className="h-4 w-4 text-blue-500 dark:text-blue-400" />}
                        />
                        <ActionFeedbackButton
                            icon={<Grid3X3 className="h-4 w-4" />}
                            tooltip="Auto Arrange"
                            variant="ghost"
                            size="sm"
                            onClick={handleAutoArrange}
                            successTooltip="Nodes arranged!"
                            feedbackDuration={500}
                            successIcon={<Grid3X3 className="h-4 w-4 text-blue-500 dark:text-blue-400" />}
                        />
                    </div>

                    {mode === "edit" && (
                        <>
                            {/* Add Node Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <IconButton
                                        icon={isAddingNode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        tooltip={isAddingNode ? "Adding node..." : "Add Node"}
                                        variant="ghost"
                                        size="sm"
                                        disabled={isAddingNode}
                                        disabledTooltip="Adding node..."
                                    />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-background border-border">
                                    {nodeTypes.map((nodeType) => (
                                        <DropdownMenuItem
                                            key={nodeType.type}
                                            onClick={() => handleAddNode(nodeType.type)}
                                            className="cursor-pointer hover:bg-accent"
                                            disabled={isAddingNode}
                                        >
                                            <div className="flex items-center space-x-2">
                                                {nodeType.icon}
                                                <span className="text-sm">{nodeType.label}</span>
                                            </div>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}

                    {/* More Actions */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <IconButton icon={<MoreHorizontal className="h-4 w-4" />} tooltip="More Actions" variant="ghost" size="sm" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border-border">
                            <DropdownMenuItem onClick={handleExecute} className="cursor-pointer hover:bg-accent" disabled={isExecuting}>
                                {isExecuting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                                Execute
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleFitView} className="cursor-pointer hover:bg-accent sm:hidden">
                                <Maximize className="h-4 w-4 mr-2" />
                                Fit View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleAutoArrange} className="cursor-pointer hover:bg-accent sm:hidden">
                                <Grid3X3 className="h-4 w-4 mr-2" />
                                Auto Arrange
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="sm:hidden" />
                            <DropdownMenuItem className="cursor-pointer hover:bg-accent">
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Save Button */}
                    {mode === "edit" && onSave && (
                        <ActionFeedbackButton
                            icon={isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            tooltip={isSaving ? "Saving..." : "Save Workflow"}
                            variant="default"
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            disabledTooltip="Saving workflow..."
                            successIcon={<CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />}
                            successTooltip="Workflow saved!"
                            feedbackDuration={2000}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        />
                    )}
                </div>
            </div>

            {/* Workflow Edit Overlay */}
            <WorkflowEditOverlay workflowId={workflowId} isOpen={isWorkflowEditOpen} onClose={() => setIsWorkflowEditOpen(false)} />
        </div>
    );
};
