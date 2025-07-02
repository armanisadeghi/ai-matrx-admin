"use client";

import React, { useCallback, useEffect, useRef } from "react";
import "@xyflow/react/dist/style.css";
import { useAppDispatch } from "@/lib/redux/hooks";
import { WorkflowCanvas } from "./core/WorkflowCanvas";
import { WorkflowHeader } from "./core/WorkflowHeader";
import { useWorkflowSync } from "./hooks/useWorkflowSync";

interface WorkflowSystemProps {
    workflowId: string;
    mode?: "edit" | "view" | "execute";
}

export const WorkflowSystem: React.FC<WorkflowSystemProps> = ({ workflowId, mode = "edit" }) => {
    const canvasRef = useRef<{
        triggerSave: () => Promise<void>;
        fitView: () => void;
        autoArrange: () => void;
        zoomIn: () => void;
        zoomOut: () => void;
        resetView: () => void;
        getSelectedNodes: () => any[];
        getSelectedEdges: () => any[];
        selectAll: () => void;
        clearSelection: () => void;
        undo: () => void;
        redo: () => void;
        canUndo: () => boolean;
        canRedo: () => boolean;
        collapseAll: () => void;
        expandAll: () => void;
        openFieldDisplay: () => void;
        openAdminOverlay: () => void;
    }>(null);

    // Get initial data and save function
    const { initialNodes, initialEdges, initialViewport, saveWorkflow, isLoading } = useWorkflowSync(workflowId);

    // NO LOADING HERE - the page already loads the workflow with fetchOneWithNodes

    // Header save handler - triggers save from canvas
    const handleHeaderSave = useCallback(async () => {
        if (canvasRef.current) {
            await canvasRef.current.triggerSave();
        }
    }, []);

    // Fit view handler
    const handleFitView = useCallback(() => {
        if (canvasRef.current) {
            canvasRef.current.fitView();
        }
    }, []);

    // Auto arrange handler
    const handleAutoArrange = useCallback(() => {
        if (canvasRef.current) {
            canvasRef.current.autoArrange();
        }
    }, []);

    // History handlers
    const handleUndo = useCallback(() => {
        if (canvasRef.current) {
            canvasRef.current.undo();
        }
    }, []);

    const handleRedo = useCallback(() => {
        if (canvasRef.current) {
            canvasRef.current.redo();
        }
    }, []);

    // Node display handlers
    const handleCollapseAll = useCallback(() => {
        if (canvasRef.current) {
            canvasRef.current.collapseAll();
        }
    }, []);

    const handleExpandAll = useCallback(() => {
        if (canvasRef.current) {
            canvasRef.current.expandAll();
        }
    }, []);

    // Field display handler
    const handleOpenFieldDisplay = useCallback(() => {
        if (canvasRef.current) {
            canvasRef.current.openFieldDisplay();
        }
    }, []);

    // Admin overlay handler
    const handleOpenAdminOverlay = useCallback(() => {
        if (canvasRef.current) {
            canvasRef.current.openAdminOverlay();
        }
    }, []);

    // History state getters
    const canUndo = canvasRef.current?.canUndo() || false;
    const canRedo = canvasRef.current?.canRedo() || false;

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
                onSave={mode === "edit" ? handleHeaderSave : undefined}
                onFitView={handleFitView}
                onAutoArrange={handleAutoArrange}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onCollapseAll={handleCollapseAll}
                onExpandAll={handleExpandAll}
                canUndo={canUndo}
                canRedo={canRedo}
                onOpenFieldDisplay={handleOpenFieldDisplay}
                onOpenAdminOverlay={handleOpenAdminOverlay}
            />

            <WorkflowCanvas
                ref={canvasRef}
                workflowId={workflowId}
                initialNodes={initialNodes}
                initialEdges={initialEdges}
                initialViewport={initialViewport}
                mode={mode}
                onSave={saveWorkflow}
            />
        </div>
    );
};

export default WorkflowSystem;
