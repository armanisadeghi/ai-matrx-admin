import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { DbFunctionNode, WorkflowDependency, ArgumentMapping, ArgumentOverride } from '@/features/workflows/types';

// ============================================================================
// BASE SELECTORS
// ============================================================================

/** Get the entire dbFunctionNode state */
export const selectDbFunctionNodeState = (state: RootState) => state.dbFunctionNode;

/** Get all nodes as a record */
export const selectAllNodes = createSelector(
  [selectDbFunctionNodeState],
  (dbFunctionNodeState) => dbFunctionNodeState.nodes
);

/** Get all nodes as an array */
export const selectAllNodesArray = createSelector(
  [selectAllNodes],
  (nodes) => Object.values(nodes)
);

/** Get all node IDs */
export const selectAllNodeIds = createSelector(
  [selectAllNodes],
  (nodes) => Object.keys(nodes)
);

/** Get the count of nodes */
export const selectNodeCount = createSelector(
  [selectAllNodesArray],
  (nodes) => nodes.length
);

// ============================================================================
// NODE-SPECIFIC SELECTORS
// ============================================================================

/** Get a specific node by ID */
export const selectNodeById = createSelector(
  [selectAllNodes, (_state: RootState, nodeId: string) => nodeId],
  (nodes, nodeId) => nodes[nodeId] || null
);

/** Check if a node exists */
export const selectNodeExists = createSelector(
  [selectNodeById],
  (node) => node !== null
);

// ============================================================================
// BASIC FIELD SELECTORS
// ============================================================================

/** Get node step name */
export const selectNodeStepName = createSelector(
  [selectNodeById],
  (node) => node?.step_name || ''
);

/** Get node function ID */
export const selectNodeFunctionId = createSelector(
  [selectNodeById],
  (node) => node?.function_id || ''
);

/** Get node function type */
export const selectNodeFunctionType = createSelector(
  [selectNodeById],
  (node) => node?.function_type || 'registered_function'
);

/** Get node workflow ID */
export const selectNodeWorkflowId = createSelector(
  [selectNodeById],
  (node) => node?.workflow_id || ''
);

/** Get node execution required status */
export const selectNodeExecutionRequired = createSelector(
  [selectNodeById],
  (node) => node?.execution_required ?? true
);

/** Get node status */
export const selectNodeStatus = createSelector(
  [selectNodeById],
  (node) => node?.status || 'pending'
);

/** Get node type */
export const selectNodeType = createSelector(
  [selectNodeById],
  (node) => node?.node_type || 'functionNode'
);

/** Get node metadata */
export const selectNodeMetadata = createSelector(
  [selectNodeById],
  (node) => node?.metadata || {}
);

/** Get node UI data */
export const selectNodeUiData = createSelector(
  [selectNodeById],
  (node) => node?.ui_node_data
);

/** Get node position */
export const selectNodePosition = createSelector(
  [selectNodeUiData],
  (uiData) => uiData?.position || { x: 0, y: 0 }
);

// ============================================================================
// COMPLEX ARRAY SELECTORS (Primary focus as requested)
// ============================================================================

/** Get node additional dependencies */
export const selectNodeAdditionalDependencies = createSelector(
  [selectNodeById],
  (node): WorkflowDependency[] => node?.additional_dependencies || []
);

/** Get node argument mappings */
export const selectNodeArgMapping = createSelector(
  [selectNodeById],
  (node): ArgumentMapping[] => node?.arg_mapping || []
);

/** Get node argument overrides */
export const selectNodeArgOverrides = createSelector(
  [selectNodeById],
  (node): ArgumentOverride[] => node?.arg_overrides || []
);

/** Get node return broker overrides */
export const selectNodeReturnBrokerOverrides = createSelector(
  [selectNodeById],
  (node): string[] => node?.return_broker_overrides || []
);

// ============================================================================
// DERIVED SELECTORS FOR COMPLEX ARRAYS
// ============================================================================

/** Get count of additional dependencies for a node */
export const selectNodeAdditionalDependenciesCount = createSelector(
  [selectNodeAdditionalDependencies],
  (dependencies) => dependencies.length
);

/** Get count of argument mappings for a node */
export const selectNodeArgMappingCount = createSelector(
  [selectNodeArgMapping],
  (mappings) => mappings.length
);

/** Get count of argument overrides for a node */
export const selectNodeArgOverridesCount = createSelector(
  [selectNodeArgOverrides],
  (overrides) => overrides.length
);

/** Get specific additional dependency by source broker ID */
export const selectNodeAdditionalDependencyBySourceId = createSelector(
  [selectNodeAdditionalDependencies, (_state: RootState, _nodeId: string, sourceBrokerId: string) => sourceBrokerId],
  (dependencies, sourceBrokerId) => 
    dependencies.find(dep => dep.source_broker_id === sourceBrokerId) || null
);

