import { Node, Edge } from 'reactflow';
import { BaseNode, UserInputData, BrokerRelayData } from "@/features/workflows/types";
import { getNormalizedRegisteredFunctionNode, validateNodeUpdate } from '@/features/workflows/utils/node-utils';
import { getIntelligentNodePosition } from '@/features/workflows/utils/nodePositioning';
import {
  CoreWorkflowData,
  CompleteWorkflowData,
  WorkflowNodeData,
  WorkflowUserInputData,
  WorkflowRelayData,
  WorkflowEdgeData,
} from "@/features/workflows/types";

// ===== DATABASE TO REACT FLOW =====

/**
 * Transform database workflow data to React Flow format
 */
export function transformDbToReactFlow(dbData: CompleteWorkflowData): {
  nodes: Node[];
  edges: Edge[];
  userInputs: WorkflowUserInputData[];
  relays: WorkflowRelayData[];
  coreWorkflowData: CoreWorkflowData;
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const userInputs: WorkflowUserInputData[] = [];
  const relays: WorkflowRelayData[] = [];
  
  // Keep track of nodes as we create them for intelligent positioning
  const processedNodes: Node[] = [];

  // Transform workflow nodes
  dbData.nodes.forEach(dbNode => {
    // Use ui_node_data if available, otherwise create node with intelligent position
    const nodeFromDb = dbNode.ui_node_data || {
      id: dbNode.id,
      type: 'workflowNode',
      position: getIntelligentNodePosition(processedNodes, dbData.workflow.viewport),
      data: {}
    };

    const newNode = {
      ...nodeFromDb,
      id: dbNode.id, // Ensure ID matches database
      type: 'workflowNode',
      data: {
        id: dbNode.id,
        function_id: dbNode.function_id,
        function_type: dbNode.function_type,
        step_name: dbNode.step_name,
        execution_required: dbNode.execution_required,
        additional_dependencies: dbNode.additional_dependencies,
        arg_mapping: dbNode.arg_mapping,
        return_broker_overrides: dbNode.return_broker_overrides,
        arg_overrides: dbNode.arg_overrides,
        workflow_id: undefined, // This is set at the workflow level, not node level in UI
        status: dbNode.status
      } as BaseNode
    };
    
    nodes.push(newNode);
    processedNodes.push(newNode);
  });

  // Transform user inputs
  // Note: We use default_value as the initial session value. Current session values 
  // are not persisted - only when explicitly saved does the session value become the new default_value
  dbData.userInputs.forEach(dbInput => {
    // Use ui_node_data if available, otherwise create node with intelligent position
    const nodeFromDb = dbInput.ui_node_data || {
      id: dbInput.id,
      type: 'workflowNode',
      position: getIntelligentNodePosition(processedNodes, dbData.workflow.viewport),
      data: {}
    };

    const newNode = {
      ...nodeFromDb,
      id: dbInput.id, // Ensure ID matches database
      type: 'workflowNode',
      data: {
        id: dbInput.id,
        type: 'userInput',
        broker_id: dbInput.broker_id,
        value: dbInput.default_value, // Use default_value as the initial session value
        label: dbInput.label,
        data_type: dbInput.data_type
      } as UserInputData
    };
    
    nodes.push(newNode);
    processedNodes.push(newNode);
  });

  // Transform relays
  dbData.relays.forEach(dbRelay => {
    // Use ui_node_data if available, otherwise create node with intelligent position
    const nodeFromDb = dbRelay.ui_node_data || {
      id: dbRelay.id,
      type: 'workflowNode',
      position: getIntelligentNodePosition(processedNodes, dbData.workflow.viewport),
      data: {}
    };

    const newNode = {
      ...nodeFromDb,
      id: dbRelay.id, // Ensure ID matches database
      type: 'workflowNode',
      data: {
        id: dbRelay.id,
        type: 'brokerRelay',
        source: dbRelay.source_broker_id,
        targets: dbRelay.target_broker_ids,
        label: dbRelay.label
      } as BrokerRelayData
    };
    
    nodes.push(newNode);
    processedNodes.push(newNode);
  });

  // Transform edges
  dbData.edges.forEach(dbEdge => {
    edges.push({
      id: dbEdge.id,
      source: dbEdge.source_node_id,
      target: dbEdge.target_node_id,
      sourceHandle: dbEdge.source_handle,
      targetHandle: dbEdge.target_handle,
      type: dbEdge.edge_type,
      animated: dbEdge.animated,
      style: dbEdge.style
    });
  });

  return {
    nodes,
    edges,
    userInputs,
    relays,
    coreWorkflowData: dbData.workflow,
  };
}

// ===== REACT FLOW TO DATABASE =====

/**
 * Transform React Flow node to database format
 */
