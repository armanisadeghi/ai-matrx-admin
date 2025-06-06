import { cloneDeep } from "lodash";
import { ArgumentMapping } from "@/features/workflows/types";
import { getRegisteredFunctions } from "@/features/workflows/constants";

// Function to get function data for mappings
export const getFunctionDataForMappings = (functionId: string) => {
    return getRegisteredFunctions().find(f => f.id === functionId);
};

// Function to add argument mapping
export const addArgumentMapping = (
    node: any,
    onNodeUpdate: (updatedNode: any) => void
) => {
    const updated = cloneDeep(node);
    if (!updated.arg_mapping) updated.arg_mapping = [];
    updated.arg_mapping.push({
        source_broker_id: '',
        target_arg_name: ''
    });
    onNodeUpdate(updated);
};

// Function to update argument mapping
export const updateArgumentMapping = (
    node: any,
    onNodeUpdate: (updatedNode: any) => void,
    index: number,
    field: keyof ArgumentMapping,
    value: string
) => {
    const updated = cloneDeep(node);
    if (!updated.arg_mapping) return;
    updated.arg_mapping[index] = {
        ...updated.arg_mapping[index],
        [field]: value
    };
    onNodeUpdate(updated);
};

// Function to remove argument mapping
export const removeArgumentMapping = (
    node: any,
    onNodeUpdate: (updatedNode: any) => void,
    index: number
) => {
    const updated = cloneDeep(node);
    if (!updated.arg_mapping) return;
    updated.arg_mapping.splice(index, 1);
    onNodeUpdate(updated);
};

// Function to check if node has argument mappings
export const hasArgumentMappings = (node: any) => {
    return node.arg_mapping && node.arg_mapping.length > 0;
}; 