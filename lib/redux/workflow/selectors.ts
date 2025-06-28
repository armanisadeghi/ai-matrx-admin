import { createSelector } from 'reselect';
import { RootState } from '../store';
import { WorkflowData } from './types';

const selectWorkflowSlice = (state: RootState) => state.workflow;

// Basic state selectors
const selectAllWorkflows = createSelector(
  [selectWorkflowSlice],
  (workflow) => workflow.workflows
);

const selectSelectedWorkflowId = createSelector(
  [selectWorkflowSlice],
  (workflow) => workflow.selectedWorkflowId
);

const selectLoading = createSelector(
  [selectWorkflowSlice],
  (workflow) => workflow.loading
);

const selectError = createSelector(
  [selectWorkflowSlice],
  (workflow) => workflow.error
);

const selectDirtyWorkflows = createSelector(
  [selectWorkflowSlice],
  (workflow) => workflow.dirtyWorkflows
);

const selectLastFetched = createSelector(
  [selectWorkflowSlice],
  (workflow) => workflow.lastFetched
);

// Workflow by ID selector
const selectWorkflowById = createSelector(
  [selectAllWorkflows, (state: RootState, workflowId: string) => workflowId],
  (workflows, workflowId) => workflows[workflowId] || null
);

// Selected workflow selector
const selectSelectedWorkflow = createSelector(
  [selectAllWorkflows, selectSelectedWorkflowId],
  (workflows, selectedWorkflowId) => selectedWorkflowId ? workflows[selectedWorkflowId] || null : null
);

// Workflow existence check
const selectWorkflowExists = createSelector(
  [selectAllWorkflows, (state: RootState, workflowId: string) => workflowId],
  (workflows, workflowId) => !!workflows[workflowId]
);

// Dirty state selectors
const selectIsWorkflowDirty = createSelector(
  [selectDirtyWorkflows, (state: RootState, workflowId: string) => workflowId],
  (dirtyWorkflows, workflowId) => dirtyWorkflows.includes(workflowId)
);

const selectHasDirtyWorkflows = createSelector(
  [selectDirtyWorkflows],
  (dirtyWorkflows) => dirtyWorkflows.length > 0
);

const selectDirtyWorkflowIds = createSelector(
  [selectDirtyWorkflows],
  (dirtyWorkflows) => [...dirtyWorkflows] // Return a copy of the array
);

// Array of all workflows
const selectAllWorkflowsArray = createSelector(
  [selectAllWorkflows],
  (workflows) => Object.values(workflows)
);

// Filtered workflows
const selectActiveWorkflows = createSelector(
  [selectAllWorkflowsArray],
  (workflows) => workflows.filter(workflow => workflow.is_active && !workflow.is_deleted)
);

const selectWorkflowsByCategory = createSelector(
  [selectAllWorkflowsArray, (state: RootState, category: string) => category],
  (workflows, category) => workflows.filter(workflow => workflow.category === category)
);

// Cache-related selectors
const selectIsWorkflowStale = createSelector(
  [selectLastFetched, selectWorkflowSlice, (state: RootState, workflowId: string) => workflowId],
  (lastFetched, workflowSlice, workflowId) => {
    const fetchTime = lastFetched[workflowId];
    if (!fetchTime) return true;
    return Date.now() - fetchTime > workflowSlice.staleTime;
  }
);

// Data transformation selectors
const selectWorkflowDuplicationData = createSelector(
  [selectWorkflowById],
  (workflow) => {
    if (!workflow) return null;
    
    // Return workflow data without id, created_at, updated_at, version for duplication
    const { id, created_at, updated_at, version, ...duplicationData } = workflow;
    return duplicationData;
  }
);

const selectWorkflowSaveData = createSelector(
  [selectWorkflowById],
  (workflow) => {
    if (!workflow) return null;
    
    // Return full workflow data for saving
    return { ...workflow };
  }
);

const selectWorkflowSaveDataById = createSelector(
  [selectWorkflowById],
  (workflow) => {
    if (!workflow) return null;
    
    // Return full workflow data for saving
    return { ...workflow };
  }
);

// Workflow with nodes selectors
const selectWorkflowWithNodes = createSelector(
  [selectSelectedWorkflow, (state: RootState) => state.workflowNodes.nodes],
  (workflow, nodes) => {
    if (!workflow) return null;
    const nodeArray = Object.values(nodes).filter(node => node.workflow_id === workflow.id);
    return {
      ...workflow,
      nodes: nodeArray
    };
  }
);

const selectWorkflowWithNodesById = createSelector(
  [selectWorkflowById, (state: RootState) => state.workflowNodes.nodes],
  (workflow, nodes) => {
    if (!workflow) return null;
    const nodeArray = Object.values(nodes).filter(node => node.workflow_id === workflow.id);
    return {
      ...workflow,
      nodes: nodeArray
    };
  }
);

// Individual field selectors for a specific workflow
const selectWorkflowField = <K extends keyof WorkflowData>(field: K) =>
  createSelector(
    [selectWorkflowById],
    (workflow): WorkflowData[K] | null => workflow ? workflow[field] : null
  );

// Specific field selectors for selected workflow
const selectSelectedWorkflowField = <K extends keyof WorkflowData>(field: K) =>
  createSelector(
    [selectSelectedWorkflow],
    (workflow): WorkflowData[K] | null => workflow ? workflow[field] : null
  );

