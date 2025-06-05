import { supabase } from "@/utils/supabase/client";
import { WorkflowDependency, ArgumentMapping, ArgumentOverride } from "@/features/workflows/types/backendTypes";

// ===== TYPES =====

export interface WorkflowData {
  id: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  name: string;
  description: string | null;
  viewport_x: number;
  viewport_y: number;
  viewport_zoom: number;
  auto_execute: boolean;
  tags: string[] | null;
  category: string | null;
}

export interface WorkflowNodeData {
  id: string;
  created_at?: string;
  updated_at?: string;
  workflow_id?: string;
  user_id?: string;
  function_id: string | null;
  function_type: string | null;
  step_name: string | null;
  position_x: number;
  position_y: number;
  width: number | null;
  height: number | null;
  node_type: string;
  execution_required: boolean;
  additional_dependencies: WorkflowDependency[];
  arg_mapping: ArgumentMapping[];
  return_broker_overrides: string[];
  arg_overrides: ArgumentOverride[];
  status: string;
}

export interface WorkflowUserInputData {
  id: string;
  created_at?: string;
  updated_at?: string;
  workflow_id?: string;
  user_id?: string;
  broker_id: string;
  label: string | null;
  data_type: 'int' | 'float' | 'str' | 'bool' | 'list' | 'tuple' | 'dict' | 'set';
  default_value: string | null;
  position_x: number;
  position_y: number;
  is_required: boolean;
  field_component_id: string | null;
}

export interface WorkflowRelayData {
  id: string;
  created_at?: string;
  updated_at?: string;
  workflow_id?: string;
  user_id?: string;
  source_broker_id: string;
  target_broker_ids: string[];
  label: string | null;
  position_x: number;
  position_y: number;
}

export interface WorkflowEdgeData {
  id: string;
  created_at?: string;
  updated_at?: string;
  workflow_id?: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: string | null;
  target_handle: string | null;
  edge_type: string;
  animated: boolean;
  style: Record<string, any> | null;
}

export interface CompleteWorkflowData {
  workflow: WorkflowData;
  nodes: WorkflowNodeData[];
  userInputs: WorkflowUserInputData[];
  relays: WorkflowRelayData[];
  edges: WorkflowEdgeData[];
}

// ===== FETCH OPERATIONS =====

/**
 * Fetch all workflows for a user
 */
export async function fetchUserWorkflows(userId: string): Promise<WorkflowData[]> {
  const { data, error } = await supabase
    .from('workflow')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch workflows: ${error.message}`);
  return data || [];
}

/**
 * Fetch complete workflow data by ID
 */
export async function fetchWorkflowById(workflowId: string): Promise<CompleteWorkflowData> {
  const [workflowResult, nodesResult, userInputsResult, relaysResult, edgesResult] = await Promise.all([
    supabase.from('workflow').select('*').eq('id', workflowId).single(),
    supabase.from('workflow_node').select('*').eq('workflow_id', workflowId),
    supabase.from('workflow_user_input').select('*').eq('workflow_id', workflowId),
    supabase.from('workflow_relay').select('*').eq('workflow_id', workflowId),
    supabase.from('workflow_edge').select('*').eq('workflow_id', workflowId)
  ]);

  if (workflowResult.error) throw new Error(`Failed to fetch workflow: ${workflowResult.error.message}`);
  if (nodesResult.error) throw new Error(`Failed to fetch nodes: ${nodesResult.error.message}`);
  if (userInputsResult.error) throw new Error(`Failed to fetch user inputs: ${userInputsResult.error.message}`);
  if (relaysResult.error) throw new Error(`Failed to fetch relays: ${relaysResult.error.message}`);
  if (edgesResult.error) throw new Error(`Failed to fetch edges: ${edgesResult.error.message}`);

  return {
    workflow: workflowResult.data,
    nodes: nodesResult.data || [],
    userInputs: userInputsResult.data || [],
    relays: relaysResult.data || [],
    edges: edgesResult.data || []
  };
}

// ===== SAVE OPERATIONS =====

/**
 * Create a new workflow
 */
export async function createWorkflow(userId: string, data: Partial<WorkflowData>): Promise<WorkflowData> {
  const { data: workflow, error } = await supabase
    .from('workflow')
    .insert({
      user_id: userId,
      name: data.name || 'Untitled Workflow',
      description: data.description || null,
      viewport_x: data.viewport_x || 0,
      viewport_y: data.viewport_y || 0,
      viewport_zoom: data.viewport_zoom || 1,
      auto_execute: data.auto_execute || false,
      tags: data.tags || null,
      category: data.category || null
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create workflow: ${error.message}`);
  return workflow;
}

/**
 * Update workflow metadata
 */
