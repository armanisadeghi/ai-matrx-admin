import { useCallback, useMemo, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { workflowsSelectors } from "@/lib/redux/workflow/selectors";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { saveWorkflowFromReactFlow } from "@/lib/redux/workflow/thunks";
import { brokerActions, BrokerMapEntry } from "@/lib/redux/brokerSlice";
import { BrokerSourceConfig } from "@/lib/redux/workflow/types";
import { useWorkflowEdges } from "./useWorkflowEdges";


const SOURCE_TYPE_MAP = {
    user_input: "userInput",
    user_data: "userDataSource", // Fixed: should be "user_data" not "user_data_source"
} as const;


export const useWorkflowSync = (workflowId: string) => {
    const dispatch = useAppDispatch();

    // Get Redux state using correct selectors
    const workflowData = useAppSelector((state) => workflowsSelectors.workflowById(state, workflowId));
    const workflowNodes = useAppSelector((state) => workflowNodesSelectors.xyFlowNodesByWorkflowId(state, workflowId)); // Returns Node[] directly - no transformations needed!
    const workflowSources = useAppSelector((state) => workflowsSelectors.workflowSources(state, workflowId));
    const isLoading = useAppSelector(workflowsSelectors.isLoading);

    // Use dedicated edge generation hook
    const { edges: initialEdges } = useWorkflowEdges({ workflowId });

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
        const functionNodes = (workflowNodes || []).map((node) => ({
            ...node,
            type: "functionNode",
            data: {
                ...node.data,
                displayMode: node.data?.displayMode || "detailed",
            },
        }));

        // Generate source input nodes from workflow sources (these are auto-generated, not stored)
        const sourceNodes = (workflowSources || []).map((source: BrokerSourceConfig, index) => {
            return {
                id: `sourceNode:${source.sourceType}:${source.brokerId}`,
                type: SOURCE_TYPE_MAP[source.sourceType],
                position: { x: -150, y: index * 120 }, // Position to the left of regular nodes with more spacing
                data: {
                    ...source,
                    isActive: true, // Default to active
                    displayMode: source.metadata?.displayMode || "compact", // Use saved displayMode or default to detailed
                    workflowId, // Add workflowId to the data
                },
            };
        });

        return [...functionNodes, ...sourceNodes];
    }, [workflowNodes, workflowSources, workflowId]);



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
