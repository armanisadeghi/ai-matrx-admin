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


interface NeededBroker {
    id: string;
    name: string;
    required: boolean;
    dataType: string;
    defaultValue: string;
    fieldComponentId?: string;
}

export const updateDependencyWithNeededBrokers = (
    node: any,
    onNodeUpdate: (updatedNode: any) => void,
    neededBrokers: NeededBroker[],
    previousNeededBrokers?: NeededBroker[]
) => {
    const updated = cloneDeep(node);
    if (!updated.additional_dependencies) updated.additional_dependencies = [];

    const neededBrokerIds = neededBrokers.map(broker => broker.id);
    const previousBrokerIds = previousNeededBrokers?.map(broker => broker.id) || [];

    const existingSourceIds = updated.additional_dependencies.map((dep: WorkflowDependency) => dep.source_broker_id);

    neededBrokerIds.forEach(brokerId => {
        if (brokerId && !existingSourceIds.includes(brokerId)) {
            updated.additional_dependencies.push({
                source_broker_id: brokerId,
                target_broker_id: ''
            });
        }
    });

    // Remove dependencies for previous brokers that are no longer needed
    if (previousNeededBrokers && previousNeededBrokers.length > 0) {
        const brokersToRemove = previousBrokerIds.filter(prevId => 
            prevId && !neededBrokerIds.includes(prevId)
        );

        updated.additional_dependencies = updated.additional_dependencies.filter(
            (dep: WorkflowDependency) => !brokersToRemove.includes(dep.source_broker_id)
        );
    }

    onNodeUpdate(updated);
};
