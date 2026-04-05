import { cloneDeep } from "lodash";
import {
  WorkflowDependency,
  WorkflowNodePersistShape,
} from "@/features/workflows/types";
import { asWorkflowDependencies } from "@/features/workflows/utils/workflow-json-fields";

export const addWorkflowDependency = (
  nodeData: WorkflowNodePersistShape,
  onNodeUpdate: (updatedNode: WorkflowNodePersistShape) => void,
) => {
  const updated = cloneDeep(nodeData);
  const deps = [
    ...asWorkflowDependencies(updated.additional_dependencies),
    {
      source_broker_id: "",
      source_broker_name: "",
      target_broker_id: "",
      target_broker_name: "",
    },
  ];
  updated.additional_dependencies = deps;
  if (onNodeUpdate) {
    onNodeUpdate(updated);
  }
  return updated;
};

// Function to update workflow dependency
export const updateWorkflowDependency = (
  nodeData: WorkflowNodePersistShape,
  onNodeUpdate: (updatedNode: WorkflowNodePersistShape) => void,
  index: number,
  field: keyof WorkflowDependency,
  value: string,
) => {
  const updated = cloneDeep(nodeData);
  const deps = [...asWorkflowDependencies(updated.additional_dependencies)];
  if (index < 0 || index >= deps.length) return;
  const prev = deps[index];
  deps[index] = {
    source_broker_id: prev.source_broker_id || "",
    source_broker_name: prev.source_broker_name || "",
    target_broker_id: prev.target_broker_id || "",
    target_broker_name: prev.target_broker_name || "",
    [field]: value,
  };
  updated.additional_dependencies = deps;
  if (onNodeUpdate) {
    onNodeUpdate(updated);
  }
  return updated;
};

// Function to remove workflow dependency
export const removeWorkflowDependency = (
  nodeData: WorkflowNodePersistShape,
  onNodeUpdate: (updatedNode: WorkflowNodePersistShape) => void,
  index: number,
) => {
  const updated = cloneDeep(nodeData);
  const deps = asWorkflowDependencies(updated.additional_dependencies);
  if (index < 0 || index >= deps.length) return;
  updated.additional_dependencies = deps.filter((_, i) => i !== index);
  if (onNodeUpdate) {
    onNodeUpdate(updated);
  }
  return updated;
};

