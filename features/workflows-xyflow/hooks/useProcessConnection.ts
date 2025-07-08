import { Connection, Edge } from "reactflow";
import { useCallback, useMemo } from "react";
import { ArgMapping, BrokerSourceConfig, InputConfig, InputMapping, Output, Relay } from "@/lib/redux/workflow/types";
import { workflowNodesActions, workflowNodesSelectors } from "@/lib/redux/workflow-nodes";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { workflowActions, workflowsSelectors } from "@/lib/redux/workflow";

interface UseProcessConnectionProps {
    workflowId: string;
    handleSave?: () => void;
}

export function useProcessConnection({ workflowId, handleSave }: UseProcessConnectionProps) {
    const dispatch = useAppDispatch();
    const allWorkflowNodes = useAppSelector((state) => workflowNodesSelectors.nodesByWorkflowId(state, workflowId));
    const allWorkflowSources = useAppSelector((state) => workflowsSelectors.workflowSources(state, workflowId));

    // Create optimized lookup maps for efficient node and output finding
    const nodeMap = useMemo(() => {
        const map = new Map();
        allWorkflowNodes.forEach((node) => {
            map.set(node.id, node);
        });
        return map;
    }, [allWorkflowNodes]);

    const outputMap = useMemo(() => {
        const map = new Map();
        allWorkflowNodes.forEach((node) => {
            node.outputs?.forEach((output) => {
                if (output.broker_id) {
                    map.set(`${node.id}-${output.broker_id}`, output);
                }
            });
        });
        return map;
    }, [allWorkflowNodes]);

    const processConnectionToBroker = useCallback((targetHandleId: string, sourceOutput: Output): Output => {
        const relay: Relay = {
            type: "broker",
            id: targetHandleId,
        };

        const existingRelays = sourceOutput.relays || [];
        const relayIndex = existingRelays.findIndex((r) => r.id === targetHandleId);

        let updatedRelays: Relay[];
        if (relayIndex !== -1) {
            // Replace the existing relay with the new one
            updatedRelays = [...existingRelays.slice(0, relayIndex), relay, ...existingRelays.slice(relayIndex + 1)];
        } else {
            // Add the new relay
            updatedRelays = [...existingRelays, relay];
        }

        const updatedOutput: Output = {
            ...sourceOutput,
            relays: updatedRelays,
        };

        return updatedOutput;
    }, []);

    const processSourceConnectionToBroker = useCallback((targetHandleId: string, sourceConfig: BrokerSourceConfig): BrokerSourceConfig => {
        const relay: Relay = {
            type: "broker",
            id: targetHandleId,
        };

        const existingRelays = sourceConfig.relays || [];
        const relayIndex = existingRelays.findIndex((r) => r.id === targetHandleId);

        let updatedRelays: Relay[];
        if (relayIndex !== -1) {
            // Replace the existing relay with the new one
            updatedRelays = [...existingRelays.slice(0, relayIndex), relay, ...existingRelays.slice(relayIndex + 1)];
        } else {
            // Add the new relay
            updatedRelays = [...existingRelays, relay];
        }

        const updatedOutput: BrokerSourceConfig = {
            ...sourceConfig,
            relays: updatedRelays,
        };

        return updatedOutput;
    }, []);

    const processConnectionToArgument = useCallback((sourceHandleId: string, targetHandleId: string, workflowId: string): InputMapping => {
        const inputMapping: InputMapping = {
            type: "arg_mapping",
            arg_name: targetHandleId,
            source_broker_id: sourceHandleId,
            ready: true,
            metadata: {
                scope: "workflow",
                scopeId: workflowId,
            },
        };

        return inputMapping;
    }, []);

    const handleProcessConnection = useCallback(
        (connection: Connection) => {
            const sourceHandleId = connection.sourceHandle; // Use complete broker ID

            // Split target handle only on the first dash to preserve UUIDs
            const targetHandle = connection.targetHandle || "";
            const firstDashIndex = targetHandle.indexOf("-");
            const targetType = firstDashIndex > -1 ? targetHandle.substring(0, firstDashIndex) : targetHandle;
            const targetHandleId = firstDashIndex > -1 ? targetHandle.substring(firstDashIndex + 1) : "";

            const sourceNodeId = connection.source!;
            const targetNodeId = connection.target!;

            const isSourceNode = sourceNodeId.startsWith("sourceNode:");

            // Efficient O(1) lookups using the memoized maps
            const sourceNode = nodeMap.get(sourceNodeId);
            const targetNode = nodeMap.get(targetNodeId);
            const sourceOutput = outputMap.get(`${sourceNodeId}-${sourceHandleId}`);

            if (targetType === "argument") {
                // Add input mapping to the target node
                const updatedInput = processConnectionToArgument(sourceHandleId, targetHandleId, workflowId);
                dispatch(workflowNodesActions.addInput({ id: targetNodeId, input: updatedInput }));
            } else if (isSourceNode) {
                // Update the source node's output by adding a relay
                const matchingSource = allWorkflowSources.find((source) => source.brokerId === sourceHandleId);
                if (matchingSource) {
                    const updatedSource = processSourceConnectionToBroker(targetHandleId, matchingSource);
                    dispatch(
                        workflowActions.updateSourceItem({
                            id: workflowId,
                            index: allWorkflowSources.indexOf(matchingSource),
                            source: updatedSource,
                        })
                    );
                } else {
                    console.error(`Source node ${sourceNodeId} not found in workflow sources`);
                }
            } else if (targetType === "broker") {
                // Update the source node's output by adding a relay
                const updatedOutput = processConnectionToBroker(targetHandleId, sourceOutput);
                dispatch(workflowNodesActions.addOrUpdateOutput({ id: sourceNodeId, output: updatedOutput }));
            }

            handleSave?.();

            // Return edge data for the canvas to use when creating the visual edge
            return {
                connectionType: targetType === "broker" ? "broker_relay" : "argument_mapping",
                sourceNode: {
                    id: sourceNodeId,
                    step_name: sourceNode?.step_name,
                    node_type: sourceNode?.node_type,
                },
                sourceOutput: sourceOutput,
                targetNode: {
                    id: targetNodeId,
                    step_name: targetNode?.step_name,
                    node_type: targetNode?.node_type,
                },
                // Include the specific connection details
                ...(targetType === "broker"
                    ? {
                          relay: { type: "broker", id: targetHandleId },
                      }
                    : {
                          targetInput: processConnectionToArgument(sourceHandleId, targetHandleId, workflowId),
                      }),
            };
        },
        [nodeMap, outputMap, processConnectionToBroker, processConnectionToArgument, workflowId, dispatch, allWorkflowSources, handleSave]
    );

    return {
        handleProcessConnection,
    };
}
