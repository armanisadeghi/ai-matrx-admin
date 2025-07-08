import { useMemo } from "react";
import { Edge } from "@xyflow/react";
import { useSelector } from "react-redux";
import { useAppSelector } from "@/lib/redux/hooks";
import { RootState } from "@/lib/redux/store";
import { workflowsSelectors } from "@/lib/redux/workflow/selectors";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { BrokerSourceConfig } from "@/lib/redux/workflow/types";

interface UseWorkflowEdgesProps {
    workflowId: string;
}

export const useWorkflowEdges = ({ workflowId }: UseWorkflowEdgesProps) => {
    // Get necessary data
    const workflowNodesData = useAppSelector((state) => workflowNodesSelectors.nodesByWorkflowId(state, workflowId));
    const workflowSources = useAppSelector((state) => workflowsSelectors.workflowSources(state, workflowId));
    const currentTheme = useSelector((state: RootState) => state.theme.mode);

    // Generate all edges from business data connections
    const edges = useMemo(() => {
        const edges: Edge[] = [];

        // SCENARIO 1: Direct broker connections (input.source_broker_id matches output.broker_id)
        workflowNodesData.forEach((node) => {
            if (node.inputs) {
                node.inputs.forEach((input, inputIndex) => {
                    if (input.source_broker_id) {
                        // First check if there's a source input node with this broker ID
                        const sourceInputNode = workflowSources?.find((source) => source.brokerId === input.source_broker_id);

                        if (sourceInputNode) {
                            const sourceMapKey = `sourceNode:${sourceInputNode.sourceType}:${sourceInputNode.brokerId}`;
                            // Connect from source input node to this node
                            // Handle different input types: broker vs argument
                            const targetHandle = input.type === "broker" 
                                ? `broker-${input.source_broker_id}`
                                : `argument-${input.arg_name}`;
                            
                            edges.push({
                                id: `${sourceMapKey}-${node.id}-${inputIndex}`,
                                source: sourceMapKey,
                                target: node.id,
                                sourceHandle: sourceInputNode.brokerId,
                                targetHandle: targetHandle,
                                type: "smoothstep",
                                animated: false,
                                style: {
                                    strokeWidth: 2,
                                    stroke: currentTheme === "dark" ? "#3b82f6" : "#2563eb", // Blue color for source connections
                                },
                                data: {
                                    connectionType: "source_input",
                                    sourceData: sourceInputNode,
                                    targetInput: input,
                                    targetNode: {
                                        id: node.id,
                                        step_name: node.step_name,
                                        node_type: node.node_type,
                                    },
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

                                // Handle different input types: broker vs argument
                                const targetHandle = input.type === "broker" 
                                    ? `broker-${input.source_broker_id}`
                                    : `argument-${input.arg_name}`;
                                
                                const sourceOutput = sourceNode.outputs?.[outputIndex];
                                
                                edges.push({
                                    id: `${sourceNode.id}-${node.id}-${inputIndex}`,
                                    source: sourceNode.id,
                                    target: node.id,
                                    sourceHandle: sourceOutput?.broker_id || `output-${outputIndex}`,
                                    targetHandle: targetHandle,
                                    type: "smoothstep",
                                    animated: false,
                                    style: {
                                        strokeWidth: 2,
                                        stroke: currentTheme === "dark" ? "#6b7280" : "#374151",
                                    },
                                    data: {
                                        connectionType: "direct_broker",
                                        sourceNode: {
                                            id: sourceNode.id,
                                            step_name: sourceNode.step_name,
                                            node_type: sourceNode.node_type,
                                        },
                                        sourceOutput: sourceOutput,
                                        targetInput: input,
                                        targetNode: {
                                            id: node.id,
                                            step_name: node.step_name,
                                            node_type: node.node_type,
                                        },
                                    },
                                });
                            }
                        }
                    }
                });
            }
        });

        // SCENARIO 2: Relay connections (output.relays contains broker IDs that match input.source_broker_id)
        workflowNodesData.forEach((sourceNode) => {
            if (sourceNode.outputs) {
                sourceNode.outputs.forEach((output, outputIndex) => {
                    if (output.relays && output.relays.length > 0) {
                        output.relays.forEach((relay) => {
                            if (relay.id) {
                                // Find all nodes that have inputs with source_broker_id matching this relay's id
                                workflowNodesData.forEach((targetNode) => {
                                    if (targetNode.inputs) {
                                        targetNode.inputs.forEach((input, inputIndex) => {
                                            if (input.source_broker_id === relay.id) {
                                                // Create edge from source node's output to target node's input
                                                // Handle different input types: broker vs argument
                                                const targetHandle = input.type === "broker" 
                                                    ? `broker-${input.source_broker_id}`
                                                    : `argument-${input.arg_name}`;
                                                
                                                edges.push({
                                                    id: `${sourceNode.id}-${targetNode.id}-relay-${outputIndex}-${inputIndex}`,
                                                    source: sourceNode.id,
                                                    target: targetNode.id,
                                                    sourceHandle: output.broker_id || `output-${outputIndex}`,
                                                    targetHandle: targetHandle,
                                                    type: "smoothstep",
                                                    animated: false,
                                                    style: {
                                                        strokeWidth: 2,
                                                        stroke: currentTheme === "dark" ? "#6b7280" : "#374151",
                                                    },
                                                    data: {
                                                        connectionType: "relay",
                                                        sourceNode: {
                                                            id: sourceNode.id,
                                                            step_name: sourceNode.step_name,
                                                            node_type: sourceNode.node_type,
                                                        },
                                                        sourceOutput: output,
                                                        relay: relay,
                                                        targetInput: input,
                                                        targetNode: {
                                                            id: targetNode.id,
                                                            step_name: targetNode.step_name,
                                                            node_type: targetNode.node_type,
                                                        },
                                                    },
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });

        // SCENARIO 3: Source relay connections (source.relays contains broker IDs that match input.source_broker_id)
        if (workflowSources) {
            workflowSources.forEach((source) => {
                if (source.relays && source.relays.length > 0) {
                    source.relays.forEach((relay) => {
                        if (relay.id) {
                            // Find all nodes that have inputs with source_broker_id matching this relay's id
                            workflowNodesData.forEach((targetNode) => {
                                if (targetNode.inputs) {
                                    targetNode.inputs.forEach((input, inputIndex) => {
                                        if (input.source_broker_id === relay.id) {
                                            const sourceMapKey = `sourceNode:${source.sourceType}:${source.brokerId}`;
                                            // Handle different input types: broker vs argument
                                            const targetHandle = input.type === "broker" 
                                                ? `broker-${input.source_broker_id}`
                                                : `argument-${input.arg_name}`;
                                            
                                            edges.push({
                                                id: `${sourceMapKey}-${targetNode.id}-relay-${inputIndex}`,
                                                source: sourceMapKey,
                                                target: targetNode.id,
                                                sourceHandle: source.brokerId,
                                                targetHandle: targetHandle,
                                                type: "smoothstep",
                                                animated: false,
                                                style: {
                                                    strokeWidth: 2,
                                                    stroke: currentTheme === "dark" ? "#3b82f6" : "#2563eb", // Blue color for source connections
                                                },
                                                data: {
                                                    connectionType: "source_relay",
                                                    sourceData: source,
                                                    relay: relay,
                                                    targetInput: input,
                                                    targetNode: {
                                                        id: targetNode.id,
                                                        step_name: targetNode.step_name,
                                                        node_type: targetNode.node_type,
                                                    },
                                                },
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }

        // TODO: Add more scenarios as needed:
        // - SCENARIO 4: Complex multi-hop connections
        // - SCENARIO 5: Cross-workflow connections
        // - etc.

        return edges;
    }, [workflowNodesData, workflowSources, currentTheme]);

    return {
        edges,
    };
}; 