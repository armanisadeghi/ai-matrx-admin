"use client";
import React, { useMemo } from "react";
import WorkflowNodeEditor from "@/features/workflows/react-flow/node-editor/workflow-node-editor/WorkflowNodeEditor";
import UserInputEditor from "@/features/workflows/react-flow/node-editor/user-input-node-editor/UserInputEditor";
import BrokerRelayEditor from "@/features/workflows/react-flow/node-editor/broker-relay-node-editor/BrokerRelayEditor";
import {
    CustomNodeEditor,
    DefaultNodeEditor,
} from "@/features/workflows/react-flow/node-editor/workflow-node-editor/custom-workflow-nodes";
import RecipeNodeEditor from "@/features/workflows/react-flow/node-editor/workflow-node-editor/custom-workflow-nodes/custom-nodes/recipes/RecipeNodeEditor";
import { Edge } from "reactflow";
import {
    DbWorkflow,
    ConvertedWorkflowData,
    UserInputNode,
    BrokerRelayNode,
    FunctionNode,
    DbNodeData,
    DbUserInput,
    DbBrokerRelayData,
    WorkflowNode,
    DbFunctionNode,
} from "@/features/workflows/types";
import { CUSTOM_NODE_REGISTRY } from "@/features/workflows/react-flow/node-editor/workflow-node-editor/custom-workflow-nodes/custom-nodes/custom-node-definitions";
import { EnrichedBroker } from "@/features/workflows/utils/data-flow-manager";

interface NodeEditorManagerProps {
    editingNode: DbNodeData | null;
    onSave: (nodeData: DbNodeData) => void;
    onClose: () => void;
    mode?: "edit" | "view" | "execute";
    nodes: WorkflowNode[];
    edges: Edge[];
    coreWorkflowData: DbWorkflow;
    completeWorkflowData?: ConvertedWorkflowData | null;
    enrichedBrokers: EnrichedBroker[];
}

export const NodeEditorManager: React.FC<NodeEditorManagerProps> = ({
    editingNode,
    onSave,
    onClose,
    mode = "edit",
    nodes,
    edges,
    coreWorkflowData,
    completeWorkflowData,
    enrichedBrokers,
}) => {
    if (!editingNode) return null;

    const isReadOnly = mode === "view";

    if ("type" in editingNode && editingNode.type === "userInput") {
        return (
            <UserInputEditor
                nodeData={editingNode as DbUserInput}
                onSave={onSave}
                onClose={onClose}
                open={!!editingNode}
                readOnly={isReadOnly}
                enrichedBrokers={enrichedBrokers}
            />
        );
    }

    if ("type" in editingNode && editingNode.type === "brokerRelay") {
        return (
            <BrokerRelayEditor
                nodeData={editingNode as DbBrokerRelayData}
                onSave={onSave}
                onClose={onClose}
                open={!!editingNode}
                readOnly={isReadOnly}
                completeWorkflowData={completeWorkflowData}
                enrichedBrokers={enrichedBrokers}
            />
        );
    }

    const baseNode = editingNode as DbFunctionNode;

    // Route to specific custom node editors based on function_id
    if (baseNode.function_id === "2ac5576b-d1ab-45b1-ab48-4e196629fdd8") {
        const nodeDefinition = useMemo(() => CUSTOM_NODE_REGISTRY["recipe-node-definition"], []);
        return (
            <RecipeNodeEditor
                nodeData={baseNode}
                onSave={onSave}
                onClose={onClose}
                open={!!editingNode}
                nodeDefinition={nodeDefinition}
                enrichedBrokers={enrichedBrokers}
            />
        );
    }

    // Test the new system for other specific functions
    if (baseNode.function_id === "b42d270b-0627-453c-a4bb-920eb1da6c51") {
        const nodeDefinition = useMemo(() => CUSTOM_NODE_REGISTRY["text-operations-node-definition"], []);
        return (
            <CustomNodeEditor
                nodeData={baseNode}
                onSave={onSave}
                onClose={onClose}
                open={!!editingNode}
                component={DefaultNodeEditor}
                title="Custom Node Editor (Testing)"
                nodeDefinition={nodeDefinition}
                enrichedBrokers={enrichedBrokers}
            />
        );
    }

    return (
        <WorkflowNodeEditor
            nodeData={editingNode as DbFunctionNode}
            onSave={onSave}
            onClose={onClose}
            open={!!editingNode}
            readOnly={isReadOnly}
            enrichedBrokers={enrichedBrokers}
        />
    );
};

export default NodeEditorManager;
