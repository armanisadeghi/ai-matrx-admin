import { createSelector } from 'reselect';
import { RootState } from '../store';
import { WorkflowNodeData } from './types';

const selectWorkflowNodeSlice = (state: RootState) => state.workflowNodes;

// Basic state selectors
const selectAllNodes = createSelector(
  [selectWorkflowNodeSlice],
  (workflowNode) => workflowNode.nodes
);

const selectSelectedNodeId = createSelector(
  [selectWorkflowNodeSlice],
  (workflowNode) => workflowNode.selectedNodeId
);

const selectLoading = createSelector(
  [selectWorkflowNodeSlice],
  (workflowNode) => workflowNode.loading
);

const selectError = createSelector(
  [selectWorkflowNodeSlice],
  (workflowNode) => workflowNode.error
);

const selectDirtyNodes = createSelector(
  [selectWorkflowNodeSlice],
  (workflowNode) => workflowNode.dirtyNodes
);

const selectLastFetched = createSelector(
  [selectWorkflowNodeSlice],
  (workflowNode) => workflowNode.lastFetched
);

// Node by ID selector
const selectNodeById = createSelector(
  [selectAllNodes, (state: RootState, nodeId: string) => nodeId],
  (nodes, nodeId) => nodes[nodeId] || null
);

// Selected node selector
const selectSelectedNode = createSelector(
  [selectAllNodes, selectSelectedNodeId],
  (nodes, selectedNodeId) => selectedNodeId ? nodes[selectedNodeId] || null : null
);

// Node existence check
const selectNodeExists = createSelector(
  [selectAllNodes, (state: RootState, nodeId: string) => nodeId],
  (nodes, nodeId) => !!nodes[nodeId]
);

// Dirty state selectors
const selectIsNodeDirty = createSelector(
  [selectDirtyNodes, (state: RootState, nodeId: string) => nodeId],
  (dirtyNodes, nodeId) => dirtyNodes.includes(nodeId)
);

const selectHasDirtyNodes = createSelector(
  [selectDirtyNodes],
  (dirtyNodes) => dirtyNodes.length > 0
);

const selectDirtyNodeIds = createSelector(
  [selectDirtyNodes],
  (dirtyNodes) => [...dirtyNodes] // Return a copy of the array
);

// Array of all nodes
const selectAllNodesArray = createSelector(
  [selectAllNodes],
  (nodes) => Object.values(nodes)
);

// Nodes by workflow ID
const selectNodesByWorkflowId = createSelector(
  [selectAllNodesArray, (state: RootState, workflowId: string) => workflowId],
  (nodes, workflowId) => nodes.filter(node => node.workflow_id === workflowId)
);

// Nodes by type
const selectNodesByType = createSelector(
  [selectAllNodesArray, (state: RootState, nodeType: string) => nodeType],
  (nodes, nodeType) => nodes.filter(node => node.node_type === nodeType)
);

// Execution required nodes
const selectExecutionRequiredNodes = createSelector(
  [selectAllNodesArray],
  (nodes) => nodes.filter(node => node.execution_required)
);

// Cache-related selectors
const selectIsNodeStale = createSelector(
  [selectLastFetched, selectWorkflowNodeSlice, (state: RootState, nodeId: string) => nodeId],
  (lastFetched, workflowNode, nodeId) => {
    const fetchTime = lastFetched[nodeId];
    if (!fetchTime) return true;
    return Date.now() - fetchTime > workflowNode.staleTime;
  }
);

// Individual field selectors for a specific node
const selectNodeField = <K extends keyof WorkflowNodeData>(field: K) =>
  createSelector(
    [selectNodeById],
    (node): WorkflowNodeData[K] | null => node ? node[field] : null
  );

// Specific field selectors for selected node
const selectSelectedNodeField = <K extends keyof WorkflowNodeData>(field: K) =>
  createSelector(
    [selectSelectedNode],
    (node): WorkflowNodeData[K] | null => node ? node[field] : null
  );

// Data transformation selectors
const selectNodeDuplicationData = createSelector(
  [selectNodeById],
  (node) => {
    if (!node) return null;
    
    // Return node data without id, created_at, updated_at for duplication
    const { id, created_at, updated_at, ...duplicationData } = node;
    return duplicationData;
  }
);

const selectNodeSaveData = createSelector(
  [selectNodeById],
  (node) => {
    if (!node) return null;
    
    // Return full node data for saving
    return { ...node };
  }
);

