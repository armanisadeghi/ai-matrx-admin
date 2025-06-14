"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Edge, Node, XYPosition } from "reactflow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, History } from "lucide-react";
import { SocketExecuteButton } from "@/components/socket-io/presets/preset-manager/triggers/SocketExecuteButton";
import DebugOverlay from "@/features/workflows/components/admin/DebugOverlay";
import EdgeManagementOverlay from "@/features/workflows/react-flow/core/EdgeManagementOverlay";
import { BrokerOverlay } from "@/features/workflows/components/common/BrokerOverlay";
import { getRegisteredFunctionSelectOptions } from "@/features/workflows/utils/node-utils";
import { workflowNodeCustomTabs } from "@/features/workflows/components/common/workflow-results-tab-config";
import { SocketResultsOverlay } from "@/components/socket-io/presets/preset-manager/responses/SocketResultsOverlay";
import {
    UserInputNode,
    BrokerRelayNode,
    FunctionNode,
    DbNodeData,
    ConvertedWorkflowData,
    DbFunctionNode,
} from "@/features/workflows/types";
import { RecipeNodeInitializer, CUSTOM_NODE_REGISTRY, NodeDefinitionType } from "@/features/workflows/react-flow/node-editor";
import { EnrichedBroker } from '@/features/workflows/utils/data-flow-manager';

interface WorkflowToolbarProps {
    selectedFunction: string;
    onFunctionSelect: (functionId: string) => void;
    onAddNode: (id: string, type?: string) => void;
    onAddCustomNode: (id: string, type?: string) => Promise<{ nodeData: Omit<DbFunctionNode, "user_id">; position: { x: number; y: number } } | null | void>;
    onFinalizeNode: (configuredNodeData: Omit<DbFunctionNode, "user_id"> | DbFunctionNode, position: XYPosition) => void;
    nodes: Node[];
    edges: Edge[];
    onSave?: () => void;
    onExecute: () => void;
    prepareWorkflowData: () => any;
    onEdgesUpdated?: () => void;
    workflowId?: string;
    mode: "edit" | "view" | "execute";
    workflowName?: string;
    coreWorkflowData?: any;
    viewport?: any;
    // Raw state values for debug overlay
    userInputs: UserInputNode[];
    relays: BrokerRelayNode[];
    functionNodes: FunctionNode[];
    editingNode: DbNodeData | null;
    workflowDataForReactFlow: ConvertedWorkflowData | null;
    enrichedBrokers: EnrichedBroker[];
}

const RECIPE_FUNCTION_ID = "2ac5576b-d1ab-45b1-ab48-4e196629fdd8";

