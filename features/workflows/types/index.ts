import { DbBrokerRelayData } from "./relaynodeTypes";
import { Node } from "reactflow";
import { DbWorkflow } from "./coreWorkflowTypes";
import { DbFunctionNode } from "./functionNodeTypes";
import { DbUserInput } from "./userInputNodeTypes";
import { FunctionNode } from "./functionNodeTypes";
import { UserInputNode } from "./userInputNodeTypes";
import { BrokerRelayNode } from "./relaynodeTypes";
import { DbWorkflowEdge } from "./edgeTypes";
import { WorkflowEdge } from "./edgeTypes";
export * from "./coreWorkflowTypes";
export * from "./functionNodeTypes";
export * from "./userInputNodeTypes";
export * from "./relaynodeTypes";
export * from "./edgeTypes";

import type { EnrichedBroker } from "./enrichedBrokerTypes";

export type { EnrichedBroker } from "./enrichedBrokerTypes";
export type {
  PythonDataType,
  ReactFlowUIMetadata,
} from "./workflowReactFlowTypes";
export type {
  KnownBroker,
  KnownBrokerComputer,
  NodeKnownBrokers,
} from "./knownBrokersTypes";

export interface DbCompleteWorkflow {
  workflow: DbWorkflow;
  functionNodes: DbFunctionNode[];
  userInputs: DbUserInput[];
  relays: DbBrokerRelayData[];
  edges: DbWorkflowEdge[];
}

export interface ConvertedWorkflowData {
  workflow: DbWorkflow;
  functionNodes: FunctionNode[];
  userInputs: UserInputNode[];
  relays: BrokerRelayNode[];
  edges: WorkflowEdge[];
  allNodes: Node[];
}

export type DbNodeData = DbFunctionNode | DbUserInput | DbBrokerRelayData;

export type WorkflowNode = FunctionNode | UserInputNode | BrokerRelayNode;

function uiNodeDataType(ui_node_data: unknown): string | undefined {
  if (
    ui_node_data &&
    typeof ui_node_data === "object" &&
    ui_node_data !== null &&
    "type" in ui_node_data
  ) {
    const t = (ui_node_data as { type?: unknown }).type;
    return typeof t === "string" ? t : undefined;
  }
  return undefined;
}

export interface TabComponentProps {
  nodeData: DbFunctionNode;
  onNodeUpdate: (nodeData: DbFunctionNode) => void;
  enrichedBrokers: EnrichedBroker[];
}

export function isUserInputNode(data: DbNodeData): data is DbUserInput {
  return uiNodeDataType(data.ui_node_data) === "userInput";
}

/**
 * Type guard to check if a node is a BrokerRelay node
 */
export function isBrokerRelayNode(data: DbNodeData): data is DbBrokerRelayData {
  return uiNodeDataType(data.ui_node_data) === "brokerRelay";
}

/**
 * Type guard to check if a node is a BaseNode (workflow function node)
 */
export function isBaseFunctionNode(data: DbNodeData): data is DbFunctionNode {
  const t = uiNodeDataType(data.ui_node_data);
  return (
    t === "functionNode" ||
    t === "recipeNode" ||
    t === "registeredFunction" ||
    t === "workflowNode"
  );
}
