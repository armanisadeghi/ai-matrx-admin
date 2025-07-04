import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Node } from '@xyflow/react';

const selectWorkflowNodeState = (state: RootState) => state.workflowNodes;

export const selectAllWorkflowNodes = createSelector(
  [selectWorkflowNodeState],
  (nodeState) => nodeState.ids.map(id => nodeState.entities[id])
);

export const selectWorkflowNodeById = createSelector(
  [selectWorkflowNodeState, (state: RootState, id: string) => id],
  (nodeState, id) => nodeState.entities[id] || null
);

export const selectActiveWorkflowNode = createSelector(
  [selectWorkflowNodeState],
  (nodeState) => 
    nodeState.activeId ? nodeState.entities[nodeState.activeId] : null
);

export const selectSelectedWorkflowNodes = createSelector(
  [selectWorkflowNodeState],
  (nodeState) => 
    nodeState.selectedIds.map(id => nodeState.entities[id]).filter(Boolean)
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
  [selectWorkflowNodeState, (state: RootState, id: string) => id],
  (nodeState, id) => nodeState.isDirty[id] || false
);

export const selectWorkflowNodeStatus = createSelector(
  [selectWorkflowNodeState, (state: RootState, id: string) => id],
  (nodeState, id) => nodeState.status[id] || 'pending'
);

export const selectWorkflowNodeResults = createSelector(
  [selectWorkflowNodeState, (state: RootState, id: string) => id],
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

export const selectWorkflowNodesByWorkflowId = createSelector(
  [selectAllWorkflowNodes],
  (allNodes) => (workflowId: string) => 
    allNodes.filter(node => node.workflow_id === workflowId)
);

// New selector: Extract ui_data and return ReactFlow Node[] - no transformations needed
export const selectXyFlowNodesByWorkflowId = createSelector(
  [selectWorkflowNodesByWorkflowId],
  (getNodesByWorkflowId) => (workflowId: string): Node[] => {
    const nodes = getNodesByWorkflowId(workflowId);
    return nodes
      .filter(node => node.ui_data) // Only nodes with ui_data
      .map(node => ({
        ...node.ui_data!, // Spread ui_data (Omit<Node, "data">)
        id: node.id, // Add back the id from WorkflowNode
        // No data property - ui_data explicitly excludes it
      })) as Node[];
  }
);

export const selectWorkflowNodesByType = createSelector(
  [selectAllWorkflowNodes, (state: RootState, nodeType: string) => nodeType],
  (nodes, nodeType) => nodes.filter(node => node.node_type === nodeType)
);

export const selectExecutionRequiredNodes = createSelector(
  [selectAllWorkflowNodes],
  (nodes) => nodes.filter(node => node.execution_required)
);

export const selectWorkflowNodesByFunctionId = createSelector(
  [selectAllWorkflowNodes, (state: RootState, functionId: string) => functionId],
  (nodes, functionId) => nodes.filter(node => node.function_id === functionId)
);

export const selectWorkflowNodesByStatus = createSelector(
  [selectAllWorkflowNodes, selectWorkflowNodeState],
  (nodes, nodeState) => (status: string) => 
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

// Complex Array Selectors for Workflow Nodes
export const selectWorkflowNodeInputs = createSelector(
  [selectWorkflowNodeById],
  (node) => node?.inputs || []
);

export const selectWorkflowNodeOutputs = createSelector(
  [selectWorkflowNodeById],
  (node) => node?.outputs || []
);

export const selectWorkflowNodeDependencies = createSelector(
  [selectWorkflowNodeById],
  (node) => node?.dependencies || []
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

// Simple utility selectors
export const selectWorkflowNodeInputById = createSelector(
  [selectWorkflowNodeInputs, (state: RootState, nodeId: string, index: number) => index],
  (inputs, index) => inputs[index] || null
);

export const selectWorkflowNodeOutputById = createSelector(
  [selectWorkflowNodeOutputs, (state: RootState, nodeId: string, index: number) => index],
  (outputs, index) => outputs[index] || null
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
  
  // Filter selectors
  nodesByWorkflowId: selectWorkflowNodesByWorkflowId,
  xyFlowNodesByWorkflowId: selectXyFlowNodesByWorkflowId,
  nodesByType: selectWorkflowNodesByType,
  nodesByStatus: selectWorkflowNodesByStatus,
  executionRequiredNodes: selectExecutionRequiredNodes,
  nodesByFunctionId: selectWorkflowNodesByFunctionId,
  
  // Node array property selectors
  nodeInputs: selectWorkflowNodeInputs,
  nodeOutputs: selectWorkflowNodeOutputs,
  nodeDependencies: selectWorkflowNodeDependencies,
  
  // Active node array property selectors
  activeNodeInputs: selectActiveWorkflowNodeInputs,
  activeNodeOutputs: selectActiveWorkflowNodeOutputs,
  activeNodeDependencies: selectActiveWorkflowNodeDependencies,
  
  // Utility selectors
  nodeInputById: selectWorkflowNodeInputById,
  nodeOutputById: selectWorkflowNodeOutputById,
};