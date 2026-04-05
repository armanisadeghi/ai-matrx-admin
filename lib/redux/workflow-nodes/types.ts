import type { Node } from "@xyflow/react";
import type { Database } from "@/types/database.types";

export interface WorkflowNodeMetadata {
  [key: string]: unknown;
}

export interface WorkflowNodeUiData extends Omit<Node, "id" | "data"> {
  id?: never;
  data?: never;
}

export type XyFlowNodeType =
  | "default"
  | "functionNode"
  | "workflowNode"
  | "userInput"
  | "userDataSource"
  | "direct-input";

export type WorkflowNode =
  Database["public"]["Tables"]["workflow_node_data"]["Row"];

export type WorkflowNodeCreateInput =
  Database["public"]["Tables"]["workflow_node_data"]["Insert"];

export type WorkflowNodeUpdateInput =
  Database["public"]["Tables"]["workflow_node_data"]["Update"];

export type WorkflowNodeStatus =
  | "pending"
  | "executing"
  | "success"
  | "error";

export interface WorkflowNodeState {
  entities: Record<string, WorkflowNode>;
  ids: string[];
  activeId: string | null;
  selectedIds: string[];
  isDirty: Record<string, boolean>;
  status: Record<string, WorkflowNodeStatus>;
  results: Record<string, any>;
  isLoading: boolean;
  error: string | null;
  fetchTimestamp: number | null;
  dataFetched: boolean;
}
