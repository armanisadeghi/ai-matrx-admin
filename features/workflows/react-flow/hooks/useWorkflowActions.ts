import { useCallback } from "react";
import { Node, Edge, XYPosition } from "reactflow";
import { BrokerRelayNodeData, DbFunctionNode, DbNodeData, PythonDataType, UserInputNodeData, WorkflowNode } from "@/features/workflows/types";
import { getNormalizedRegisteredFunctionNode } from "@/features/workflows/utils/node-utils";
import { extractExecutionNodes, extractUserInputs, extractRelays } from "@/features/workflows/service/workflowTransformers";
import {
    saveWorkflowNode,
    saveWorkflowUserInput,
    saveWorkflowRelay,
    deleteWorkflowNode,
    deleteWorkflowUserInput,
    deleteWorkflowRelay,
    removeNodeFromWorkflow,
    removeUserInputFromWorkflow,
    removeRelayFromWorkflow,
    duplicateUserInputWithConversion,
    duplicateRelayWithConversion,
    duplicateWorkflowNodeWithConversion,
    saveWorkflowNodeWithConversion,
    updateNode,
} from "@/features/workflows/service";
import { removeEdgesForNode } from "@/features/workflows/utils/edgeCleanup";
import { v4 as uuidv4 } from "uuid";

