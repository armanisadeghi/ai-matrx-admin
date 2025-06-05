import { Node, Edge } from 'reactflow';
import { BaseNode } from '../types/backendTypes';
import { UserInputData } from '../react-flow/nodes/UserInputNode';
import { BrokerRelayData } from '../react-flow/nodes/BrokerRelayNode';
import { getNormalizedRegisteredFunctionNode, validateNodeUpdate } from '../utils.ts/node-utils';
import { 
  CompleteWorkflowData, 
  WorkflowNodeData, 
  WorkflowUserInputData, 
  WorkflowRelayData, 
  WorkflowEdgeData 
} from './workflowService';

// ===== DATABASE TO REACT FLOW =====

/**
 * Transform database workflow data to React Flow format
 */
export function transformDbToReactFlow(dbData: CompleteWorkflowData): {
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Transform workflow nodes
  dbData.nodes.forEach(dbNode => {
    nodes.push({
      id: dbNode.id,
      type: 'workflowNode',
      position: { x: dbNode.position_x, y: dbNode.position_y },
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
    });
  });

  // Transform user inputs
  // Note: We use default_value as the initial session value. Current session values 
  // are not persisted - only when explicitly saved does the session value become the new default_value
  dbData.userInputs.forEach(dbInput => {
    nodes.push({
      id: dbInput.id,
      type: 'workflowNode',
      position: { x: dbInput.position_x, y: dbInput.position_y },
      data: {
        id: dbInput.id,
        type: 'userInput',
        broker_id: dbInput.broker_id,
        value: dbInput.default_value, // Use default_value as the initial session value
        label: dbInput.label,
        data_type: dbInput.data_type
      } as UserInputData
    });
  });

  // Transform relays
  dbData.relays.forEach(dbRelay => {
    nodes.push({
      id: dbRelay.id,
      type: 'workflowNode', 
      position: { x: dbRelay.position_x, y: dbRelay.position_y },
      data: {
        id: dbRelay.id,
        type: 'brokerRelay',
        source: dbRelay.source_broker_id,
        targets: dbRelay.target_broker_ids,
        label: dbRelay.label
      } as BrokerRelayData
    });
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
    viewport: {
      x: dbData.workflow.viewport_x,
      y: dbData.workflow.viewport_y,
      zoom: dbData.workflow.viewport_zoom
    }
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
      position_x: node.position.x,
      position_y: node.position.y,
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
    position_x: node.position.x,
    position_y: node.position.y
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