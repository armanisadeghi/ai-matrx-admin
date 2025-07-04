"use client";

import React, { useCallback, useState } from "react";
import "@xyflow/react/dist/style.css";
import { useReactFlow, Viewport, Node, Edge } from "@xyflow/react";
import { WorkflowCanvas } from "./core/WorkflowCanvas";
import { WorkflowHeader } from "./core/WorkflowHeader";
import { useWorkflowSync } from "./hooks/useWorkflowSync";
import FieldDisplaySheet from "./nodes/source-node/sheets/FieldDisplaySheet";
import { WorkflowAdminOverlay } from "./admin/WorkflowAdminOverlay";

interface WorkflowSystemProps {
    workflowId: string;
    mode?: "edit" | "view" | "execute";
}

export const WorkflowSystem: React.FC<WorkflowSystemProps> = ({ workflowId, mode = "edit" }) => {
    const reactFlowInstance = useReactFlow();

    // Get initial data and save function
    const { initialNodes, initialEdges, initialViewport, saveWorkflow, isLoading } = useWorkflowSync(workflowId);

    // UI state management at top level
    const [isFieldDisplaySheetOpen, setIsFieldDisplaySheetOpen] = useState(false);
    const [isAdminOverlayOpen, setIsAdminOverlayOpen] = useState(false);

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

        // Fit view after arranging
        setTimeout(() => {
            reactFlowInstance.fitView({ duration: 800, padding: 0.2, maxZoom: 1.5 });
        }, 100);
    }, [reactFlowInstance]);

    // UI overlay handlers
    const handleOpenFieldDisplay = useCallback(() => {
        setIsFieldDisplaySheetOpen(true);
    }, []);

    const handleOpenAdminOverlay = useCallback(() => {
        setIsAdminOverlayOpen(true);
    }, []);

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <div className="text-lg text-foreground">(system) Loading workflow...</div>
            </div>
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
        </div>
    );
};

export default WorkflowSystem;
