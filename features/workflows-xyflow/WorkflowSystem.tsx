"use client";

import React, { useCallback, useState } from "react";
import "@xyflow/react/dist/style.css";
import { useReactFlow, Viewport, Node, Edge } from "@xyflow/react";
import { WorkflowCanvas } from "./core/WorkflowCanvas";
import { WorkflowHeader } from "./core/WorkflowHeader";
import { useWorkflowSync } from "./hooks/useWorkflowSync";
import FieldDisplaySheet from "./nodes/source-node/sheets/FieldDisplaySheet";
import { WorkflowAdminOverlay } from "./admin/WorkflowAdminOverlay";
import WorkflowLoading from "./common/workflow-loading";
import RecipeNodeInitializer from "./custom-nodes/recipes/RecipeNodeInitializer";
import { WorkflowNode } from "@/lib/redux/workflow-nodes/types";
import { useAppDispatch } from "@/lib/redux/hooks";
import { saveWorkflowNode } from "@/lib/redux/workflow-nodes/thunks";

interface WorkflowSystemProps {
    workflowId: string;
    mode?: "edit" | "view" | "execute";
}

export const WorkflowSystem: React.FC<WorkflowSystemProps> = ({ workflowId, mode = "edit" }) => {
    const reactFlowInstance = useReactFlow();
    const dispatch = useAppDispatch();

    // Get initial data and save function
    const { initialNodes, initialEdges, initialViewport, saveWorkflow, isLoading } = useWorkflowSync(workflowId);

    // UI state management at top level
    const [isFieldDisplaySheetOpen, setIsFieldDisplaySheetOpen] = useState(false);
    const [isAdminOverlayOpen, setIsAdminOverlayOpen] = useState(false);
    
    // Recipe node initializer state (shared between access panel and header)
    const [showRecipeInitializer, setShowRecipeInitializer] = useState(false);
    const [pendingRecipeNode, setPendingRecipeNode] = useState<{
        nodeData: WorkflowNode;
    } | null>(null);

    // Save handler - gets current state directly from ReactFlow
    const handleSave = useCallback(async () => {
        if (saveWorkflow) {
            const currentNodes = reactFlowInstance.getNodes();
            const currentEdges = reactFlowInstance.getEdges();
            const currentViewport = reactFlowInstance.getViewport();
            await saveWorkflow(currentNodes, currentEdges, currentViewport);
        }
    }, [saveWorkflow, reactFlowInstance]);

    // Auto arrange handler - implements custom layout logic at top level
    const handleAutoArrange = useCallback(() => {
        const currentNodes = reactFlowInstance.getNodes();

        // Separate source input nodes from regular workflow nodes
        const sourceNodes = currentNodes.filter(node => node.type === 'userInput' || node.type === 'userDataSource');
        const regularNodes = currentNodes.filter(node => node.type !== 'userInput' && node.type !== 'userDataSource');

        const arrangedNodes = [
            // Position source nodes on the left in compact mode (like initial render)
            ...sourceNodes.map((node, index) => ({
                ...node,
                position: {
                    x: -300, // Same as initial positioning
                    y: index * 120, // Same spacing as initial positioning
                },
                data: {
                    ...node.data,
                    displayMode: "compact", // Ensure they're compact
                },
            })),
            // Arrange regular nodes in a grid to the right
            ...regularNodes.map((node, index) => {
                const cols = Math.ceil(Math.sqrt(regularNodes.length));
                const row = Math.floor(index / cols);
                const col = index % cols;

                return {
                    ...node,
                    position: {
                        x: col * 350 + 100, // Start at x: 100 to leave space for source nodes
                        y: row * 350 + 100,
                    },
                };
            }),
        ];

        reactFlowInstance.setNodes(arrangedNodes);

        setTimeout(() => {
            reactFlowInstance.fitView({ duration: 800, padding: 0.2, maxZoom: 1.5 });
        }, 100);
    }, [reactFlowInstance]);

    const handleOpenFieldDisplay = useCallback(() => {
        setIsFieldDisplaySheetOpen(true);
    }, []);

    const handleOpenAdminOverlay = useCallback(() => {
        setIsAdminOverlayOpen(true);
    }, []);

    const handleRecipeNodeCreated = useCallback((nodeData: WorkflowNode) => {
        setPendingRecipeNode({ nodeData });
        setShowRecipeInitializer(true);
    }, []);

    const handleRecipeConfirm = useCallback(async () => {
        if (pendingRecipeNode) {
            try {
                dispatch(saveWorkflowNode({ id: pendingRecipeNode.nodeData.id }));
                setShowRecipeInitializer(false);
                setPendingRecipeNode(null);
            } catch (error) {
                console.error("Error finalizing recipe node:", error);
            }
        }
    }, [pendingRecipeNode, dispatch]);

    const handleRecipeCancel = useCallback(() => {
        setShowRecipeInitializer(false);
        setPendingRecipeNode(null);
    }, []);

    if (isLoading) {
        return (
            <WorkflowLoading 
                title="Loading Workflow System"
                subtitle="Initializing functions, data brokers, and workflow components..."
                step1="Functions"
                step2="Data Brokers"
                step3="Ready"
                fullscreen={false}
            />
        );
    }

    return (
        <div className="h-screen w-full flex flex-col bg-background">
            <WorkflowHeader
                workflowId={workflowId}
                mode={mode}
                onSave={mode === "edit" ? handleSave : undefined}
                onAutoArrange={handleAutoArrange}
                onOpenFieldDisplay={handleOpenFieldDisplay}
                onOpenAdminOverlay={handleOpenAdminOverlay}
                onRecipeNodeCreated={handleRecipeNodeCreated}
            />

            <WorkflowCanvas
                workflowId={workflowId}
                initialNodes={initialNodes}
                initialEdges={initialEdges}
                initialViewport={initialViewport}
                mode={mode}
                isFieldDisplaySheetOpen={isFieldDisplaySheetOpen}
                onOpenFieldDisplaySheet={setIsFieldDisplaySheetOpen}
                isAdminOverlayOpen={isAdminOverlayOpen}
                onOpenAdminOverlay={setIsAdminOverlayOpen}
                onRecipeNodeCreated={handleRecipeNodeCreated}
            />

            {/* Field Display Sheet */}
            <FieldDisplaySheet
                isOpen={isFieldDisplaySheetOpen}
                onOpenChange={setIsFieldDisplaySheetOpen}
                workflowId={workflowId}
                onSave={handleSave}
            />

            {/* Admin Overlay */}
            <WorkflowAdminOverlay
                isOpen={isAdminOverlayOpen}
                onClose={() => setIsAdminOverlayOpen(false)}
                workflowId={workflowId}
            />

            {/* Shared Recipe Node Initializer */}
            {pendingRecipeNode && (
                <RecipeNodeInitializer
                    nodeId={pendingRecipeNode.nodeData.id}
                    onConfirm={handleRecipeConfirm}
                    onCancel={handleRecipeCancel}
                    open={showRecipeInitializer}
                />
            )}
        </div>
    );
};

export default WorkflowSystem;
