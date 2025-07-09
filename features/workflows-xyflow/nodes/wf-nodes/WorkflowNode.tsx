"use client";

import React, { memo, useCallback } from "react";
import { NodeProps, useNodeId } from "@xyflow/react";
import { WorkflowNode } from "@/lib/redux/workflow-nodes/types";
import { BaseNode, NodeConfig } from "../base/BaseNode";
import { NodeEditorOne } from "@/features/workflows-xyflow/node-editor/FlexibleNodeEditor";
import { useAppSelector } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";

interface WorkflowNodeComponentProps extends Omit<NodeProps, "data"> {
    data: WorkflowNode & {
        displayMode?: "detailed" | "compact";
        onDisplayModeChange?: (mode: "detailed" | "compact") => void;
    };
}

// Settings component wrapper for NodeEditorOne
const WorkflowNodeSettings: React.FC<{
    nodeId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}> = ({ nodeId, isOpen, onOpenChange }) => {
    return <NodeEditorOne nodeId={nodeId} isOpen={isOpen} onOpenChange={onOpenChange} />;
};

const WorkflowNodeComponent: React.FC<WorkflowNodeComponentProps> = (props) => {
    const nodeId = useNodeId();
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId || ""));

    // Enhanced handle connection validation - specific to workflow nodes
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

    // Configuration for workflow nodes
    const workflowConfig: NodeConfig = {
        // Core workflow node settings
        nodeType: "workflow",
        displayText: nodeData?.step_name || "Workflow Node",
        
        // Enhanced connection validation
        isValidConnection,
        
        // Settings modal - use NodeEditorOne
        SettingsComponent: WorkflowNodeSettings,
        
        // Use workflow-specific Redux actions
        useWorkflowActions: true,
        
        // Allow compact mode
        allowCompactMode: true,
        
        // Double-click opens settings (handled automatically by BaseNode)
    };

    return <BaseNode config={workflowConfig} {...props} />;
};

// Export memoized component for performance
export const WorkflowNodeItem = memo(WorkflowNodeComponent);
