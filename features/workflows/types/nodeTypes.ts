import { BaseNode, UserInputData, BrokerRelayData } from "@/features/workflows/types";

/**
 * Union type for all possible node data types in the workflow system
 * - BaseNode: Standard workflow function nodes that map to registered functions
 * - UserInputData: User input nodes for manual data entry
 * - BrokerRelayData: Broker relay nodes for data routing
 */
export type WorkflowNodeData = BaseNode | UserInputData | BrokerRelayData;

/**
 * Type guard to check if a node is a UserInput node
 */
export function isUserInputNode(node: WorkflowNodeData): node is UserInputData {
  return 'type' in node && node.type === 'userInput';
}

/**
 * Type guard to check if a node is a BrokerRelay node
 */
export function isBrokerRelayNode(node: WorkflowNodeData): node is BrokerRelayData {
  return 'type' in node && node.type === 'brokerRelay';
}

/**
 * Type guard to check if a node is a BaseNode (workflow function node)
 */
export function isBaseNode(node: WorkflowNodeData): node is BaseNode {
  return 'step_name' in node || 'function_type' in node;
} 