export const WorkflowHeader: React.FC<WorkflowToolbarProps> = ({
    selectedFunction,
    onFunctionSelect,
    onAddNode,
    onAddCustomNode,
    onFinalizeNode,
    nodes,
    edges,
    onSave,
    onExecute,
    prepareWorkflowData,
    onEdgesUpdated,
    workflowId,
    mode,
    workflowName,
    coreWorkflowData,
    viewport,
    userInputs,
    relays,
    functionNodes,
    editingNode,
    workflowDataForReactFlow,
    enrichedBrokers,
}) => {
    const [isBrokerOverlayOpen, setIsBrokerOverlayOpen] = useState(false);
    const [isResultsOverlayOpen, setIsResultsOverlayOpen] = useState(false);
    const functionOptions = getRegisteredFunctionSelectOptions();
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const [showRecipeInitializer, setShowRecipeInitializer] = useState(false);
    const [pendingRecipeNode, setPendingRecipeNode] = useState<{
        nodeData: Omit<DbFunctionNode, "user_id">;
        position: XYPosition;
        nodeDefinition: NodeDefinitionType;
    } | null>(null);
    const nodeDefinition = useMemo(() => CUSTOM_NODE_REGISTRY["recipe-node-definition"], []);

    const hasWorkflowNodes = nodes.some(
        (node) =>
            node.data && (!node.data.type || (node.data.type !== "userInput" && node.data.type !== "brokerRelay")) && node.data.function_id
    );

    // Get workflow data for broker overlay
    const workflowData = prepareWorkflowData();

    const handleFunctionSelect = async (functionId: string) => {
        if (!functionId) {
            onFunctionSelect("");
            return;
        }

        // Check if this is a recipe node
        if (functionId === RECIPE_FUNCTION_ID) {
            // Use the custom node handler for recipe nodes
            console.log("Adding recipe node");
            const result = await onAddCustomNode(functionId, "registeredFunction");
            console.log("Result:", result);

            if (result) {
                console.log("Setting pending recipe node");
                // Add the node definition from the registry
                setPendingRecipeNode({
                    ...result,
                    nodeDefinition,
                });
                console.log("Pending recipe node:", pendingRecipeNode);
                setShowRecipeInitializer(true);
            }
        } else {
            // Use normal node addition for all other nodes
            console.log("Adding normal node");
            onAddNode(functionId, "registeredFunction");
        }

        onFunctionSelect("");
    };

    const handleRecipeConfirm = async (configuredNodeData: Omit<DbFunctionNode, "user_id">) => {
        if (pendingRecipeNode) {
            try {
                await onFinalizeNode(configuredNodeData, pendingRecipeNode.position);
                setShowRecipeInitializer(false);
                setPendingRecipeNode(null);
            } catch (error) {
                console.error("Error finalizing recipe node:", error);
                // You might want to show an error message to the user here
            }
        }
    };

    const handleRecipeCancel = () => {
        setShowRecipeInitializer(false);
        setPendingRecipeNode(null);
    };

    return (
        <div className="border-b bg-card p-1">
            <div className="flex items-center justify-between">
                {/* Left side - Back button and title */}
                <div className="flex items-center gap-4">
                    <Link href="/workflows">
                        <Button variant="outline" size="sm" className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            All Workflows
                        </Button>
                    </Link>
                    <h1 className="text-xl font-semibold text-foreground">
                        {workflowName || "Workflow Builder"} {mode === "view" && "(Read Only)"}
                    </h1>
                </div>

                {/* Right side - Controls */}
                <div className="flex items-center gap-3">
                    {onSave && (
                        <Button onClick={onSave} variant="outline" size="sm">
                            Save
                        </Button>
                    )}

                    {hasWorkflowNodes && (
                        <SocketExecuteButton
                            presetName="flow_nodes_to_start_workflow"
                            sourceData={prepareWorkflowData()}
                            buttonText="Execute"
                            onExecuteComplete={(taskId) => {
                                setCurrentTaskId(taskId);
                                setIsResultsOverlayOpen(true);
                            }}
                        />
                    )}

                    <Button
                        onClick={() => setIsResultsOverlayOpen(true)}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        title="View all socket task results and responses"
                    >
                        <History className="w-4 h-4" />
                        Results
                    </Button>

                    <Button
                        onClick={() => setIsBrokerOverlayOpen(true)}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        title="View all broker IDs in this workflow"
                    >
                        <Database className="w-4 h-4" />
                        Brokers
                    </Button>

                    {mode === "edit" && workflowId && onEdgesUpdated && (
                        <EdgeManagementOverlay workflowId={workflowId} onEdgesUpdated={onEdgesUpdated} />
                    )}
                    {mode === "edit" && (
                        <Select value={selectedFunction} onValueChange={handleFunctionSelect}>
                            <SelectTrigger className="w-64 bg-inherit border border-gray-200 dark:border-gray-700">
                                <SelectValue placeholder="Select a function to add..." />
                            </SelectTrigger>
                            <SelectContent>
                                {functionOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <DebugOverlay
                        nodes={nodes}
                        edges={edges}
                        coreWorkflowData={coreWorkflowData}
                        viewport={viewport}
                        userInputs={userInputs}
                        relays={relays}
                        functionNodes={functionNodes}
                        editingNode={editingNode}
                        workflowDataForReactFlow={workflowDataForReactFlow}
                        workflowId={workflowId}
                    />
                </div>
            </div>

            {/* Results Overlay */}
            <SocketResultsOverlay
                taskId={currentTaskId}
                isOpen={isResultsOverlayOpen}
                onClose={() => {
                    setIsResultsOverlayOpen(false);
                }}
                customTabs={workflowNodeCustomTabs}
                overlayTitle="Workflow Step Results"
                overlayDescription={`Results for: ${workflowName || "Unnamed Step"}`}
            />

            {/* Broker Overlay */}
            <BrokerOverlay workflowData={workflowData} isOpen={isBrokerOverlayOpen} onClose={() => setIsBrokerOverlayOpen(false)} />

            {pendingRecipeNode && (
                <RecipeNodeInitializer
                    nodeData={pendingRecipeNode.nodeData as DbFunctionNode}
                    nodeDefinition={pendingRecipeNode.nodeDefinition}
                    onConfirm={handleRecipeConfirm}
                    onCancel={handleRecipeCancel}
                    open={showRecipeInitializer}
                    enrichedBrokers={enrichedBrokers}
                />
            )}
        </div>
    );
};
