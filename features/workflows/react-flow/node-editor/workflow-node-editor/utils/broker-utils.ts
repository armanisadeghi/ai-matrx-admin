import { DbFunctionNode } from "@/features/workflows/types";
import { cloneDeep } from "lodash";
import { NodeDefinitionType } from "../custom-workflow-nodes/custom-nodes/custom-node-definitions";

// ===== BROKER UTILITIES =====

// Function to add return broker override
export const addReturnBrokerOverride = (
    nodeData: DbFunctionNode,
    onNodeUpdate: (updatedNode: DbFunctionNode) => void
) => {
    const updated = cloneDeep(nodeData);
    if (!updated.return_broker_overrides) updated.return_broker_overrides = [];
    updated.return_broker_overrides.push('');
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

// Function to update return broker override
export const updateReturnBrokerOverride = (
    nodeData: DbFunctionNode,
    onNodeUpdate: (updatedNode: DbFunctionNode) => void,
    index: number,
    value: string
) => {
    const updated = cloneDeep(nodeData);
    if (!updated.return_broker_overrides) return;
    updated.return_broker_overrides[index] = value;
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

// Function to remove return broker override
export const removeReturnBrokerOverride = (
    nodeData: DbFunctionNode,
    onNodeUpdate: (updatedNode: DbFunctionNode) => void,
    index: number
) => {
    const updated = cloneDeep(nodeData);
    if (!updated.return_broker_overrides) return;
    updated.return_broker_overrides.splice(index, 1);
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

// Function to check if node has return broker overrides
export const hasReturnBrokerOverrides = (nodeData: DbFunctionNode) => {
    if (!nodeData) return false;
    return nodeData.return_broker_overrides && nodeData.return_broker_overrides.length > 0;
};

// Function to overwrite return broker overrides based on node definition predefined brokers
export const overwriteReturnBrokerOverridesFromDefinition = (
    nodeData: DbFunctionNode,
    nodeDefinition: NodeDefinitionType,
    dynamicValues: Record<string, string> = {}
): DbFunctionNode => {
    const updated = cloneDeep(nodeData);
    
    // Process predefined brokers to create return broker overrides
    const brokerOverrides: string[] = [];
    
    for (const broker of nodeDefinition.predefined_brokers) {
        let brokerId = broker.id;
        
        // If this is a dynamic broker, replace placeholders with actual values
        if (broker.dynamic_id) {
            // Replace all placeholders in the format {key} with corresponding values
            for (const [key, value] of Object.entries(dynamicValues)) {
                const placeholder = `{${key}}`;
                brokerId = brokerId.replace(placeholder, value);
            }
        }
        
        brokerOverrides.push(brokerId);
    }
    
    // Overwrite the return broker overrides
    updated.return_broker_overrides = brokerOverrides;
    
    return updated;
};

// Function to overwrite return broker overrides using onNodeUpdate callback
export const overwriteReturnBrokerOverridesFromDefinitionWithCallback = (
    nodeData: DbFunctionNode,
    onNodeUpdate: (updatedNode: DbFunctionNode) => void,
    nodeDefinition: NodeDefinitionType,
    dynamicValues: Record<string, string> = {}
) => {
    const updated = overwriteReturnBrokerOverridesFromDefinition(
        nodeData,
        nodeDefinition,
        dynamicValues
    );
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

// Function to clear all return broker overrides
export const clearReturnBrokerOverrides = (
    nodeData: DbFunctionNode,
    onNodeUpdate: (updatedNode: DbFunctionNode) => void
) => {
    const updated = cloneDeep(nodeData);
    updated.return_broker_overrides = [];
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};
