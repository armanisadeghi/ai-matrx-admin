import { DbFunctionNode } from "@/features/workflows/types";
import { asStringArray } from "@/features/workflows/utils/workflow-json-fields";
import { cloneDeep } from "lodash";
import { NodeDefinitionType } from "../custom-workflow-nodes/custom-nodes/custom-node-definitions";

// ===== BROKER UTILITIES =====

// Function to add return broker override
export const addReturnBrokerOverride = (
  nodeData: DbFunctionNode,
  onNodeUpdate: (updatedNode: DbFunctionNode) => void,
) => {
  if (!nodeData) {
    console.warn("nodeData is undefined in addReturnBrokerOverride");
    return;
  }

  const updated = cloneDeep(nodeData);
  const brokers = [...asStringArray(updated.return_broker_overrides), ""];
  updated.return_broker_overrides = brokers;
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
  value: string,
) => {
  if (!nodeData) {
    console.warn("nodeData is undefined in updateReturnBrokerOverride");
    return;
  }

  const updated = cloneDeep(nodeData);
  const brokers = asStringArray(updated.return_broker_overrides);
  if (index < 0 || index >= brokers.length) return;
  brokers[index] = value;
  updated.return_broker_overrides = brokers;
  if (onNodeUpdate) {
    onNodeUpdate(updated);
  }
  return updated;
};

// Function to remove return broker override
export const removeReturnBrokerOverride = (
  nodeData: DbFunctionNode,
  onNodeUpdate: (updatedNode: DbFunctionNode) => void,
  index: number,
) => {
  if (!nodeData) {
    console.warn("nodeData is undefined in removeReturnBrokerOverride");
    return;
  }

  const updated = cloneDeep(nodeData);
  const brokers = asStringArray(updated.return_broker_overrides);
  if (index < 0 || index >= brokers.length) return;
  const next = brokers.filter((_, i) => i !== index);
  updated.return_broker_overrides = next;
  if (onNodeUpdate) {
    onNodeUpdate(updated);
  }
  return updated;
};

// Function to check if node has return broker overrides
export const hasReturnBrokerOverrides = (nodeData: DbFunctionNode) => {
  if (!nodeData) return false;
  return asStringArray(nodeData.return_broker_overrides).length > 0;
};

// Function to overwrite return broker overrides based on node definition predefined brokers
export const overwriteReturnBrokerOverridesFromDefinition = (
  nodeData: DbFunctionNode,
  nodeDefinition: NodeDefinitionType,
  dynamicValues: Record<string, string> = {},
): DbFunctionNode => {
  if (!nodeData) {
    console.warn(
      "nodeData is undefined in overwriteReturnBrokerOverridesFromDefinition",
    );
    return {} as DbFunctionNode; // Return empty object as fallback
  }

  if (!nodeDefinition) {
    console.warn(
      "nodeDefinition is undefined in overwriteReturnBrokerOverridesFromDefinition",
    );
    return cloneDeep(nodeData);
  }

  const updated = cloneDeep(nodeData);

  // Process predefined brokers to create return broker overrides
  const brokerOverrides: string[] = [];

  // Check if predefined_brokers exists
  if (nodeDefinition.predefined_brokers) {
    for (const broker of nodeDefinition.predefined_brokers) {
      if (!broker) continue; // Skip null/undefined brokers

      let brokerId = broker.id || "";

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
  dynamicValues: Record<string, string> = {},
) => {
  if (!nodeData) {
    console.warn(
      "nodeData is undefined in overwriteReturnBrokerOverridesFromDefinitionWithCallback",
    );
    return;
  }

  if (!onNodeUpdate) {
    console.warn(
      "onNodeUpdate callback is undefined in overwriteReturnBrokerOverridesFromDefinitionWithCallback",
    );
    return;
  }

  const updated = overwriteReturnBrokerOverridesFromDefinition(
    nodeData,
    nodeDefinition,
    dynamicValues,
  );

  if (updated) {
    onNodeUpdate(updated);
  }

  return updated;
};

// Function to clear all return broker overrides
export const clearReturnBrokerOverrides = (
  nodeData: DbFunctionNode,
  onNodeUpdate: (updatedNode: DbFunctionNode) => void,
) => {
  if (!nodeData) {
    console.warn("nodeData is undefined in clearReturnBrokerOverrides");
    return;
  }

  const updated = cloneDeep(nodeData);
  updated.return_broker_overrides = [];
  if (onNodeUpdate) {
    onNodeUpdate(updated);
  }
  return updated;
};