const selectNodesSaveDataByWorkflowId = createSelector(
  [selectNodesByWorkflowId],
  (nodes) => nodes.map(node => ({ ...node }))
);

// Input/Output/Dependency specific selectors
const selectNodeInputs = createSelector(
  [selectNodeById],
  (node) => node?.inputs || null
);

const selectNodeOutputs = createSelector(
  [selectNodeById],
  (node) => node?.outputs || null
);

const selectNodeDependencies = createSelector(
  [selectNodeById],
  (node) => node?.dependencies || null
);

const selectNodeMetadata = createSelector(
  [selectNodeById],
  (node) => node?.metadata || null
);

const selectNodeRegisteredFunction = createSelector(
  [selectNodeMetadata],
  (metadata) => metadata?.registered_function || null
);

const selectNodeActive = createSelector(
  [selectNodeMetadata],
  (metadata) => metadata?.active === true
);

const selectNodeUiData = createSelector(
  [selectNodeById],
  (node) => node?.ui_data || null
);

// Input by arg name selector
const selectNodeInputByArgName = createSelector(
  [selectNodeInputs, (state: RootState, nodeId: string, argName: string) => argName],
  (inputs, argName) => inputs?.find(input => input.arg_name === argName) || null
);

export const workflowNodeSelectors = {
  // Basic state
  slice: selectWorkflowNodeSlice,
  allNodes: selectAllNodes,
  allNodesArray: selectAllNodesArray,
  selectedNodeId: selectSelectedNodeId,
  selectedNode: selectSelectedNode,
  loading: selectLoading,
  error: selectError,
  dirtyNodes: selectDirtyNodes,
  lastFetched: selectLastFetched,

  // Node by ID
  nodeById: selectNodeById,
  nodeExists: selectNodeExists,
  isNodeStale: selectIsNodeStale,

  // Dirty state
  isNodeDirty: selectIsNodeDirty,
  hasDirtyNodes: selectHasDirtyNodes,
  dirtyNodeIds: selectDirtyNodeIds,

  // Filtered nodes
  nodesByWorkflowId: selectNodesByWorkflowId,
  nodesByType: selectNodesByType,
  executionRequiredNodes: selectExecutionRequiredNodes,

  // Data transformation
  nodeDuplicationData: selectNodeDuplicationData,
  nodeSaveData: selectNodeSaveData,
  nodesSaveDataByWorkflowId: selectNodesSaveDataByWorkflowId,

  // Node fields (require nodeId parameter)
  nodeInputs: selectNodeInputs,
  nodeOutputs: selectNodeOutputs,
  nodeDependencies: selectNodeDependencies,
  nodeMetadata: selectNodeMetadata,
  nodeRegisteredFunction: selectNodeRegisteredFunction,
  nodeActive: selectNodeActive,
  nodeUiData: selectNodeUiData,
  nodeInputByArgName: selectNodeInputByArgName,

  // Field selectors (factory functions)
  nodeField: selectNodeField,
  selectedNodeField: selectSelectedNodeField,

  // Backward compatibility - these create selectors that require nodeId
  workflowId: (nodeId: string) => createSelector([selectNodeById], (node) => node?.workflow_id || null),
  functionId: (nodeId: string) => createSelector([selectNodeById], (node) => node?.function_id || null),
  type: (nodeId: string) => createSelector([selectNodeById], (node) => node?.type || null),
  stepName: (nodeId: string) => createSelector([selectNodeById], (node) => node?.step_name || null),
  nodeType: (nodeId: string) => createSelector([selectNodeById], (node) => node?.node_type || null),
  executionRequired: (nodeId: string) => createSelector([selectNodeById], (node) => node?.execution_required || null),
  isPublic: (nodeId: string) => createSelector([selectNodeById], (node) => node?.is_public || null),
  authenticatedRead: (nodeId: string) => createSelector([selectNodeById], (node) => node?.authenticated_read || null),
  publicRead: (nodeId: string) => createSelector([selectNodeById], (node) => node?.public_read || null),
  createdAt: (nodeId: string) => createSelector([selectNodeById], (node) => node?.created_at || null),
  updatedAt: (nodeId: string) => createSelector([selectNodeById], (node) => node?.updated_at || null),
  userId: (nodeId: string) => createSelector([selectNodeById], (node) => node?.user_id || null),
};