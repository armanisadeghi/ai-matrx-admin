import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { selectAllWorkflowNodes, selectWorkflowNodesByWorkflowId } from '../workflow-nodes/selectors';

const selectWorkflowState = (state: RootState) => state.workflows;

export const selectAllWorkflows = createSelector(
  [selectWorkflowState],
  (workflowState) => workflowState.ids.map(id => workflowState.entities[id])
);

export const selectWorkflowById = createSelector(
  [selectWorkflowState, (state: RootState, id: string) => id],
  (workflowState, id) => workflowState.entities[id] || null
);

export const selectActiveWorkflow = createSelector(
  [selectWorkflowState],
  (workflowState) => 
    workflowState.activeId ? workflowState.entities[workflowState.activeId] : null
);

export const selectSelectedWorkflows = createSelector(
  [selectWorkflowState],
  (workflowState) => 
    workflowState.selectedIds.map(id => workflowState.entities[id]).filter(Boolean)
);

export const selectWorkflowsIsLoading = createSelector(
  [selectWorkflowState],
  (workflowState) => workflowState.isLoading
);

export const selectWorkflowsError = createSelector(
  [selectWorkflowState],
  (workflowState) => workflowState.error
);

export const selectWorkflowIsDirty = createSelector(
  [selectWorkflowState, (state: RootState, id: string) => id],
  (workflowState, id) => workflowState.isDirty[id] || false
);

export const selectWorkflowsDataFreshness = createSelector(
  [selectWorkflowState],
  (workflowState) => ({
    fetchTimestamp: workflowState.fetchTimestamp,
    dataFetched: workflowState.dataFetched,
    isStale: workflowState.fetchTimestamp ? 
      Date.now() - workflowState.fetchTimestamp > 5 * 60 * 1000 : true // 5 minutes
  })
);

export const selectActiveWorkflows = createSelector(
  [selectAllWorkflows],
  (workflows) => workflows.filter(workflow => workflow.is_active && !workflow.is_deleted)
);

export const selectWorkflowsByCategory = createSelector(
  [selectAllWorkflows, (state: RootState, category: string) => category],
  (workflows, category) => workflows.filter(workflow => workflow.category === category)
);

export const selectWorkflowWithNodes = createSelector(
  [selectWorkflowById, selectWorkflowNodesByWorkflowId],
  (workflow, getNodesByWorkflowId) => {
    if (!workflow) return null;
    return {
      ...workflow,
      nodes: getNodesByWorkflowId(workflow.id)
    };
  }
);

export const selectActiveWorkflowWithNodes = createSelector(
  [selectActiveWorkflow, selectAllWorkflowNodes],
  (activeWorkflow, allNodes) => {
    if (!activeWorkflow) return null;
    const workflowNodes = allNodes.filter(node => node.workflow_id === activeWorkflow.id);
    return {
      ...activeWorkflow,
      nodes: workflowNodes
    };
  }
);

// Complex State Array Selectors
export const selectWorkflowInputs = createSelector(
  [selectWorkflowById],
  (workflow) => workflow?.inputs || []
);

export const selectWorkflowOutputs = createSelector(
  [selectWorkflowById],
  (workflow) => workflow?.outputs || []
);

export const selectWorkflowDependencies = createSelector(
  [selectWorkflowById],
  (workflow) => workflow?.dependencies || []
);

export const selectWorkflowSources = createSelector(
  [selectWorkflowById],
  (workflow) => workflow?.sources || []
);

export const selectWorkflowDestinations = createSelector(
  [selectWorkflowById],
  (workflow) => workflow?.destinations || []
);

// Active Workflow Complex State Selectors
export const selectActiveWorkflowInputs = createSelector(
  [selectActiveWorkflow],
  (workflow) => workflow?.inputs || []
);

export const selectActiveWorkflowOutputs = createSelector(
  [selectActiveWorkflow],
  (workflow) => workflow?.outputs || []
);

export const selectActiveWorkflowDependencies = createSelector(
  [selectActiveWorkflow],
  (workflow) => workflow?.dependencies || []
);

export const selectActiveWorkflowSources = createSelector(
  [selectActiveWorkflow],
  (workflow) => workflow?.sources || []
);

export const selectActiveWorkflowDestinations = createSelector(
  [selectActiveWorkflow],
  (workflow) => workflow?.destinations || []
);

// Utility Selectors for Complex State Arrays
export const selectWorkflowInputById = createSelector(
  [selectWorkflowInputs, (state: RootState, workflowId: string, index: number) => index],
  (inputs, index) => inputs[index] || null
);

export const selectWorkflowOutputById = createSelector(
  [selectWorkflowOutputs, (state: RootState, workflowId: string, index: number) => index],
  (outputs, index) => outputs[index] || null
);

export const selectWorkflowSourceByBrokerId = createSelector(
  [selectWorkflowSources, (state: RootState, workflowId: string, brokerId: string) => brokerId],
  (sources, brokerId) => sources.find(source => source.brokerId === brokerId) || null
);

export const workflowsSelectors = {
  // Basic workflow selectors
  allWorkflows: selectAllWorkflows,
  workflowById: selectWorkflowById,
  activeWorkflow: selectActiveWorkflow,
  selectedWorkflows: selectSelectedWorkflows,
  
  // State selectors
  isLoading: selectWorkflowsIsLoading,
  error: selectWorkflowsError,
  isDirty: selectWorkflowIsDirty,
  dataFreshness: selectWorkflowsDataFreshness,
  
  // Filter selectors
  activeWorkflows: selectActiveWorkflows,
  workflowsByCategory: selectWorkflowsByCategory,
  
  // Workflow with nodes selectors
  workflowWithNodes: selectWorkflowWithNodes,
  activeWorkflowWithNodes: selectActiveWorkflowWithNodes,
  
  // Workflow array property selectors
  workflowInputs: selectWorkflowInputs,
  workflowOutputs: selectWorkflowOutputs,
  workflowDependencies: selectWorkflowDependencies,
  workflowSources: selectWorkflowSources,
  workflowDestinations: selectWorkflowDestinations,
  
  // Active workflow array property selectors
  activeWorkflowInputs: selectActiveWorkflowInputs,
  activeWorkflowOutputs: selectActiveWorkflowOutputs,
  activeWorkflowDependencies: selectActiveWorkflowDependencies,
  activeWorkflowSources: selectActiveWorkflowSources,
  activeWorkflowDestinations: selectActiveWorkflowDestinations,
  
  // Utility selectors
  workflowInputById: selectWorkflowInputById,
  workflowOutputById: selectWorkflowOutputById,
  workflowSourceByBrokerId: selectWorkflowSourceByBrokerId,
};