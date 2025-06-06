import { cloneDeep } from "lodash";

// ===== BROKER UTILITIES =====

// Function to add return broker override
export const addReturnBrokerOverride = (
    node: any,
    onNodeUpdate: (updatedNode: any) => void
) => {
    const updated = cloneDeep(node);
    if (!updated.return_broker_overrides) updated.return_broker_overrides = [];
    updated.return_broker_overrides.push('');
    onNodeUpdate(updated);
};

// Function to update return broker override
export const updateReturnBrokerOverride = (
    node: any,
    onNodeUpdate: (updatedNode: any) => void,
    index: number,
    value: string
) => {
    const updated = cloneDeep(node);
    if (!updated.return_broker_overrides) return;
    updated.return_broker_overrides[index] = value;
    onNodeUpdate(updated);
};

// Function to remove return broker override
export const removeReturnBrokerOverride = (
    node: any,
    onNodeUpdate: (updatedNode: any) => void,
    index: number
) => {
    const updated = cloneDeep(node);
    if (!updated.return_broker_overrides) return;
    updated.return_broker_overrides.splice(index, 1);
    onNodeUpdate(updated);
};

// Function to check if node has return broker overrides
export const hasReturnBrokerOverrides = (node: any) => {
    return node.return_broker_overrides && node.return_broker_overrides.length > 0;
};
