import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Node } from '@xyflow/react';
import { RegisteredNodeData } from '@/types/AutomationSchemaTypes';

const selectWorkflowNodeState = (state: RootState) => state.workflowNodes;

// FIXED: Memoized selector to avoid array creation on every call
export const selectAllWorkflowNodes = createSelector(
  [selectWorkflowNodeState],
  (nodeState) => {
    const nodes = nodeState.ids.map(id => nodeState.entities[id]);
    return nodes;
  }
);

export const selectWorkflowNodeById = createSelector(
  [selectWorkflowNodeState, (_: RootState, id: string) => id],
  (nodeState, id) => nodeState.entities[id] || null
);

export const selectActiveWorkflowNode = createSelector(
  [selectWorkflowNodeState],
  (nodeState) => 
    nodeState.activeId ? nodeState.entities[nodeState.activeId] : null
);

// FIXED: Memoized selector to avoid array creation on every call
export const selectSelectedWorkflowNodes = createSelector(
  [selectWorkflowNodeState],
  (nodeState) => {
    const selectedNodes = nodeState.selectedIds.map(id => nodeState.entities[id]).filter(Boolean);
    return selectedNodes;
  }
);

export const selectWorkflowNodesIsLoading = createSelector(
  [selectWorkflowNodeState],
  (nodeState) => nodeState.isLoading
);

export const selectWorkflowNodesError = createSelector(
  [selectWorkflowNodeState],
  (nodeState) => nodeState.error
);

export const selectWorkflowNodeIsDirty = createSelector(
  [selectWorkflowNodeState, (_: RootState, id: string) => id],
  (nodeState, id) => nodeState.isDirty[id] || false
);

export const selectWorkflowNodeStatus = createSelector(
  [selectWorkflowNodeState, (_: RootState, id: string) => id],
  (nodeState, id) => nodeState.status[id] || 'pending'
);

export const selectWorkflowNodeResults = createSelector(
  [selectWorkflowNodeState, (_: RootState, id: string) => id],
  (nodeState, id) => nodeState.results[id] || null
);

export const selectWorkflowNodesDataFreshness = createSelector(
  [selectWorkflowNodeState],
  (nodeState) => ({
    fetchTimestamp: nodeState.fetchTimestamp,
    dataFetched: nodeState.dataFetched,
    isStale: nodeState.fetchTimestamp ? 
      Date.now() - nodeState.fetchTimestamp > 5 * 60 * 1000 : true // 5 minutes
  })
);

// FIXED: Properly parameterized selector that accepts workflowId
export const selectWorkflowNodesByWorkflowId = createSelector(
  [selectAllWorkflowNodes, (_: RootState, workflowId: string) => workflowId],
  (allNodes, workflowId) => 
    allNodes.filter(node => node.workflow_id === workflowId)
);

// FIXED: Properly parameterized selector that accepts workflowId for XyFlow nodes
export const selectXyFlowNodesByWorkflowId = createSelector(
  [selectWorkflowNodesByWorkflowId],
  (workflowNodes): Node[] => {
    return workflowNodes
      .filter(node => node.ui_data) // Only nodes with ui_data
      .map(node => ({
        ...node.ui_data!, // Spread ui_data (Omit<Node, "data">)
        id: node.id, // Add back the id from WorkflowNode
        // No data property - ui_data explicitly excludes it
      })) as Node[];
  }
);

// FIXED: Properly parameterized selector that accepts nodeType
export const selectWorkflowNodesByType = createSelector(
  [selectAllWorkflowNodes, (_: RootState, nodeType: string) => nodeType],
  (nodes, nodeType) => nodes.filter(node => node.node_type === nodeType)
);

// FIXED: Memoized selector to avoid array creation
export const selectExecutionRequiredNodes = createSelector(
  [selectAllWorkflowNodes],
  (nodes) => nodes.filter(node => node.execution_required)
);

// FIXED: Properly parameterized selector that accepts functionId
export const selectWorkflowNodesByFunctionId = createSelector(
  [selectAllWorkflowNodes, (_: RootState, functionId: string) => functionId],
  (nodes, functionId) => nodes.filter(node => node.function_id === functionId)
);

// FIXED: Properly parameterized selector that accepts status
export const selectWorkflowNodesByStatus = createSelector(
  [selectAllWorkflowNodes, selectWorkflowNodeState, (_: RootState, status: string) => status],
  (nodes, nodeState, status) => 
    nodes.filter(node => (nodeState.status[node.id] || 'pending') === status)
);

export const selectAllWorkflowNodeStatuses = createSelector(
  [selectWorkflowNodeState],
  (nodeState) => nodeState.status
);

export const selectAllWorkflowNodeResults = createSelector(
  [selectWorkflowNodeState],
  (nodeState) => nodeState.results
);

