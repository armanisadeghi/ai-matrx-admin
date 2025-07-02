import { useCallback, useMemo, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { useSelector } from "react-redux";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { RootState } from "@/lib/redux/store";
import { workflowActions } from "@/lib/redux/workflow/slice";
import { workflowNodeActions } from "@/lib/redux/workflow-node/slice";
import { workflowNodeSelectors } from "@/lib/redux/workflow-node/selectors";
import { workflowSelectors } from "@/lib/redux/workflow/selectors";
import { saveWorkflowFromState } from "@/lib/redux/workflow/thunks";
import { brokerActions, BrokerMapEntry } from "@/lib/redux/brokerSlice";
import { nodeToReactFlow } from "../utils/nodeTransforms";

export const useWorkflowSync = (workflowId: string) => {
    const dispatch = useAppDispatch();

    // Get Redux state using selectors
    const workflowData = useAppSelector((state) => workflowSelectors.workflowById(state, workflowId));
    const workflowNodes = useAppSelector((state) => workflowNodeSelectors.nodesByWorkflowId(state, workflowId));
    const workflowSources = useAppSelector((state) => workflowSelectors.sourcesById(state, workflowId));
    const workflowUserInputSources = useAppSelector((state) => workflowSelectors.userInputSources(state));
    const isLoading = useAppSelector(workflowSelectors.loading);

    // Get current theme
    const currentTheme = useSelector((state: RootState) => state.theme.mode);

    // Ensure broker mappings exist for workflow sources on load
    useEffect(() => {
        if (workflowSources?.length) {
            const brokerMappings: BrokerMapEntry[] = workflowUserInputSources.map((sourceConfig) => sourceConfig.sourceDetails);

            // Use the broker slice's built-in action that handles duplicates
            dispatch(brokerActions.addOrUpdateRegisterEntries(brokerMappings));
        }
    }, [workflowSources, dispatch]);

    // Convert Redux data to React Flow format ONCE
    const initialNodes = useMemo(() => {
        const regularNodes = workflowNodes.map(nodeToReactFlow);

        // Generate source input nodes from workflow sources
        const sourceNodes = (workflowSources || []).map((source, index) => {
            const mapKey = `${source.sourceType}:${source.brokerId}`;

            // Determine the correct node type based on source type
            const nodeType = source.sourceType === "user_input" ? "userInput" : "userDataSource";

            return {
                id: mapKey,
                type: nodeType,
                position: { x: -300, y: index * 120 }, // Position to the left of regular nodes with more spacing
                data: {
                    ...source,
                    isActive: true, // Default to active
                    showToolbar: true, // Show toolbar like regular nodes
                    displayMode: source.metadata?.displayMode || "detailed", // Use saved displayMode or default to detailed
                    workflowId, // Add workflowId to the data
                },
                draggable: true, // Allow dragging for positioning
                selectable: true, // Allow selection
                deletable: false, // Prevent deletion since they're auto-generated
            };
        });

        return [...regularNodes, ...sourceNodes];
    }, [workflowNodes, workflowSources]);

    // Generate edges from business data connections ONCE
    const initialEdges = useMemo(() => {
        const edges: Edge[] = [];

        workflowNodes.forEach((node) => {
            if (node.inputs) {
                node.inputs.forEach((input, inputIndex) => {
                    if (input.source_broker_id) {
                        // First check if there's a source input node with this broker ID
                        const sourceInputNode = workflowSources?.find((source) => source.brokerId === input.source_broker_id);

                        if (sourceInputNode) {
                            const sourceMapKey = `${sourceInputNode.sourceType}:${sourceInputNode.brokerId}`;
                            // Connect from source input node to this node
                            edges.push({
                                id: `${sourceMapKey}-${node.id}-${inputIndex}`,
                                source: sourceMapKey,
                                target: node.id,
                                sourceHandle: "broker-id",
                                targetHandle: input.arg_name, // Use the actual arg_name as the target handle
                                type: "smoothstep",
                                animated: false,
                                style: {
                                    strokeWidth: 2,
                                    stroke: currentTheme === "dark" ? "#3b82f6" : "#2563eb", // Blue color for source connections
                                },
                            });
                        } else {
                            // Find the source node that provides this broker (within the same workflow)
                            const sourceNode = workflowNodes.find((n) =>
                                n.outputs?.some((output) => output.broker_id === input.source_broker_id)
                            );

                            if (sourceNode) {
                                const outputIndex =
                                    sourceNode.outputs?.findIndex((output) => output.broker_id === input.source_broker_id) ?? 0;

                                edges.push({
                                    id: `${sourceNode.id}-${node.id}-${inputIndex}`,
                                    source: sourceNode.id,
                                    target: node.id,
                                    sourceHandle: sourceNode.outputs?.[outputIndex]?.name || `output-${outputIndex}`,
                                    targetHandle: input.arg_name, // Use the actual arg_name as the target handle
                                    type: "smoothstep",
                                    animated: false,
                                    style: {
                                        strokeWidth: 2,
                                        stroke: currentTheme === "dark" ? "#6b7280" : "#374151",
                                    },
                                });
                            }
                        }
                    }
                });
            }
        });

        return edges;
    }, [workflowNodes, workflowSources, currentTheme]);

    // Simple save function using Redux properly
    const saveWorkflow = useCallback(
        async (reactFlowNodes: Node[], reactFlowEdges: Edge[], reactFlowViewport: any) => {
            try {
                // 1. Ensure the workflow is selected for viewport update
                dispatch(workflowActions.selectWorkflow(workflowId));

                // 2. Update UI data in Redux using actions (exclude selected - it's runtime only)
                reactFlowNodes.forEach((node) => {
                    dispatch(
                        workflowNodeActions.updateNodeUiData({
                            nodeId: node.id,
                            uiData: {
                                position: node.position,
                                width: node.measured?.width,
                                height: node.measured?.height,
                            },
                        })
                    );
                });

                // 3. Update viewport in Redux for the selected workflow
                dispatch(workflowActions.updateViewport(reactFlowViewport));

                // 4. Use the new thunk that gets all data directly from state
                await dispatch(saveWorkflowFromState(workflowId)).unwrap();

                console.log("Workflow saved successfully!");
            } catch (error) {
                console.error("Failed to save workflow:", error);
                console.error("Error details:", JSON.stringify(error, null, 2));
                if (error instanceof Error) {
                    console.error("Error message:", error.message);
                    console.error("Error stack:", error.stack);
                }
                throw error;
            }
        },
        [dispatch, workflowId]
    );

    return {
        initialNodes,
        initialEdges,
        initialViewport: workflowData?.viewport || { x: 0, y: 0, zoom: 1 },
        saveWorkflow,
        isLoading,
    };
};
