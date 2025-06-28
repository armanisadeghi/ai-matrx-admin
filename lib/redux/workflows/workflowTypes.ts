export const WorkflowStatus = {
    PENDING: "pending",
    INITIALIZED: "initialized",
    READY_TO_EXECUTE: "ready_to_execute",
    EXECUTING: "executing",
    EXECUTION_COMPLETE: "execution_complete",
    EXECUTION_FAILED: "execution_failed",
} as const;

export interface WorkflowData {
    id: string;
    name: string;
    description: string | null;
    workflow_type: string | null;
    inputs: Record<string, any> | null;
    outputs: Record<string, any> | null;
    dependencies: Record<string, any> | null;
    sources: Record<string, any> | null;
    destinations: Record<string, any> | null;
    actions: Record<string, any> | null;
    category: string | null;
    tags: Record<string, any> | null;
    is_active: boolean | null;
    is_deleted: boolean | null;
    auto_execute: boolean | null;
    metadata: Record<string, any> | null;
    viewport: Record<string, any> | null;
    user_id: string | null;
    version: number | null;
    is_public: boolean | null;
    authenticated_read: boolean | null;
    public_read: boolean | null;
    created_at: string | null;
    updated_at: string | null;
  }
  
  export interface WorkflowState {
    workflows: WorkflowData[];
    currentWorkflow: WorkflowData | null;
    loading: boolean;
    error: string | null;
  }