export async function updateWorkflow(workflowId: string, data: Partial<WorkflowData>): Promise<WorkflowData> {
  const { data: workflow, error } = await supabase
    .from('workflow')
    .update(data)
    .eq('id', workflowId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update workflow: ${error.message}`);
  return workflow;
}

/**
 * Save workflow viewport (position and zoom)
 */
export async function saveWorkflowViewport(workflowId: string, viewport: { x: number; y: number; zoom: number }): Promise<void> {
  const { error } = await supabase
    .from('workflow')
    .update({
      viewport_x: viewport.x,
      viewport_y: viewport.y,
      viewport_zoom: viewport.zoom
    })
    .eq('id', workflowId);

  if (error) throw new Error(`Failed to save viewport: ${error.message}`);
}

// ===== NODE OPERATIONS =====

/**
 * Save workflow node
 */
export async function saveWorkflowNode(workflowId: string, userId: string, nodeData: Partial<WorkflowNodeData>): Promise<WorkflowNodeData> {
  const isUpdate = !!nodeData.id;
  
  if (isUpdate) {
    const { data: node, error } = await supabase
      .from('workflow_node')
      .update(nodeData)
      .eq('id', nodeData.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update node: ${error.message}`);
    return node;
  } else {
    const { data: node, error } = await supabase
      .from('workflow_node')
      .insert({
        ...nodeData,
        workflow_id: workflowId,
        user_id: userId
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create node: ${error.message}`);
    return node;
  }
}

/**
 * Delete workflow node
 */
export async function deleteWorkflowNode(nodeId: string): Promise<void> {
  const { error } = await supabase
    .from('workflow_node')
    .delete()
    .eq('id', nodeId);

  if (error) throw new Error(`Failed to delete node: ${error.message}`);
}

// ===== USER INPUT OPERATIONS =====

/**
 * Save workflow user input
 */
export async function saveWorkflowUserInput(workflowId: string, userId: string, inputData: Partial<WorkflowUserInputData>): Promise<WorkflowUserInputData> {
  const isUpdate = !!inputData.id;
  
  if (isUpdate) {
    const { data: userInput, error } = await supabase
      .from('workflow_user_input')
      .update(inputData)
      .eq('id', inputData.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user input: ${error.message}`);
    return userInput;
  } else {
    const { data: userInput, error } = await supabase
      .from('workflow_user_input')
      .insert({
        ...inputData,
        workflow_id: workflowId,
        user_id: userId
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create user input: ${error.message}`);
    return userInput;
  }
}

/**
 * Delete workflow user input
 */
export async function deleteWorkflowUserInput(inputId: string): Promise<void> {
  const { error } = await supabase
    .from('workflow_user_input')
    .delete()
    .eq('id', inputId);

  if (error) throw new Error(`Failed to delete user input: ${error.message}`);
}

// ===== RELAY OPERATIONS =====

/**
 * Save workflow relay
 */
export async function saveWorkflowRelay(workflowId: string, userId: string, relayData: Partial<WorkflowRelayData>): Promise<WorkflowRelayData> {
  const isUpdate = !!relayData.id;
  
  if (isUpdate) {
    const { data: relay, error } = await supabase
      .from('workflow_relay')
      .update(relayData)
      .eq('id', relayData.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update relay: ${error.message}`);
    return relay;
  } else {
    const { data: relay, error } = await supabase
      .from('workflow_relay')
      .insert({
        ...relayData,
        workflow_id: workflowId,
        user_id: userId
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create relay: ${error.message}`);
    return relay;
  }
}

/**
 * Delete workflow relay
 */
export async function deleteWorkflowRelay(relayId: string): Promise<void> {
  const { error } = await supabase
    .from('workflow_relay')
    .delete()
    .eq('id', relayId);

  if (error) throw new Error(`Failed to delete relay: ${error.message}`);
}

// ===== EDGE OPERATIONS =====

/**
 * Save workflow edge
 */
export async function saveWorkflowEdge(workflowId: string, edgeData: Partial<WorkflowEdgeData>): Promise<WorkflowEdgeData> {
  const isUpdate = !!edgeData.id;
  
  if (isUpdate) {
    const { data: edge, error } = await supabase
      .from('workflow_edge')
      .update(edgeData)
      .eq('id', edgeData.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update edge: ${error.message}`);
    return edge;
  } else {
    const { data: edge, error } = await supabase
      .from('workflow_edge')
      .insert({
        ...edgeData,
        workflow_id: workflowId
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create edge: ${error.message}`);
    return edge;
  }
}

/**
 * Delete workflow edge
 */
export async function deleteWorkflowEdge(edgeId: string): Promise<void> {
  const { error } = await supabase
    .from('workflow_edge')
    .delete()
    .eq('id', edgeId);

  if (error) throw new Error(`Failed to delete edge: ${error.message}`);
}

// ===== BATCH OPERATIONS =====

/**
 * Save complete workflow data (useful for bulk updates)
 */
export async function saveCompleteWorkflow(workflowId: string, userId: string, data: {
  workflow?: Partial<WorkflowData>;
  nodes?: WorkflowNodeData[];
  userInputs?: WorkflowUserInputData[];
  relays?: WorkflowRelayData[];
  edges?: WorkflowEdgeData[];
}): Promise<void> {
  const operations: Promise<any>[] = [];

  if (data.workflow) {
    operations.push(updateWorkflow(workflowId, data.workflow));
  }

  // For now, we'll do individual saves. Could optimize with batch operations later if needed.
  if (data.nodes) {
    operations.push(...data.nodes.map(node => saveWorkflowNode(workflowId, userId, node)));
  }

  if (data.userInputs) {
    operations.push(...data.userInputs.map(input => saveWorkflowUserInput(workflowId, userId, input)));
  }

  if (data.relays) {
    operations.push(...data.relays.map(relay => saveWorkflowRelay(workflowId, userId, relay)));
  }

  if (data.edges) {
    operations.push(...data.edges.map(edge => saveWorkflowEdge(workflowId, edge)));
  }

  await Promise.all(operations);
} 