import { WorkflowNode } from "./workflowNodeTypes";

export interface WorkflowRelay {
    source: string;
    targets: string[];
}
export interface UserInput {
    broker_id: string;
    value: any;
}

export interface WorkflowDefinition {
    nodes: WorkflowNode[];
    relays?: WorkflowRelay[];
    user_inputs?: UserInput[];
}


export const WorkflowStatus = {
    PENDING: "pending",
    INITIALIZED: "initialized",
    READY_TO_EXECUTE: "ready_to_execute",
    EXECUTING: "executing",
    EXECUTION_COMPLETE: "execution_complete",
    EXECUTION_FAILED: "execution_failed",
} as const;

export type WorkflowStatusType = (typeof WorkflowStatus)[keyof typeof WorkflowStatus];