/** Get specific argument mapping by source broker ID and target arg name */
export const selectNodeArgMappingBySourceAndTarget = createSelector(
  [selectNodeArgMapping, (_state: RootState, _nodeId: string, sourceBrokerId: string, targetArgName: string) => ({ sourceBrokerId, targetArgName })],
  (mappings, { sourceBrokerId, targetArgName }) => 
    mappings.find(mapping => 
      mapping.source_broker_id === sourceBrokerId && 
      mapping.target_arg_name === targetArgName
    ) || null
);

/** Get specific argument override by name */
export const selectNodeArgOverrideByName = createSelector(
  [selectNodeArgOverrides, (_state: RootState, _nodeId: string, name: string) => name],
  (overrides, name) => 
    overrides.find(override => override.name === name) || null
);

/** Get all source broker IDs from argument mappings */
export const selectNodeArgMappingSourceBrokerIds = createSelector(
  [selectNodeArgMapping],
  (mappings) => [...new Set(mappings.map(mapping => mapping.source_broker_id))]
);

/** Get all target argument names from argument mappings */
export const selectNodeArgMappingTargetArgNames = createSelector(
  [selectNodeArgMapping],
  (mappings) => [...new Set(mappings.map(mapping => mapping.target_arg_name))]
);

// ============================================================================
// WORKFLOW-LEVEL SELECTORS
// ============================================================================

/** Get all nodes for a specific workflow */
export const selectNodesByWorkflowId = createSelector(
  [selectAllNodesArray, (_state: RootState, workflowId: string) => workflowId],
  (nodes, workflowId) => nodes.filter(node => node.workflow_id === workflowId)
);

/** Get all node IDs for a specific workflow */
export const selectNodeIdsByWorkflowId = createSelector(
  [selectNodesByWorkflowId],
  (nodes) => nodes.map(node => node.id)
);

/** Get count of nodes for a specific workflow */
export const selectNodeCountByWorkflowId = createSelector(
  [selectNodesByWorkflowId],
  (nodes) => nodes.length
);

// ============================================================================
// STATUS-BASED SELECTORS
// ============================================================================

/** Get nodes by status */
export const selectNodesByStatus = createSelector(
  [selectAllNodesArray, (_state: RootState, status: string) => status],
  (nodes, status) => nodes.filter(node => node.status === status)
);

/** Get pending nodes */
export const selectPendingNodes = createSelector(
  [selectAllNodesArray],
  (nodes) => nodes.filter(node => node.status === 'pending')
);

/** Get completed nodes */
export const selectCompletedNodes = createSelector(
  [selectAllNodesArray],
  (nodes) => nodes.filter(node => node.status === 'completed')
);

/** Get failed nodes */
export const selectFailedNodes = createSelector(
  [selectAllNodesArray],
  (nodes) => nodes.filter(node => node.status === 'failed')
);

// ============================================================================
// VALIDATION/COMPUTED SELECTORS
// ============================================================================

/** Check if node has any dependencies */
export const selectNodeHasDependencies = createSelector(
  [selectNodeAdditionalDependencies],
  (dependencies) => dependencies.length > 0
);

/** Check if node has any argument mappings */
export const selectNodeHasArgMappings = createSelector(
  [selectNodeArgMapping],
  (mappings) => mappings.length > 0
);

/** Check if node has any argument overrides */
export const selectNodeHasArgOverrides = createSelector(
  [selectNodeArgOverrides],
  (overrides) => overrides.length > 0
);

/** Check if node is fully configured (has function_id and step_name) */
export const selectNodeIsConfigured = createSelector(
  [selectNodeById],
  (node) => Boolean(node?.function_id && node?.step_name && node.step_name !== 'Unnamed Step')
);

// ============================================================================
// UTILITY SELECTORS
// ============================================================================

/** Create a factory for node-specific selectors to avoid repetitive patterns */
export const createNodeSelector = <T>(selector: (node: DbFunctionNode | null) => T) => 
  createSelector(
    [selectNodeById],
    selector
  );

/** Batch selector to get multiple node properties at once */
export const selectNodeSummary = createSelector(
  [selectNodeById],
  (node) => node ? {
    id: node.id,
    stepName: node.step_name,
    functionId: node.function_id,
    functionType: node.function_type,
    status: node.status,
    executionRequired: node.execution_required,
    hasDependencies: node.additional_dependencies.length > 0,
    hasArgMappings: node.arg_mapping.length > 0,
    hasArgOverrides: node.arg_overrides.length > 0,
  } : null
);
