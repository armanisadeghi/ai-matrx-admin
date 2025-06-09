import { supabase } from "@/utils/supabase/client";
import {
    CoreWorkflowData,
    CompleteWorkflowData,
    WorkflowNodeData,
    WorkflowUserInputData,
    WorkflowRelayData,
    WorkflowEdgeData,
} from "@/features/workflows/types";

// ===== FETCH OPERATIONS =====

/**
 * Fetch all workflows for a user
 */
export async function fetchUserWorkflows(userId: string): Promise<CoreWorkflowData[]> {
    const { data, error } = await supabase
        .from("workflow")
        .select("*")
        .eq("user_id", userId)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch workflows: ${error.message}`);
    return data || [];
}

/**
 * Fetch complete workflow data by ID
 */
export async function fetchWorkflowById(workflowId: string): Promise<CompleteWorkflowData> {
    const [workflowResult, nodesResult, userInputsResult, relaysResult, edgesResult] = await Promise.all([
        supabase.from("workflow").select("*").eq("id", workflowId).single(),
        supabase.from("workflow_node").select("*").eq("workflow_id", workflowId),
        supabase.from("workflow_user_input").select("*").eq("workflow_id", workflowId),
        supabase.from("workflow_relay").select("*").eq("workflow_id", workflowId),
        supabase.from("workflow_edge").select("*").eq("workflow_id", workflowId),
    ]);

    if (workflowResult.error) throw new Error(`Failed to fetch workflow: ${workflowResult.error.message}`);
    if (nodesResult.error) throw new Error(`Failed to fetch nodes: ${nodesResult.error.message}`);
    if (userInputsResult.error) throw new Error(`Failed to fetch user inputs: ${userInputsResult.error.message}`);
    if (relaysResult.error) throw new Error(`Failed to fetch relays: ${relaysResult.error.message}`);
    if (edgesResult.error) throw new Error(`Failed to fetch edges: ${edgesResult.error.message}`);

    const workflow = workflowResult.data;
    const nodes = nodesResult.data || [];
    const userInputs = userInputsResult.data || [];
    const relays = relaysResult.data || [];
    const edges = edgesResult.data || [];

    return {
        workflow,
        nodes,
        userInputs,
        relays,
        edges,
    };
}

// ===== SAVE OPERATIONS =====

/**
 * Create a new workflow
 */
export async function createWorkflow(userId: string, data: Partial<CoreWorkflowData>): Promise<CoreWorkflowData> {
    const { data: workflow, error } = await supabase
        .from("workflow")
        .insert({
            user_id: userId,
            name: data.name || "Untitled Workflow",
            description: data.description || null,
            viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
            auto_execute: data.auto_execute || false,
            tags: data.tags || null,
            category: data.category || null,
            metadata: data.metadata || {},
        })
        .select()
        .single();

    if (error) throw new Error(`Failed to create workflow: ${error.message}`);
    return workflow;
}

/**
 * Update workflow metadata
 */
export async function updateWorkflow(workflowId: string, data: Partial<CoreWorkflowData>): Promise<CoreWorkflowData> {
    const { data: workflow, error } = await supabase.from("workflow").update(data).eq("id", workflowId).select().single();

    if (error) throw new Error(`Failed to update workflow: ${error.message}`);
    return workflow;
}

// ===== NODE OPERATIONS =====

/**
 * Save workflow node
 */
export async function saveWorkflowNode(workflowId: string, userId: string, nodeData: Partial<WorkflowNodeData>): Promise<WorkflowNodeData> {
    const isUpdate = !!nodeData.id;

    if (isUpdate) {
        const { data: node, error } = await supabase.from("workflow_node").update(nodeData).eq("id", nodeData.id).select().single();

        if (error) throw new Error(`Failed to update node: ${error.message}`);
        return node;
    } else {
        const { data: node, error } = await supabase
            .from("workflow_node")
            .insert({
                ...nodeData,
                workflow_id: workflowId,
                user_id: userId,
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create node: ${error.message}`);
        return node;
    }
}

/**
 * Remove node from workflow (clears workflow_id but keeps node in database)
 */
export async function removeNodeFromWorkflow(nodeId: string): Promise<void> {
    const { error } = await supabase.from("workflow_node").update({ workflow_id: null }).eq("id", nodeId);

    if (error) throw new Error(`Failed to remove node from workflow: ${error.message}`);
}

/**
 * Delete workflow node permanently
 */
export async function deleteWorkflowNode(nodeId: string): Promise<void> {
    const { error } = await supabase.from("workflow_node").delete().eq("id", nodeId);

    if (error) throw new Error(`Failed to delete node: ${error.message}`);
}

// ===== USER INPUT OPERATIONS =====

/**
 * Save workflow user input
 */
