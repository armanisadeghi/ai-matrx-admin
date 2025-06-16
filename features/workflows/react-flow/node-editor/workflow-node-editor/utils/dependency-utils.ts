import { cloneDeep } from "lodash";
import { WorkflowDependency } from "@/features/workflows/types";
import { DbFunctionNode } from "@/features/workflows/types";

export const addWorkflowDependency = (nodeData: DbFunctionNode, onNodeUpdate: (updatedNode: DbFunctionNode) => void) => {
    const updated = cloneDeep(nodeData);
    if (!updated.additional_dependencies) updated.additional_dependencies = [];
    updated.additional_dependencies.push({
        source_broker_id: "",
        source_broker_name: "",
        target_broker_id: "",
        target_broker_name: "",
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
        source_broker_id: updated.additional_dependencies[index].source_broker_id || "",
        source_broker_name: updated.additional_dependencies[index].source_broker_name || "",
        target_broker_id: updated.additional_dependencies[index].target_broker_id || "",
        target_broker_name: updated.additional_dependencies[index].target_broker_name || "",
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

    neededBrokerIds.forEach((brokerId, index) => {
        if (brokerId && !existingSourceIds.includes(brokerId)) {
            updated.additional_dependencies.push({
                source_broker_id: brokerId,
                source_broker_name: neededBrokers[index].name || "",
                target_broker_id: "",
                target_broker_name: "",
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

    // Ensure all dependencies have all fields
    updated.additional_dependencies = updated.additional_dependencies.map((dep) => ({
        source_broker_id: dep.source_broker_id || "",
        source_broker_name: dep.source_broker_name || "",
        target_broker_id: dep.target_broker_id || "",
        target_broker_name: dep.target_broker_name || "",
    }));

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
                source_broker_name: neededBrokers[index].name || "",
                target_broker_id: "",
                target_broker_name: "",
            });
        }
    });

    // Ensure all dependencies have all fields
    updated.additional_dependencies = updated.additional_dependencies.map((dep) => ({
        source_broker_id: dep.source_broker_id || "",
        source_broker_name: dep.source_broker_name || "",
        target_broker_id: dep.target_broker_id || "",
        target_broker_name: dep.target_broker_name || "",
    }));

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
        source_broker_name: broker.name || "",
        target_broker_id: "",
        target_broker_name: "",
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


export const upsertWorkflowDependency = (
    nodeData: DbFunctionNode,
    partialDependency: WorkflowDependency & { source_broker_id: string },
    onNodeUpdate?: (updatedNode: DbFunctionNode) => void
): DbFunctionNode => {
    const updated = cloneDeep(nodeData);
    if (!updated.additional_dependencies) updated.additional_dependencies = [];

    const existingDependencyIndex = updated.additional_dependencies.findIndex(
        (dep) => dep.source_broker_id === partialDependency.source_broker_id
    );

    // Initialize the dependency object with existing or default values
    const existingDependency = existingDependencyIndex !== -1 
        ? updated.additional_dependencies[existingDependencyIndex]
        : {
            source_broker_id: partialDependency.source_broker_id,
            source_broker_name: "",
            target_broker_id: "",
            target_broker_name: "",
        };

    // Update only fields that are empty in existing dependency and non-empty in partialDependency
    const updatedDependency: WorkflowDependency = {
        source_broker_id: partialDependency.source_broker_id, // Always set since it's required
        source_broker_name: 
            (existingDependency.source_broker_name && existingDependency.source_broker_name !== "") 
                ? existingDependency.source_broker_name 
                : (partialDependency.source_broker_name ?? ""),
        target_broker_id: 
            (existingDependency.target_broker_id && existingDependency.target_broker_id !== "") 
                ? existingDependency.target_broker_id 
                : (partialDependency.target_broker_id ?? ""),
        target_broker_name: 
            (existingDependency.target_broker_name && existingDependency.target_broker_name !== "") 
                ? existingDependency.target_broker_name 
                : (partialDependency.target_broker_name ?? ""),
    };

    if (existingDependencyIndex === -1) {
        // Add new dependency
        updated.additional_dependencies.push(updatedDependency);
    } else {
        // Update existing dependency
        updated.additional_dependencies[existingDependencyIndex] = updatedDependency;
    }

    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }

    return updated;
};