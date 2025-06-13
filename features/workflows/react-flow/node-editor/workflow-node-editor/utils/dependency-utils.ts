import { cloneDeep } from "lodash";
import { WorkflowDependency } from "@/features/workflows/types";
import { DbFunctionNode } from "@/features/workflows/types";

// Function to add workflow dependency
export const addWorkflowDependency = (nodeData: DbFunctionNode, onNodeUpdate: (updatedNode: DbFunctionNode) => void) => {
    const updated = cloneDeep(nodeData);
    if (!updated.additional_dependencies) updated.additional_dependencies = [];
    updated.additional_dependencies.push({
        source_broker_id: "",
        target_broker_id: "",
    });
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

// Function to update workflow dependency
export const updateWorkflowDependency = (
    nodeData: DbFunctionNode,
    onNodeUpdate: (updatedNode: DbFunctionNode) => void,
    index: number,
    field: keyof WorkflowDependency,
    value: string
) => {
    const updated = cloneDeep(nodeData);
    if (!updated.additional_dependencies) return;
    updated.additional_dependencies[index] = {
        ...updated.additional_dependencies[index],
        [field]: value,
    };
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

// Function to remove workflow dependency
export const removeWorkflowDependency = (nodeData: DbFunctionNode, onNodeUpdate: (updatedNode: DbFunctionNode) => void, index: number) => {
    const updated = cloneDeep(nodeData);
    if (!updated.additional_dependencies) return;
    updated.additional_dependencies.splice(index, 1);
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

// Function to check if node has workflow dependencies
export const hasWorkflowDependencies = (nodeData: DbFunctionNode) => {
    console.log("nodeData", nodeData);

    if (!nodeData) return false;

    return nodeData.additional_dependencies && nodeData.additional_dependencies.length > 0;
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
    nodeData: DbFunctionNode,
    onNodeUpdate: (updatedNode: DbFunctionNode) => void,
    neededBrokers: NeededBroker[],
    previousNeededBrokers?: NeededBroker[]
) => {
    const updated = cloneDeep(nodeData);
    if (!updated.additional_dependencies) updated.additional_dependencies = [];

    const neededBrokerIds = neededBrokers.map((broker) => broker.id);
    const previousBrokerIds = previousNeededBrokers?.map((broker) => broker.id) || [];

    const existingSourceIds = updated.additional_dependencies.map((dep: WorkflowDependency) => dep.source_broker_id);

    neededBrokerIds.forEach((brokerId) => {
        if (brokerId && !existingSourceIds.includes(brokerId)) {
            updated.additional_dependencies.push({
                source_broker_id: brokerId,
                target_broker_id: "",
            });
        }
    });

    // Remove dependencies for previous brokers that are no longer needed
    if (previousNeededBrokers && previousNeededBrokers.length > 0) {
        const brokersToRemove = previousBrokerIds.filter((prevId) => prevId && !neededBrokerIds.includes(prevId));

        updated.additional_dependencies = updated.additional_dependencies.filter(
            (dep: WorkflowDependency) => !brokersToRemove.includes(dep.source_broker_id)
        );
    }

    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

// Simplified version that just returns updated node data
export const addNeededBrokerDependencies = (nodeData: DbFunctionNode, neededBrokers: NeededBroker[]): DbFunctionNode => {
    const updated = cloneDeep(nodeData);
    if (!updated.additional_dependencies) updated.additional_dependencies = [];

    const neededBrokerIds = neededBrokers.map((broker) => broker.id);
    const existingSourceIds = updated.additional_dependencies.map((dep: WorkflowDependency) => dep.source_broker_id);

    neededBrokerIds.forEach((brokerId, index) => {
        if (brokerId && !existingSourceIds.includes(brokerId)) {
            updated.additional_dependencies.push({
                source_broker_id: brokerId,
                source_broker_name: neededBrokers[index].name,
                target_broker_id: "",
            });
        }
    });

    return updated;
};

// Version that uses onNodeUpdate callback
export const addNeededBrokerDependenciesWithCallback = (
    nodeData: DbFunctionNode,
    onNodeUpdate: (updatedNode: DbFunctionNode) => void,
    neededBrokers: NeededBroker[]
) => {
    const updated = addNeededBrokerDependencies(nodeData, neededBrokers);
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

// Simplified version that completely overwrites dependencies with needed brokers
export const setNeededBrokerDependencies = (nodeData: DbFunctionNode, neededBrokers: NeededBroker[]): DbFunctionNode => {
    const updated = cloneDeep(nodeData);

    // Completely replace the dependencies array
    updated.additional_dependencies = neededBrokers.map((broker) => ({
        source_broker_id: broker.id,
        source_broker_name: broker.name,
        target_broker_id: "",
    }));

    return updated;
};

// Version that uses onNodeUpdate callback
export const setNeededBrokerDependenciesWithCallback = (
    nodeData: DbFunctionNode,
    onNodeUpdate: (updatedNode: DbFunctionNode) => void,
    neededBrokers: NeededBroker[]
) => {
    const updated = setNeededBrokerDependencies(nodeData, neededBrokers);
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};