// FIXED: Complex Array Selectors that properly accept node ID parameter
export const selectWorkflowNodeInputs = createSelector(
  [selectWorkflowNodeState, (_: RootState, id: string) => id],
  (nodeState, id) => nodeState.entities[id]?.inputs || []
);

export const selectWorkflowNodeOutputs = createSelector(
  [selectWorkflowNodeState, (_: RootState, id: string) => id],
  (nodeState, id) => nodeState.entities[id]?.outputs || []
);

export const selectWorkflowNodeDependencies = createSelector(
  [selectWorkflowNodeState, (_: RootState, id: string) => id],
  (nodeState, id) => nodeState.entities[id]?.dependencies || []
);

// Active Node Complex Array Selectors
export const selectActiveWorkflowNodeInputs = createSelector(
  [selectActiveWorkflowNode],
  (node) => node?.inputs || []
);

export const selectActiveWorkflowNodeOutputs = createSelector(
  [selectActiveWorkflowNode],
  (node) => node?.outputs || []
);

export const selectActiveWorkflowNodeDependencies = createSelector(
  [selectActiveWorkflowNode],
  (node) => node?.dependencies || []
);

// FIXED: Utility selectors with proper input selectors
export const selectWorkflowNodeInputById = createSelector(
  [selectWorkflowNodeInputs, (_: RootState, __: string, index: number) => index],
  (inputs, index) => inputs[index] || null
);

export const selectWorkflowNodeOutputById = createSelector(
  [selectWorkflowNodeOutputs, (_: RootState, __: string, index: number) => index],
  (outputs, index) => outputs[index] || null
);

// Safe metadata selectors
export const selectWorkflowNodeMetadata = createSelector(
  [selectWorkflowNodeById],
  (node) => node?.metadata || null
);

export const selectWorkflowNodeDefinition = createSelector(
  [selectWorkflowNodeMetadata],
  (metadata) => metadata?.nodeDefinition as RegisteredNodeData || null
);

// ADDITIONAL: Factory functions for creating parameterized selectors
export const createWorkflowNodesByWorkflowIdSelector = (workflowId: string) =>
  createSelector(
    [selectAllWorkflowNodes],
    (allNodes) => allNodes.filter(node => node.workflow_id === workflowId)
  );

export const createXyFlowNodesByWorkflowIdSelector = (workflowId: string) =>
  createSelector(
    [createWorkflowNodesByWorkflowIdSelector(workflowId)],
    (workflowNodes): Node[] => {
      return workflowNodes
        .filter(node => node.ui_data)
        .map(node => ({
          ...node.ui_data!,
          id: node.id,
        })) as Node[];
    }
  );

export const workflowNodesSelectors = {
  // Basic node selectors
  allNodes: selectAllWorkflowNodes,
  nodeById: selectWorkflowNodeById,
  activeNode: selectActiveWorkflowNode,
  selectedNodes: selectSelectedWorkflowNodes,
  
  // State selectors
  isLoading: selectWorkflowNodesIsLoading,
  error: selectWorkflowNodesError,
  isNodeDirty: selectWorkflowNodeIsDirty,
  dataFreshness: selectWorkflowNodesDataFreshness,
  
  // Status and Results selectors
  nodeStatus: selectWorkflowNodeStatus,
  nodeResults: selectWorkflowNodeResults,
  allStatuses: selectAllWorkflowNodeStatuses,
  allResults: selectAllWorkflowNodeResults,
  
  // Filter selectors (require parameters)
  nodesByWorkflowId: selectWorkflowNodesByWorkflowId,
  xyFlowNodesByWorkflowId: selectXyFlowNodesByWorkflowId,
  nodesByType: selectWorkflowNodesByType,
  nodesByStatus: selectWorkflowNodesByStatus,
  executionRequiredNodes: selectExecutionRequiredNodes,
  nodesByFunctionId: selectWorkflowNodesByFunctionId,
  
  // Node array property selectors (require node ID parameter)
  nodeInputs: selectWorkflowNodeInputs,
  nodeOutputs: selectWorkflowNodeOutputs,
  nodeDependencies: selectWorkflowNodeDependencies,
  
  // Active node array property selectors (no ID needed)
  activeNodeInputs: selectActiveWorkflowNodeInputs,
  activeNodeOutputs: selectActiveWorkflowNodeOutputs,
  activeNodeDependencies: selectActiveWorkflowNodeDependencies,
  
  // Utility selectors (require node ID parameter)
  nodeInputById: selectWorkflowNodeInputById,
  nodeOutputById: selectWorkflowNodeOutputById,

  // Safe metadata selectors
  nodeMetadata: selectWorkflowNodeMetadata,
  nodeDefinition: selectWorkflowNodeDefinition,
  
  // Factory functions for creating parameterized selectors
  createNodesByWorkflowIdSelector: createWorkflowNodesByWorkflowIdSelector,
  createXyFlowNodesByWorkflowIdSelector: createXyFlowNodesByWorkflowIdSelector,
};