export async function saveWorkflowUserInput(
    workflowId: string,
    userId: string,
    inputData: Partial<WorkflowUserInputData>
): Promise<WorkflowUserInputData> {
    const isUpdate = !!inputData.id;

    if (isUpdate) {
        const { data: userInput, error } = await supabase
            .from("workflow_user_input")
            .update(inputData)
            .eq("id", inputData.id)
            .select()
            .single();

        if (error) throw new Error(`Failed to update user input: ${error.message}`);
        return userInput;
    } else {
        const { data: userInput, error } = await supabase
            .from("workflow_user_input")
            .insert({
                ...inputData,
                workflow_id: workflowId,
                user_id: userId,
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create user input: ${error.message}`);
        return userInput;
    }
}

/**
 * Remove user input from workflow (clears workflow_id but keeps input in database)
 */
export async function removeUserInputFromWorkflow(inputId: string): Promise<void> {
    const { error } = await supabase.from("workflow_user_input").update({ workflow_id: null }).eq("id", inputId);

    if (error) throw new Error(`Failed to remove user input from workflow: ${error.message}`);
}

/**
 * Delete workflow user input permanently
 */
export async function deleteWorkflowUserInput(inputId: string): Promise<void> {
    const { error } = await supabase.from("workflow_user_input").delete().eq("id", inputId);

    if (error) throw new Error(`Failed to delete user input: ${error.message}`);
}

// ===== RELAY OPERATIONS =====

/**
 * Save workflow relay
 */
export async function saveWorkflowRelay(
    workflowId: string,
    userId: string,
    relayData: Partial<WorkflowRelayData>
): Promise<WorkflowRelayData> {
    const isUpdate = !!relayData.id;

    if (isUpdate) {
        const { data: relay, error } = await supabase.from("workflow_relay").update(relayData).eq("id", relayData.id).select().single();

        if (error) throw new Error(`Failed to update relay: ${error.message}`);
        return relay;
    } else {
        const { data: relay, error } = await supabase
            .from("workflow_relay")
            .insert({
                ...relayData,
                workflow_id: workflowId,
                user_id: userId,
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create relay: ${error.message}`);
        return relay;
    }
}

/**
 * Remove relay from workflow (clears workflow_id but keeps relay in database)
 */
export async function removeRelayFromWorkflow(relayId: string): Promise<void> {
    const { error } = await supabase.from("workflow_relay").update({ workflow_id: null }).eq("id", relayId);

    if (error) throw new Error(`Failed to remove relay from workflow: ${error.message}`);
}

/**
 * Delete workflow relay permanently
 */
export async function deleteWorkflowRelay(relayId: string): Promise<void> {
    const { error } = await supabase.from("workflow_relay").delete().eq("id", relayId);

    if (error) throw new Error(`Failed to delete relay: ${error.message}`);
}

// ===== EDGE OPERATIONS =====

/**
 * Save workflow edge
 */
export async function saveWorkflowEdge(workflowId: string, edgeData: Partial<WorkflowEdgeData>): Promise<WorkflowEdgeData> {
    const { data: edge, error } = await supabase
        .from("workflow_edge")
        .upsert({
            ...edgeData,
            workflow_id: workflowId,
        })
        .select()
        .single();

    if (error) throw new Error(`Failed to save edge: ${error.message}`);
    return edge;
}

/**
 * Delete workflow edge
 */
export async function deleteWorkflowEdge(edgeId: string): Promise<void> {
    const { error } = await supabase.from("workflow_edge").delete().eq("id", edgeId);

    if (error) throw new Error(`Failed to delete edge: ${error.message}`);
}

// ===== BATCH OPERATIONS =====

/**
 * Save complete workflow data (useful for bulk updates)
 */
export async function saveCompleteWorkflow(
    workflowId: string,
    userId: string,
    data: {
        workflow?: Partial<CoreWorkflowData>;
        nodes?: WorkflowNodeData[];
        userInputs?: WorkflowUserInputData[];
        relays?: WorkflowRelayData[];
        edges?: WorkflowEdgeData[];
    }
): Promise<void> {
    const operations: Promise<any>[] = [];

    if (data.workflow) {
        operations.push(updateWorkflow(workflowId, data.workflow));
    }

    // For now, we'll do individual saves. Could optimize with batch operations later if needed.
    if (data.nodes) {
        operations.push(...data.nodes.map((node) => saveWorkflowNode(workflowId, userId, node)));
    }

    if (data.userInputs) {
        operations.push(...data.userInputs.map((input) => saveWorkflowUserInput(workflowId, userId, input)));
    }

    if (data.relays) {
        operations.push(...data.relays.map((relay) => saveWorkflowRelay(workflowId, userId, relay)));
    }

    if (data.edges) {
        operations.push(...data.edges.map((edge) => saveWorkflowEdge(workflowId, edge)));
    }

    await Promise.all(operations);
}

/**
 * Duplicate a workflow node within the same workflow
 */
export async function duplicateWorkflowNode(nodeId: string, workflowId: string, userId: string): Promise<WorkflowNodeData> {
    // First, fetch the existing node
    const { data: existingNode, error: fetchError } = await supabase
        .from("workflow_node")
        .select("*")
        .eq("id", nodeId)
        .single();

    if (fetchError) throw new Error(`Failed to fetch node for duplication: ${fetchError.message}`);
    if (!existingNode) throw new Error("Node not found for duplication");

    // Create a copy excluding id, created_at, updated_at
    const { id, created_at, updated_at, ...nodeDataToCopy } = existingNode;
    
    // Modify the step_name to include "COPY"
    const originalStepName = nodeDataToCopy.step_name || "Unnamed Step";
    const duplicatedStepName = `${originalStepName} COPY`;

    // Create the new node
    const { data: duplicatedNode, error: createError } = await supabase
        .from("workflow_node")
        .insert({
            ...nodeDataToCopy,
            step_name: duplicatedStepName,
            workflow_id: workflowId,
            user_id: userId,
        })
        .select()
        .single();

    if (createError) throw new Error(`Failed to create duplicated node: ${createError.message}`);
    return duplicatedNode;
}

/**
 * Duplicate a workflow user input within the same workflow
 */
export async function duplicateWorkflowUserInput(inputId: string, workflowId: string, userId: string): Promise<WorkflowUserInputData> {
    // First, fetch the existing user input
    const { data: existingInput, error: fetchError } = await supabase
        .from("workflow_user_input")
        .select("*")
        .eq("id", inputId)
        .single();

    if (fetchError) throw new Error(`Failed to fetch user input for duplication: ${fetchError.message}`);
    if (!existingInput) throw new Error("User input not found for duplication");

    // Create a copy excluding id, created_at, updated_at
    const { id, created_at, updated_at, ...inputDataToCopy } = existingInput;
    
    // Modify the label to include "COPY"
    const originalLabel = inputDataToCopy.label || "User Input";
    const duplicatedLabel = `${originalLabel} COPY`;

    // Create the new user input
    const { data: duplicatedInput, error: createError } = await supabase
        .from("workflow_user_input")
        .insert({
            ...inputDataToCopy,
            label: duplicatedLabel,
            workflow_id: workflowId,
            user_id: userId,
        })
        .select()
        .single();

    if (createError) throw new Error(`Failed to create duplicated user input: ${createError.message}`);
    return duplicatedInput;
}

/**
 * Duplicate a workflow relay within the same workflow
 */
export async function duplicateWorkflowRelay(relayId: string, workflowId: string, userId: string): Promise<WorkflowRelayData> {
    // First, fetch the existing relay
    const { data: existingRelay, error: fetchError } = await supabase
        .from("workflow_relay")
        .select("*")
        .eq("id", relayId)
        .single();

    if (fetchError) throw new Error(`Failed to fetch relay for duplication: ${fetchError.message}`);
    if (!existingRelay) throw new Error("Relay not found for duplication");

    // Create a copy excluding id, created_at, updated_at
    const { id, created_at, updated_at, ...relayDataToCopy } = existingRelay;
    
    // Modify the label to include "COPY"
    const originalLabel = relayDataToCopy.label || "Broker Relay";
    const duplicatedLabel = `${originalLabel} COPY`;

    // Create the new relay
    const { data: duplicatedRelay, error: createError } = await supabase
        .from("workflow_relay")
        .insert({
            ...relayDataToCopy,
            label: duplicatedLabel,
            workflow_id: workflowId,
            user_id: userId,
        })
        .select()
        .single();

    if (createError) throw new Error(`Failed to create duplicated relay: ${createError.message}`);
    return duplicatedRelay;
}

// ===== RPC-BASED DUPLICATION (TESTING) =====

/**
 * Duplicate a workflow node using RPC function (testing approach)
 */
export async function duplicateWorkflowNodeRPC(nodeId: string): Promise<WorkflowNodeData> {
    const { data, error } = await supabase.rpc('duplicate_row', {
        p_table_name: 'workflow_node',
        p_source_id: nodeId,
        p_excluded_columns: ['id', 'created_at', 'updated_at']
    });

    if (error) throw new Error(`Failed to duplicate node via RPC: ${error.message}`);
    if (!data) throw new Error("No data returned from RPC duplication");

    return data;
}

/**
 * Duplicate a workflow user input using RPC function (testing approach)
 */
export async function duplicateWorkflowUserInputRPC(inputId: string): Promise<WorkflowUserInputData> {
    const { data, error } = await supabase.rpc('duplicate_row', {
        p_table_name: 'workflow_user_input',
        p_source_id: inputId,
        p_excluded_columns: ['id', 'created_at', 'updated_at']
    });

    if (error) throw new Error(`Failed to duplicate user input via RPC: ${error.message}`);
    if (!data) throw new Error("No data returned from RPC duplication");

    return data;
}

/**
 * Duplicate a workflow relay using RPC function (testing approach)
 */
export async function duplicateWorkflowRelayRPC(relayId: string): Promise<WorkflowRelayData> {
    const { data, error } = await supabase.rpc('duplicate_row', {
        p_table_name: 'workflow_relay',
        p_source_id: relayId,
        p_excluded_columns: ['id', 'created_at', 'updated_at']
    });

    if (error) throw new Error(`Failed to duplicate relay via RPC: ${error.message}`);
    if (!data) throw new Error("No data returned from RPC duplication");

    return data;
}
