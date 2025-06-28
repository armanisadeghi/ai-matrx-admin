import { InputMapping, Output, Dependency } from '../workflow/types';

export interface WorkflowNodeData {
    id: string;
    workflow_id: string | null;
    function_id: string | null;
    type: string | null;
    step_name: string | null;
    node_type: string | null;
    execution_required: boolean | null;
    inputs: InputMapping[] | null;
    outputs: Output[] | null;
    dependencies: Dependency[] | null;
    metadata: Record<string, any> | null;
    ui_data: any; // JSONB - define specific type when structure is known
    is_public: boolean | null;
    authenticated_read: boolean | null;
    public_read: boolean | null;
    created_at: string;
    updated_at: string;
    user_id: string | null;
    status?: string | null;
}

export interface WorkflowNodeSliceState {
    // Normalized state - nodes stored by ID
    nodes: Record<string, WorkflowNodeData>;
    
    // UI state
    selectedNodeId: string | null;
    
    // Loading states
    loading: boolean;
    error: string | null;
    
    // Track dirty state for individual nodes (using array for Redux compatibility)
    dirtyNodes: string[];
    
    // Cache management
    lastFetched: Record<string, number>;
    staleTime: number;
}