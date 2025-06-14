import { XYPosition, Position, CoordinateExtent, Viewport } from "reactflow";

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
import { EnrichedBroker } from "../utils/data-flow-manager";

export * from "./coreWorkflowTypes";
export * from "./functionNodeTypes";
export * from "./userInputNodeTypes";
export * from "./relaynodeTypes";
export * from "./edgeTypes";

export type PythonDataType = "int" | "float" | "str" | "bool" | "list" | "tuple" | "dict" | "set";

export interface ReactFlowUIMetadata {
    position: XYPosition;
    type?: string;
    sourcePosition?: Position;
    targetPosition?: Position;
    hidden?: boolean;
    draggable?: boolean;
    selectable?: boolean;
    connectable?: boolean;
    deletable?: boolean;
    dragHandle?: string;
    parentId?: string;
    zIndex?: number;
    extent?: "parent" | CoordinateExtent;
    expandParent?: boolean;
    ariaLabel?: string;
    focusable?: boolean;
    style?: React.CSSProperties;
    className?: string;
}

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

export interface TabComponentProps {
    nodeData: DbFunctionNode;
    onNodeUpdate: (nodeData: DbFunctionNode) => void;
    enrichedBrokers: EnrichedBroker[];
}

export function isUserInputNode(data: DbNodeData): data is DbUserInput {
    return data.ui_node_data?.type === "userInput";
}

/**
 * Type guard to check if a node is a BrokerRelay node
 */
export function isBrokerRelayNode(data: DbNodeData): data is DbBrokerRelayData {
    return data.ui_node_data?.type === "brokerRelay";
}

/**
 * Type guard to check if a node is a BaseNode (workflow function node)
 */
export function isBaseFunctionNode(data: DbNodeData): data is DbFunctionNode {
    return (
        data.ui_node_data?.type === "functionNode" ||
        data.ui_node_data?.type === "recipeNode" ||
        data.ui_node_data?.type === "registeredFunction" ||
        data.ui_node_data?.type === "workflowNode"
    );
}
