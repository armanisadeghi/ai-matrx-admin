import { cloneDeep } from "lodash";
import { WorkflowDependency } from "@/features/workflows/types";

// Function to add workflow dependency
export const addWorkflowDependency = (
    node: any,
    onNodeUpdate: (updatedNode: any) => void
) => {
    const updated = cloneDeep(node);
    if (!updated.additional_dependencies) updated.additional_dependencies = [];
    updated.additional_dependencies.push({
        source_broker_id: '',
        target_broker_id: ''
    });
    onNodeUpdate(updated);
};

// Function to update workflow dependency
export const updateWorkflowDependency = (
    node: any,
    onNodeUpdate: (updatedNode: any) => void,
    index: number,
    field: keyof WorkflowDependency,
    value: string
) => {
    const updated = cloneDeep(node);
    if (!updated.additional_dependencies) return;
    updated.additional_dependencies[index] = {
        ...updated.additional_dependencies[index],
        [field]: value
    };
    onNodeUpdate(updated);
};

// Function to remove workflow dependency
export const removeWorkflowDependency = (
    node: any,
    onNodeUpdate: (updatedNode: any) => void,
    index: number
) => {
    const updated = cloneDeep(node);
    if (!updated.additional_dependencies) return;
    updated.additional_dependencies.splice(index, 1);
    onNodeUpdate(updated);
};

// Function to check if node has workflow dependencies
export const hasWorkflowDependencies = (node: any) => {
    return node.additional_dependencies && node.additional_dependencies.length > 0;
}; 