// Backward compatibility selectors for selected workflow
const selectWorkflow = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow || {
    id: "",
    name: "",
    description: null,
    workflow_type: null,
    inputs: null,
    outputs: null,
    dependencies: null,
    sources: null,
    destinations: null,
    actions: null,
    category: null,
    tags: null,
    is_active: true,
    is_deleted: false,
    auto_execute: false,
    metadata: null,
    viewport: null,
    user_id: null,
    version: null,
    is_public: false,
    authenticated_read: true,
    public_read: false,
    created_at: "",
    updated_at: "",
  }
);

// Individual field selectors for selected workflow (backward compatibility)
const selectWorkflowId = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.id || ""
);

const selectWorkflowName = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.name || ""
);

const selectWorkflowDescription = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.description || null
);

const selectWorkflowType = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.workflow_type || null
);

const selectWorkflowCategory = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.category || null
);

const selectWorkflowInputs = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.inputs || null
);

const selectWorkflowOutputs = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.outputs || null
);

const selectWorkflowDependencies = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.dependencies || null
);

const selectWorkflowSources = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.sources || null
);

const selectWorkflowDestinations = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.destinations || null
);

const selectWorkflowActions = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.actions || null
);

const selectWorkflowTags = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.tags || null
);

const selectWorkflowMetadata = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.metadata || null
);

const selectWorkflowViewport = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.viewport || null
);

const selectWorkflowIsActive = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.is_active ?? true
);

const selectWorkflowIsDeleted = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.is_deleted ?? false
);

const selectWorkflowAutoExecute = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.auto_execute ?? false
);

const selectWorkflowIsPublic = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.is_public ?? false
);

const selectWorkflowAuthenticatedRead = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.authenticated_read ?? true
);

const selectWorkflowPublicRead = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.public_read ?? false
);

const selectWorkflowUserId = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.user_id || null
);

const selectWorkflowVersion = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.version || null
);

const selectWorkflowCreatedAt = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.created_at || ""
);

const selectWorkflowUpdatedAt = createSelector(
  [selectSelectedWorkflow],
  (workflow) => workflow?.updated_at || ""
);

const selectWorkflowIsDirty = createSelector(
  [selectSelectedWorkflowId, selectDirtyWorkflows],
  (selectedWorkflowId, dirtyWorkflows) => 
    selectedWorkflowId ? dirtyWorkflows.includes(selectedWorkflowId) : false
);

export const workflowSelectors = {
  // Basic state
  slice: selectWorkflowSlice,
  allWorkflows: selectAllWorkflows,
  allWorkflowsArray: selectAllWorkflowsArray,
  selectedWorkflowId: selectSelectedWorkflowId,
  selectedWorkflow: selectSelectedWorkflow,
  loading: selectLoading,
  error: selectError,
  dirtyWorkflows: selectDirtyWorkflows,
  lastFetched: selectLastFetched,

  // Workflow by ID
  workflowById: selectWorkflowById,
  exists: selectWorkflowExists,
  isWorkflowStale: selectIsWorkflowStale,

  // Dirty state
  isWorkflowDirty: selectIsWorkflowDirty,
  hasDirtyWorkflows: selectHasDirtyWorkflows,
  dirtyWorkflowIds: selectDirtyWorkflowIds,

  // Filtered workflows
  activeWorkflows: selectActiveWorkflows,
  workflowsByCategory: selectWorkflowsByCategory,

  // Data transformation
  duplicationData: selectWorkflowDuplicationData,
  saveData: selectWorkflowSaveData,
  saveDataById: selectWorkflowSaveDataById,

  // Workflow with nodes
  workflowWithNodes: selectWorkflowWithNodes,
  workflowWithNodesById: selectWorkflowWithNodesById,

  // Field selectors (factory functions)
  workflowField: selectWorkflowField,
  selectedWorkflowField: selectSelectedWorkflowField,

  // Backward compatibility - selected workflow fields
  workflow: selectWorkflow,
  id: selectWorkflowId,
  name: selectWorkflowName,
  description: selectWorkflowDescription,
  workflowType: selectWorkflowType,
  category: selectWorkflowCategory,
  inputs: selectWorkflowInputs,
  outputs: selectWorkflowOutputs,
  dependencies: selectWorkflowDependencies,
  sources: selectWorkflowSources,
  destinations: selectWorkflowDestinations,
  actions: selectWorkflowActions,
  tags: selectWorkflowTags,
  metadata: selectWorkflowMetadata,
  viewport: selectWorkflowViewport,
  isActive: selectWorkflowIsActive,
  isDeleted: selectWorkflowIsDeleted,
  autoExecute: selectWorkflowAutoExecute,
  isPublic: selectWorkflowIsPublic,
  authenticatedRead: selectWorkflowAuthenticatedRead,
  publicRead: selectWorkflowPublicRead,
  userId: selectWorkflowUserId,
  version: selectWorkflowVersion,
  createdAt: selectWorkflowCreatedAt,
  updatedAt: selectWorkflowUpdatedAt,
  isDirty: selectWorkflowIsDirty,

  // Legacy aliases (will be deprecated)
  allLoading: selectLoading,
  allError: selectError,
};