interface UseWorkflowActionsProps {
    nodes: Node[];
    edges: Edge[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
    setEditingNode: React.Dispatch<React.SetStateAction<DbNodeData | null>>;
    workflowId?: string;
    userId: string;
    setDeleteDialogNode?: React.Dispatch<React.SetStateAction<Node | null>>;
    onWorkflowReload?: () => Promise<void>;
    getViewport?: () => { x: number; y: number; zoom: number };
    handleRefresh?: () => void;
}

const RECIPE_FUNCTION_ID = "2ac5576b-d1ab-45b1-ab48-4e196629fdd8";

export const useWorkflowActions = ({
    nodes,
    edges,
    setNodes,
    setEdges,
    setEditingNode,
    workflowId,
    userId,
    setDeleteDialogNode,
    onWorkflowReload,
    getViewport,
    handleRefresh,
}: UseWorkflowActionsProps) => {
    const handleAddNode = useCallback(
        async (id: string, type?: string) => {
            if (!workflowId) {
                return;
            }

            try {
                if (type === "registeredFunction") {
                    const baseNode = getNormalizedRegisteredFunctionNode(id, workflowId);
                    const position = getCenterPosition();
                    const newId = uuidv4();

                    const nodeStructure: Node = {
                        id: newId,
                        type: "functionNode",
                        position,
                        data: {
                            id: newId,
                            ...baseNode,
                        },
                    };

                    const newNodeData = {
                        id: newId,
                        function_id: baseNode.function_id,
                        function_type: baseNode.function_type,
                        step_name: baseNode.step_name,
                        node_type: "functionNode",
                        execution_required: baseNode.execution_required,
                        additional_dependencies: baseNode.additional_dependencies,
                        arg_mapping: baseNode.arg_mapping,
                        return_broker_overrides: baseNode.return_broker_overrides,
                        arg_overrides: baseNode.arg_overrides,
                        status: baseNode.status || "pending",
                        metadata: baseNode.metadata || {},
                        ui_node_data: nodeStructure,
                    };

                    const savedNode = await saveWorkflowNode(workflowId, userId, newNodeData, false);
                    const { metadata, ...savedNodeWithoutMetadata } = savedNode;

                    const finalNode: Node = {
                        id: savedNode.id,
                        type: "functionNode",
                        position,
                        data: savedNodeWithoutMetadata,
                    };
                    setNodes((nds) => nds.concat(finalNode));
                } else if (type === "userInput") {
                    const position = getCenterPosition();
                    const newId = uuidv4();

                    const inputNodeStructure: Node = {
                        id: newId,
                        type: "userInput",
                        position,
                        data: {},
                    };

                    const newNodeData = {
                        id: newId,
                        broker_id: "",
                        label: "User Input",
                        data_type: "str" as PythonDataType,
                        default_value: null,
                        is_required: true,
                        field_component_id: null,
                        workflow_id: workflowId,
                        user_id: userId,
                        metadata: {},
                        ui_node_data: inputNodeStructure,
                    };

                    const savedInput = await saveWorkflowUserInput(workflowId, userId, newNodeData, false);

                    const newUserInputData: UserInputNodeData = {
                        id: savedInput.id,
                        type: "userInput",
                        broker_id: savedInput.broker_id,
                        default_value: savedInput.default_value || "",
                        label: savedInput.label || "User Input",
                        data_type: savedInput.data_type as PythonDataType,
                        workflow_id: workflowId,
                        is_required: true,
                        field_component_id: null,
                        metadata: savedInput.metadata || {},
                    };

                    const newNode: Node = {
                        id: savedInput.id,
                        type: "userInput",
                        position,
                        data: newUserInputData,
                    };
                    setNodes((nds) => nds.concat(newNode));
                } else if (type === "brokerRelay") {
                    const position = getCenterPosition();
                    const newId = uuidv4();

                    const relayNodeStructure: Node = {
                        id: newId,
                        type: "brokerRelay",
                        position,
                        data: {},
                    };

                    const newNodeData = {
                        id: newId,
                        label: "Broker Relay",
                        source_broker_id: "",
                        target_broker_ids: [],
                        workflow_id: workflowId,
                        user_id: userId,
                        metadata: {},
                        ui_node_data: relayNodeStructure,
                    };

                    const savedRelay = await saveWorkflowRelay(workflowId, userId, newNodeData, false);

                    const newBrokerRelayData: BrokerRelayNodeData = {
                        id: savedRelay.id,
                        type: "brokerRelay",
                        source_broker_id: savedRelay.source_broker_id,
                        target_broker_ids: savedRelay.target_broker_ids,
                        label: savedRelay.label || "Broker Relay",
                        metadata: savedRelay.metadata || {},
                        workflow_id: workflowId,
                    };

                    const newNode: Node = {
                        id: savedRelay.id,
                        type: "brokerRelay",
                        position,
                        data: newBrokerRelayData,
                    };
                    setNodes((nds) => nds.concat(newNode));
                }
            } catch (error) {
                // Error adding node to database
            }
        },
        [setNodes, workflowId, userId]
    );

    const handlePrepareRecipeNode = useCallback(
        (id: string): { nodeData: Omit<DbFunctionNode, "user_id">; position: { x: number; y: number } } | null => {
            if (!workflowId || id !== RECIPE_FUNCTION_ID) {
                return null;
            }

            try {
                const baseNode = getNormalizedRegisteredFunctionNode(id, workflowId);
                const position = getCenterPosition();
                const newId = uuidv4();

                const nodeData = {
                    id: newId,
                    function_id: baseNode.function_id,
                    workflow_id: workflowId,
                    function_type: baseNode.function_type,
                    step_name: baseNode.step_name,
                    node_type: "functionNode",
                    execution_required: baseNode.execution_required,
                    additional_dependencies: baseNode.additional_dependencies,
                    arg_mapping: baseNode.arg_mapping,
                    return_broker_overrides: baseNode.return_broker_overrides,
                    arg_overrides: baseNode.arg_overrides,
                    status: baseNode.status || "pending",
                    metadata: baseNode.metadata || {},
                };

                return { nodeData, position };
            } catch (error) {
                console.error("Error preparing recipe node:", error);
                return null;
            }
        },
        [workflowId]
    );

    // Method 2: Finalize recipe node (saves to database and adds to canvas)
    const handleFinalizeRecipeNode = useCallback(
        async (configuredNodeData: DbFunctionNode, position: XYPosition) => {
            if (!workflowId) {
                return;
            }

            try {
                const nodeStructure: Node = {
                    id: configuredNodeData.id,
                    type: "functionNode",
                    position,
                    data: configuredNodeData,
                };

                // Save to database
                const savedNode = await saveWorkflowNode(
                    workflowId,
                    userId,
                    {
                        ...configuredNodeData,
                        ui_node_data: nodeStructure,
                    },
                    false
                );

                // Remove metadata for the UI
                const { metadata, ...savedNodeWithoutMetadata } = savedNode;

                // Create final node for the canvas
                const finalNode: Node = {
                    id: savedNode.id,
                    type: "functionNode",
                    position,
                    data: savedNodeWithoutMetadata,
                };

                // Add to canvas
                setNodes((nds) => nds.concat(finalNode));

                return finalNode;
            } catch (error) {
                console.error("Error finalizing recipe node:", error);
                throw error;
            }
        },
        [workflowId, userId, setNodes]
    );

    const handleAddCustomNode = useCallback(
        async (id: string, type?: string) => {
            // Check if this is a recipe node
            if (type === "registeredFunction" && id === RECIPE_FUNCTION_ID) {
                // For recipe nodes, prepare but don't add - let the parent handle the overlay
                const preparedNode = handlePrepareRecipeNode(id);
                if (preparedNode) {
                    // Return the prepared node data so the parent can show the overlay
                    return preparedNode;
                }
                return null;
            }

            // For all other nodes, use the existing logic
            return handleAddNode(id, type);
        },
        [handleAddNode, handlePrepareRecipeNode]
    );

    const handleDeleteNode = useCallback(
        (nodeId: string) => {
            const nodeToDelete = nodes.find((node) => node.id === nodeId);
            if (nodeToDelete && setDeleteDialogNode) {
                setDeleteDialogNode(nodeToDelete);
            } else {
                setNodes((nds) => nds.filter((node) => node.id !== nodeId));
                setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
            }
        },
        [nodes, setNodes, setEdges, setDeleteDialogNode]
    );

    const handleNodeSave = useCallback(
        async (updatedNode: DbNodeData) => {
            // Update the node in the local state
            let updatedReactFlowNode: Node | null = null;
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === updatedNode.id) {
                        const updated = { ...node, data: updatedNode };
                        updatedReactFlowNode = updated;
                        return updated;
                    }
                    return node;
                })
            );

            if (workflowId && updatedReactFlowNode) {
                try {
                    // Use the unified updateNode function
                    await updateNode(updatedReactFlowNode);
                    // No need to reload - local state is already updated
                } catch (error) {}
            }
        },
        [setNodes, workflowId]
    );

    const prepareWorkflowData = useCallback(() => {
        const workflowNodes = extractExecutionNodes(nodes);
        const userInputs = extractUserInputs(nodes);
        const relays = extractRelays(nodes);

        return {
            nodes: workflowNodes,
            user_inputs: userInputs,
            relays: relays,
        };
    }, [nodes]);

    const handleRemoveFromWorkflow = useCallback(
        async (nodeId: string) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) return;

            try {
                await removeEdgesForNode(nodeId, edges);

                const data = node.data;
                if (data.type === "userInput") {
                    await removeUserInputFromWorkflow(nodeId);
                } else if (data.type === "brokerRelay") {
                    await removeRelayFromWorkflow(nodeId);
                } else {
                    await removeNodeFromWorkflow(nodeId);
                }

                setNodes((nds) => nds.filter((n) => n.id !== nodeId));
                setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));

                // No need to reload - local state is already updated
            } catch (error) {
                // Failed to remove node from workflow
            }
        },
        [nodes, edges, setNodes, setEdges]
    );

    const handlePermanentDelete = useCallback(
        async (nodeId: string) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) return;

            try {
                await removeEdgesForNode(nodeId, edges);

                const data = node.data;
                if (data.type === "userInput") {
                    await deleteWorkflowUserInput(nodeId);
                } else if (data.type === "brokerRelay") {
                    await deleteWorkflowRelay(nodeId);
                } else {
                    await deleteWorkflowNode(nodeId);
                }

                // Remove from UI
                setNodes((nds) => nds.filter((n) => n.id !== nodeId));
                setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));

                // No need to reload - local state is already updated
            } catch (error) {
                // Failed to delete node permanently
            }
        },
        [nodes, edges, setNodes, setEdges]
    );

    // Simple center positioning
    const getCenterPosition = useCallback(() => {
        const viewport = getViewport?.() || { x: 0, y: 0, zoom: 1 };
        const centerX = -viewport.x / viewport.zoom + window.innerWidth / (2 * viewport.zoom);
        const centerY = -viewport.y / viewport.zoom + window.innerHeight / (2 * viewport.zoom);

        return {
            x: centerX - 100,
            y: centerY - 50,
        };
    }, [getViewport]);

    const handleDuplicateNode = useCallback(
        async (nodeId: string) => {
            if (!workflowId) {
                return;
            }

            const originalNode = nodes.find((n) => n.id === nodeId);
            if (!originalNode) {
                return;
            }

            try {
                const data = originalNode.data;
                let newNode: Node;

                // Position duplicate in center
                const newPosition = getCenterPosition();

                if (data.type === "userInput") {
                    newNode = await duplicateUserInputWithConversion(nodeId);
                } else if (data.type === "brokerRelay") {
                    newNode = await duplicateRelayWithConversion(nodeId);
                } else {
                    newNode = await duplicateWorkflowNodeWithConversion(nodeId);
                }

                // Update position (locally only, no need to save to database immediately)
                newNode = { ...newNode, position: newPosition };

                // Add to UI
                setNodes((nds) => nds.concat(newNode));

                // No need to reload - local state is already updated
            } catch (error) {
                // Failed to duplicate node
            }
        },
        [nodes, workflowId, setNodes, getCenterPosition]
    );

    const exposeWorkflowMethods = useCallback(() => {
        window.workflowSystemRef = {
            deleteNode: handleDeleteNode,
            editNode: (nodeData: any) => setEditingNode(nodeData),
            duplicateNode: handleDuplicateNode,
            getUserInputs: () => {
                return nodes
                    .map((node) => node.data as UserInputNodeData)
                    .filter((data) => data.type === "userInput")
                    .map((userInputData) => ({
                        broker_id: userInputData.broker_id,
                        default_value: userInputData.default_value,
                    }));
            },
        };
    }, [nodes, handleDeleteNode, setEditingNode, handleDuplicateNode]);

    return {
        handleAddNode,
        handleDeleteNode,
        handleNodeSave,
        handleRemoveFromWorkflow,
        handlePermanentDelete,
        handleDuplicateNode,
        prepareWorkflowData,
        exposeWorkflowMethods,
        handleAddCustomNode,
        handleFinalizeRecipeNode,
    };
};