// Function to check if node has workflow dependencies
export const hasWorkflowDependencies = (
  nodeData: WorkflowNodePersistShape,
) => {
  console.log("nodeData", nodeData);

  if (!nodeData) return false;

  return asWorkflowDependencies(nodeData.additional_dependencies).length > 0;
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
  nodeData: WorkflowNodePersistShape,
  onNodeUpdate: (updatedNode: WorkflowNodePersistShape) => void,
  neededBrokers: NeededBroker[],
  previousNeededBrokers?: NeededBroker[],
) => {
  const updated = cloneDeep(nodeData);
  let nextDeps = [...asWorkflowDependencies(updated.additional_dependencies)];

  const neededBrokerIds = neededBrokers.map((broker) => broker.id);
  const previousBrokerIds =
    previousNeededBrokers?.map((broker) => broker.id) || [];

  const existingSourceIds = nextDeps.map(
    (dep: WorkflowDependency) => dep.source_broker_id,
  );

  neededBrokerIds.forEach((brokerId, index) => {
    if (brokerId && !existingSourceIds.includes(brokerId)) {
      nextDeps.push({
        source_broker_id: brokerId,
        source_broker_name: neededBrokers[index].name || "",
        target_broker_id: "",
        target_broker_name: "",
      });
    }
  });

  // Remove dependencies for previous brokers that are no longer needed
  if (previousNeededBrokers && previousNeededBrokers.length > 0) {
    const brokersToRemove = previousBrokerIds.filter(
      (prevId) => prevId && !neededBrokerIds.includes(prevId),
    );

    nextDeps = nextDeps.filter(
      (dep: WorkflowDependency) =>
        !brokersToRemove.includes(dep.source_broker_id),
    );
  }

  // Ensure all dependencies have all fields
  updated.additional_dependencies = nextDeps.map((dep) => ({
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
export const addNeededBrokerDependencies = (
  nodeData: WorkflowNodePersistShape,
  neededBrokers: NeededBroker[],
): WorkflowNodePersistShape => {
  const updated = cloneDeep(nodeData);
  let nextDeps = [...asWorkflowDependencies(updated.additional_dependencies)];

  const neededBrokerIds = neededBrokers.map((broker) => broker.id);
  const existingSourceIds = nextDeps.map(
    (dep: WorkflowDependency) => dep.source_broker_id,
  );

  neededBrokerIds.forEach((brokerId, index) => {
    if (brokerId && !existingSourceIds.includes(brokerId)) {
      nextDeps.push({
        source_broker_id: brokerId,
        source_broker_name: neededBrokers[index].name || "",
        target_broker_id: "",
        target_broker_name: "",
      });
    }
  });

  updated.additional_dependencies = nextDeps.map((dep) => ({
    source_broker_id: dep.source_broker_id || "",
    source_broker_name: dep.source_broker_name || "",
    target_broker_id: dep.target_broker_id || "",
    target_broker_name: dep.target_broker_name || "",
  }));

  return updated;
};

// Version that uses onNodeUpdate callback
export const addNeededBrokerDependenciesWithCallback = (
  nodeData: WorkflowNodePersistShape,
  onNodeUpdate: (updatedNode: WorkflowNodePersistShape) => void,
  neededBrokers: NeededBroker[],
) => {
  const updated = addNeededBrokerDependencies(nodeData, neededBrokers);
  if (onNodeUpdate) {
    onNodeUpdate(updated);
  }
  return updated;
};

// Simplified version that completely overwrites dependencies with needed brokers
export const setNeededBrokerDependencies = (
  nodeData: WorkflowNodePersistShape,
  neededBrokers: NeededBroker[],
): WorkflowNodePersistShape => {
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
  nodeData: WorkflowNodePersistShape,
  onNodeUpdate: (updatedNode: WorkflowNodePersistShape) => void,
  neededBrokers: NeededBroker[],
) => {
  const updated = setNeededBrokerDependencies(nodeData, neededBrokers);
  if (onNodeUpdate) {
    onNodeUpdate(updated);
  }
  return updated;
};

export const upsertWorkflowDependency = (
  nodeData: WorkflowNodePersistShape,
  partialDependency: WorkflowDependency & { source_broker_id: string },
  onNodeUpdate?: (updatedNode: WorkflowNodePersistShape) => void,
): WorkflowNodePersistShape => {
  const updated = cloneDeep(nodeData);
  const deps = [...asWorkflowDependencies(updated.additional_dependencies)];

  const existingDependencyIndex = deps.findIndex(
    (dep) => dep.source_broker_id === partialDependency.source_broker_id,
  );

  // Initialize the dependency object with existing or default values
  const existingDependency =
    existingDependencyIndex !== -1
      ? deps[existingDependencyIndex]
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
      existingDependency.source_broker_name &&
      existingDependency.source_broker_name !== ""
        ? existingDependency.source_broker_name
        : (partialDependency.source_broker_name ?? ""),
    target_broker_id:
      existingDependency.target_broker_id &&
      existingDependency.target_broker_id !== ""
        ? existingDependency.target_broker_id
        : (partialDependency.target_broker_id ?? ""),
    target_broker_name:
      existingDependency.target_broker_name &&
      existingDependency.target_broker_name !== ""
        ? existingDependency.target_broker_name
        : (partialDependency.target_broker_name ?? ""),
  };

  if (existingDependencyIndex === -1) {
    deps.push(updatedDependency);
  } else {
    deps[existingDependencyIndex] = updatedDependency;
  }
  updated.additional_dependencies = deps;

  if (onNodeUpdate) {
    onNodeUpdate(updated);
  }

  return updated;
};
