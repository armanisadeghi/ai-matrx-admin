import { useCallback, useMemo, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { useSelector } from "react-redux";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { RootState } from "@/lib/redux/store";
import { workflowsSelectors } from "@/lib/redux/workflow/selectors";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { saveWorkflowFromReactFlow } from "@/lib/redux/workflow/thunks";
import { brokerActions, BrokerMapEntry } from "@/lib/redux/brokerSlice";
import { BrokerSourceConfig } from "@/lib/redux/workflow/types";


const SOURCE_TYPE_MAP = {
    user_input: "userInput",
    user_data_source: "userDataSource",
} as const;


export const useWorkflowSync = (workflowId: string) => {
    const dispatch = useAppDispatch();

    // Get Redux state using correct selectors
    const workflowData = useAppSelector((state) => workflowsSelectors.workflowById(state, workflowId));
    const workflowNodes = useAppSelector((state) => workflowNodesSelectors.xyFlowNodesByWorkflowId(state)(workflowId)); // Returns Node[] directly - no transformations needed!
    const workflowNodesData = useAppSelector((state) => workflowNodesSelectors.nodesByWorkflowId(state)(workflowId)); // Returns WorkflowNode[] for business data (inputs/outputs)
    const workflowSources = useAppSelector((state) => workflowsSelectors.workflowSources(state, workflowId));
    const isLoading = useAppSelector(workflowsSelectors.isLoading);

    // Get current theme
    const currentTheme = useSelector((state: RootState) => state.theme.mode);

    // Ensure broker mappings exist for workflow sources on load
    useEffect(() => {
        if (workflowSources?.length) {
            // Extract user input sources from workflow sources
            const userInputSources = workflowSources.filter(
                (source) => source.sourceType === "user_input"
            ) as BrokerSourceConfig<"user_input">[];
            const brokerMappings: BrokerMapEntry[] = userInputSources.map((sourceConfig) => sourceConfig.sourceDetails);

            // Use the broker slice's built-in action that handles duplicates
            if (brokerMappings.length > 0) {
                dispatch(brokerActions.addOrUpdateRegisterEntries(brokerMappings));
            }
        }
    }, [workflowSources, dispatch]);

    // Convert Redux data to React Flow format ONCE
    const initialNodes = useMemo(() => {
        // Regular workflow nodes - ensure it's an array and add displayMode if needed
        // xyFlowNodesByWorkflowId returns Node[] directly from stored ui_data
        const regularNodes = (workflowNodes || []).map((node) => ({
            ...node,
            data: {
                ...node.data,
                displayMode: node.data?.displayMode || "detailed",
            },
        }));

        // Generate source input nodes from workflow sources (these are auto-generated, not stored)
        const sourceNodes = (workflowSources || []).map((source: BrokerSourceConfig, index) => {
            return {
                id: `${source.sourceType}:${source.brokerId}`,
                type: SOURCE_TYPE_MAP[source.sourceType],
                position: { x: -300, y: index * 120 }, // Position to the left of regular nodes with more spacing
                data: {
                    ...source,
                    isActive: true, // Default to active
                    displayMode: source.metadata?.displayMode || "detailed", // Use saved displayMode or default to detailed
                    workflowId, // Add workflowId to the data
                },
            };
        });

        return [...regularNodes, ...sourceNodes];
    }, [workflowNodes, workflowSources, workflowId]);

    // Generate edges from business data connections ONCE
    const initialEdges = useMemo(() => {
        const edges: Edge[] = [];

        // Use workflowNodesData for business logic (inputs/outputs)
        workflowNodesData.forEach((node) => {
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
                            const sourceNode = workflowNodesData.find((n) =>
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
    }, [workflowNodesData, workflowSources, currentTheme]);

    // UPDATED: Save function using new saveWorkflowFromReactFlow thunk
    const saveWorkflow = useCallback(
        async (reactFlowNodes: Node[], reactFlowEdges: Edge[], reactFlowViewport: any) => {
            try {
                // Use the new thunk that handles all state updates and saves everything
                await dispatch(
                    saveWorkflowFromReactFlow({
                        workflowId,
                        reactFlowNodes,
                        reactFlowEdges,
                        reactFlowViewport,
                    })
                ).unwrap();

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
