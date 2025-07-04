import { Node } from "@xyflow/react";
import { Dependency, InputMapping, Output } from "../workflow/types";
import { WorkflowNodeType } from "@/features/workflows-xyflow/utils/nodeStyles";

export interface WorkflowNodeMetadata {
    [key: string]: any;
}

export interface WorkflowNodeUiData extends Omit<Node, "id" | "data"> {
    id?: never; // id should never be present!
    data?: never; // data should never be present!
}

export type XyFlowNodeType = "default" | "workflowNode" | "userInput" | "userDataSource";

export interface WorkflowNode {
    id: string;
    workflow_id: string | null;
    function_id: string | null;
    type: XyFlowNodeType | null;
    node_type: WorkflowNodeType | null;
    step_name: string | null;
    execution_required: boolean | null;
    inputs: InputMapping[] | null;
    outputs: Output[] | null;
    dependencies: Dependency[] | null;
    is_active: boolean | null;
    metadata: WorkflowNodeMetadata | null;
    ui_data: WorkflowNodeUiData | null; // TODO: Define proper type for node UI data
    is_public: boolean | null;
    authenticated_read: boolean | null;
    public_read: boolean | null;
    created_at: string;
    updated_at: string | null;
    user_id: string | null;
}

export type WorkflowNodeStatus = 'pending' | 'executing' | 'success' | 'error';

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

export type WorkflowNodeCreateInput = Omit<WorkflowNode, "id" | "created_at" | "updated_at" | "user_id">;
export type WorkflowNodeUpdateInput = Partial<Omit<WorkflowNode, "id" | "created_at" | "updated_at" | "user_id">>;
