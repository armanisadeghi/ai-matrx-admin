"use client";

import React, { useState } from "react";
import { useReactFlow } from "@xyflow/react";
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
    MoreHorizontal,
    Maximize,
    Grid3X3,
    CheckCircle2,
    Layout,
    Undo,
    Redo,
    Minimize2,
    Maximize2,
    Database,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { FiEdit } from "react-icons/fi";
import { WorkflowEditOverlay } from "@/features/workflows-xyflow/common/WorkflowEditOverlay";
import { workflowsSelectors } from "@/lib/redux/workflow/selectors";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { NodesMenu } from "@/features/workflows-xyflow/common/NodesMenu";
import { BsFillNodePlusFill } from "react-icons/bs";
import { WorkflowNode } from "@/lib/redux/workflow-nodes/types";

interface WorkflowHeaderProps {
    mode: "edit" | "view" | "execute";
    onSave?: () => Promise<void>;
    onAutoArrange?: () => void;
    workflowId: string;
    onOpenFieldDisplay?: () => void;
    onOpenAdminOverlay?: () => void;
    onRecipeNodeCreated?: (nodeData: WorkflowNode) => void;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
    mode,
    onSave,
    onAutoArrange,
    workflowId,
    onOpenFieldDisplay,
    onOpenAdminOverlay,
    onRecipeNodeCreated,
}) => {
    const dispatch = useAppDispatch();
    const reactFlowInstance = useReactFlow();

    // Get data from Redux using correct selectors
    const workflowData = useAppSelector((state) => workflowsSelectors.workflowById(state, workflowId));
    const isLoading = useAppSelector(workflowsSelectors.isLoading);
    const allNodesArray = useAppSelector((state) => workflowNodesSelectors.nodesByWorkflowId(state, workflowId));
    const nodeCount = allNodesArray.length;
    const userId = useAppSelector(selectUserId);

    const [isSaving, setIsSaving] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [isWorkflowEditOpen, setIsWorkflowEditOpen] = useState(false);
    const [isAddNodeDropdownOpen, setIsAddNodeDropdownOpen] = useState(false);
    const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

    // Proper undo/redo state management
    const [history, setHistory] = useState<{ nodes: any[]; edges: any[] }[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Save current state to history
    const saveToHistory = () => {
        const currentNodes = reactFlowInstance.getNodes();
        const currentEdges = reactFlowInstance.getEdges();
        const newState = { nodes: currentNodes, edges: currentEdges };

        // Remove any future history if we're not at the end
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newState);

        // Limit history size to prevent memory issues
        const maxHistorySize = 50;
        if (newHistory.length > maxHistorySize) {
            newHistory.shift();
        } else {
            setHistoryIndex((prev) => prev + 1);
        }

        setHistory(newHistory);
    };

    // Initialize history when nodes are loaded
    React.useEffect(() => {
        if (allNodesArray.length > 0 && history.length === 0) {
            const currentNodes = reactFlowInstance.getNodes();
            const currentEdges = reactFlowInstance.getEdges();
            if (currentNodes.length > 0) {
                setHistory([{ nodes: currentNodes, edges: currentEdges }]);
                setHistoryIndex(0);
            }
        }
    }, [allNodesArray.length, history.length, reactFlowInstance]);

    // Undo functionality
    const handleUndo = () => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            reactFlowInstance.setNodes(prevState.nodes);
            reactFlowInstance.setEdges(prevState.edges);
            setHistoryIndex((prev) => prev - 1);
        }
    };

    // Redo functionality
    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            reactFlowInstance.setNodes(nextState.nodes);
            reactFlowInstance.setEdges(nextState.edges);
            setHistoryIndex((prev) => prev + 1);
        }
    };

    // Check if undo/redo is available
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    // Handle hover delays for node menu
    const handleMouseEnterNodeMenu = () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            setHoverTimeout(null);
        }
        setIsAddNodeDropdownOpen(true);
    };

    const handleMouseLeaveNodeMenu = () => {
        const timeout = setTimeout(() => {
            setIsAddNodeDropdownOpen(false);
        }, 500); // 500ms delay before closing
        setHoverTimeout(timeout);
    };

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }
        };
    }, [hoverTimeout]);

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

    // Use direct ReactFlow access for viewport operations
    const handleFitView = () => {
        reactFlowInstance.fitView({ duration: 800, padding: 0.2, maxZoom: 1.5 });
    };

    // Implement collapse/expand directly in header using ReactFlow
    const handleCollapseAll = () => {
        const currentNodes = reactFlowInstance.getNodes();
        const updatedNodes = currentNodes.map((node) => ({
            ...node,
            data: {
                ...node.data,
                displayMode: "compact",
            },
        }));
        reactFlowInstance.setNodes(updatedNodes);
    };

    const handleExpandAll = () => {
        const currentNodes = reactFlowInstance.getNodes();
        const updatedNodes = currentNodes.map((node) => ({
            ...node,
            data: {
                ...node.data,
                displayMode: "detailed",
            },
        }));
        reactFlowInstance.setNodes(updatedNodes);
    };

    // Node creation handled by NodesMenu component with shared hook logic

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
                    {mode === "edit" && (
                        <>
                            {/* Add Node Dropdown with Single Hover Area */}
                            <div className="relative" onMouseEnter={handleMouseEnterNodeMenu} onMouseLeave={handleMouseLeaveNodeMenu}>
                                <DropdownMenu open={isAddNodeDropdownOpen}>
                                    <DropdownMenuTrigger asChild>
                                        <div className="cursor-pointer inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent/50 transition-colors">
                                            <BsFillNodePlusFill className="h-5 w-5 text-foreground hover:text-primary transition-colors" />
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 bg-background border-border">
                                        <NodesMenu
                                            workflowId={workflowId}
                                            onNodeCreated={(node) => {
                                                console.log("Node created from header:", node);
                                                // Optionally save to history or perform other actions
                                                saveToHistory();
                                                setIsAddNodeDropdownOpen(false);
                                            }}
                                            onRecipeNodeCreated={onRecipeNodeCreated}
                                        />
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </>
                    )}

                    {/* History Controls */}
                    {mode === "edit" && (
                        <div className="flex items-center space-x-1">
                            <IconButton
                                icon={<Undo className="h-4 w-4" />}
                                tooltip="Undo"
                                variant="ghost"
                                size="sm"
                                onClick={handleUndo}
                                disabled={!canUndo}
                                disabledTooltip="Nothing to undo"
                            />
                            <IconButton
                                icon={<Redo className="h-4 w-4" />}
                                tooltip="Redo"
                                variant="ghost"
                                size="sm"
                                onClick={handleRedo}
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
                            onClick={handleCollapseAll}
                            successTooltip="All nodes collapsed!"
                            feedbackDuration={500}
                            successIcon={<Minimize2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />}
                        />
                        <ActionFeedbackButton
                            icon={<Maximize2 className="h-4 w-4" />}
                            tooltip="Expand All Nodes"
                            variant="ghost"
                            size="sm"
                            onClick={handleExpandAll}
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
                        {onOpenFieldDisplay && (
                            <IconButton
                                icon={<Database className="h-4 w-4" />}
                                tooltip="Field Display"
                                variant="ghost"
                                size="sm"
                                onClick={onOpenFieldDisplay}
                            />
                        )}
                        {onOpenAdminOverlay && (
                            <IconButton
                                icon={<Settings className="h-4 w-4" />}
                                tooltip="Admin Panel"
                                variant="ghost"
                                size="sm"
                                onClick={onOpenAdminOverlay}
                            />
                        )}
                    </div>

                    {/* More Actions */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <IconButton icon={<MoreHorizontal className="h-4 w-4" />} tooltip="More Actions" variant="ghost" size="sm" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border-border">
                            <DropdownMenuItem onClick={handleExecute} className="cursor-pointer hover:bg-accent" disabled={isExecuting}>
                                <div className="flex items-center">
                                    {isExecuting ? (
                                        <LoadingSpinner variant="minimal" size="sm" showMessage={false} className="w-4 h-4 mr-2" />
                                    ) : (
                                        <Play className="h-4 w-4 mr-2" />
                                    )}
                                    Execute
                                </div>
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
                            <DropdownMenuItem onClick={onOpenAdminOverlay} className="cursor-pointer hover:bg-accent">
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Save Button */}
                    {mode === "edit" && onSave && (
                        <ActionFeedbackButton
                            icon={
                                isSaving ? (
                                    <LoadingSpinner variant="minimal" size="sm" showMessage={false} className="w-4 h-4" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )
                            }
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