export function transformNodeToDb(node: Node, workflowId: string): 
  { type: 'workflow'; data: Partial<WorkflowNodeData> } |
  { type: 'userInput'; data: Partial<WorkflowUserInputData> } |
  { type: 'relay'; data: Partial<WorkflowRelayData> } {
  
  // Defensive check for node.data
  if (!node.data) {
    console.warn('Node missing data property:', node.id);
    // ✅ Try to create a normalized node if we have a function_id, otherwise fallback
    const fallbackNode = {
      id: node.id,
      ui_node_data: node, // Store the complete React Flow node object
      function_id: null,
      function_type: 'registered_function',
      step_name: null,
      node_type: 'workflowNode',
      execution_required: false,
      additional_dependencies: [],
      arg_mapping: [],
      return_broker_overrides: [],
      arg_overrides: [],
      status: 'pending'
    };
    
    return {
      type: 'workflow',
      data: fallbackNode
    };
  }
  
  const baseTransform = {
    id: node.data.id || node.id, // Fallback to node.id if data.id is missing
    ui_node_data: node // Store the complete React Flow node object
  };

  if (node.data.type === 'userInput') {
    const userInputData: Partial<WorkflowUserInputData> = {
      ...baseTransform,
      broker_id: node.data.broker_id,
      label: node.data.label,
      data_type: node.data.data_type || 'string',
      default_value: node.data.value, // Save the current session value as the new default
      is_required: false,
      field_component_id: null // ✅ UUID foreign key to field_components table
    };
    
    return {
      type: 'userInput',
      data: userInputData
    };
  }

  if (node.data.type === 'brokerRelay') {
    return {
      type: 'relay',
      data: {
        ...baseTransform,
        source_broker_id: node.data.source,
        target_broker_ids: node.data.targets || [],
        label: node.data.label
      }
    };
  }

  // Default to workflow node
  const baseNodeData = node.data as BaseNode;
  
  // ✅ Use your node-utils validation
  if (baseNodeData.function_id) {
    try {
      validateNodeUpdate(baseNodeData);
    } catch (error) {
      console.warn('Node validation failed:', error);
    }
  }

  return {
    type: 'workflow',
    data: {
      ...baseTransform,
      // ✅ EXACT BaseNode field mapping - no extra fields
      function_id: baseNodeData.function_id || null,
      function_type: baseNodeData.function_type || 'registered_function',
      step_name: baseNodeData.step_name || null,
      node_type: 'workflowNode', // UI field, not in BaseNode
      execution_required: baseNodeData.execution_required || false,
      additional_dependencies: baseNodeData.additional_dependencies || [],
      arg_mapping: baseNodeData.arg_mapping || [],
      return_broker_overrides: baseNodeData.return_broker_overrides || [],
      arg_overrides: baseNodeData.arg_overrides || [],
      status: baseNodeData.status || 'pending'
    }
  };
}

/**
 * Transform React Flow edge to database format
 */
export function transformEdgeToDb(edge: Edge): Partial<WorkflowEdgeData> {
  return {
    id: edge.id,
    source_node_id: edge.source,
    target_node_id: edge.target,
    source_handle: edge.sourceHandle,
    target_handle: edge.targetHandle,
    edge_type: edge.type || 'default',
    animated: edge.animated || false,
    style: edge.style || null
  };
}

// ===== UTILITY FUNCTIONS =====

/**
 * Extract workflow nodes for socket execution (filters out userInput/relay nodes)
 */
export function extractExecutionNodes(nodes: Node[]): BaseNode[] {
  return nodes
    .filter(node => !node.data.type || (node.data.type !== 'userInput' && node.data.type !== 'brokerRelay'))
    .map(node => node.data as BaseNode);
}

/**
 * Extract user inputs for socket execution
 */
export function extractUserInputs(nodes: Node[]): Array<{broker_id: string; value: any}> {
  return nodes
    .filter(node => node.data.type === 'userInput')
    .map(node => ({
      broker_id: node.data.broker_id,
      value: node.data.value || ""
    }));
}

/**
 * Extract relays for socket execution
 */
export function extractRelays(nodes: Node[]): Array<{source: string; targets: string[]}> {
  return nodes
    .filter(node => node.data.type === 'brokerRelay')
    .map(node => ({
      source: node.data.source,
      targets: node.data.targets || []
    }));
}

/**
 * Helper function to save user input session values as persistent defaults
 * Call this when you want to persist the current session values
 */
export function prepareUserInputsForSaving(nodes: Node[]): Array<{ id: string; default_value: string }> {
  return nodes
    .filter(node => node.data.type === 'userInput')
    .map(node => ({
      id: node.data.id,
      default_value: node.data.value || ""
    }));
} 