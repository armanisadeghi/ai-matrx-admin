import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { selectAllWorkflowNodes, selectWorkflowNodesByWorkflowId } from '../workflow-nodes/selectors';
import { BrokerSourceConfig } from './types';

const selectWorkflowState = (state: RootState) => state.workflows;

// Memoized selector to avoid array creation on every call
export const selectAllWorkflows = createSelector(
  [selectWorkflowState],
  (workflowState) => {
    const workflows = workflowState.ids.map(id => workflowState.entities[id]);
    return workflows;
  }
);

export const selectWorkflowById = createSelector(
  [selectWorkflowState, (_: RootState, id: string) => id],
  (workflowState, id) => workflowState.entities[id] || null
);

export const selectActiveWorkflow = createSelector(
  [selectWorkflowState],
  (workflowState) => 
    workflowState.activeId ? workflowState.entities[workflowState.activeId] : null
);

// Memoized selector to avoid array creation on every call
export const selectSelectedWorkflows = createSelector(
  [selectWorkflowState],
  (workflowState) => {
    const selectedWorkflows = workflowState.selectedIds.map(id => workflowState.entities[id]).filter(Boolean);
    return selectedWorkflows;
  }
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
  [selectWorkflowState, (_: RootState, id: string) => id],
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
  [selectAllWorkflows, (_: RootState, category: string) => category],
  (workflows, category) => workflows.filter(workflow => workflow.category === category)
);

export const selectWorkflowWithNodes = createSelector(
  [selectWorkflowById, (state: RootState, id: string) => selectWorkflowNodesByWorkflowId(state, id)],
  (workflow, workflowNodes) => {
    if (!workflow) return null;
    return {
      ...workflow,
      nodes: workflowNodes
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

// Complex State Array Selectors that properly accept workflow ID parameter
export const selectWorkflowInputs = createSelector(
  [selectWorkflowState, (_: RootState, id: string) => id],
  (workflowState, id) => workflowState.entities[id]?.inputs || []
);

export const selectWorkflowOutputs = createSelector(
  [selectWorkflowState, (_: RootState, id: string) => id],
  (workflowState, id) => workflowState.entities[id]?.outputs || []
);

export const selectWorkflowDependencies = createSelector(
  [selectWorkflowState, (_: RootState, id: string) => id],
  (workflowState, id) => workflowState.entities[id]?.dependencies || []
);

export const selectWorkflowSources = createSelector(
  [selectWorkflowState, (_: RootState, id: string) => id],
  (workflowState, id) => workflowState.entities[id]?.sources || []
);

export const selectWorkflowDestinations = createSelector(
  [selectWorkflowState, (_: RootState, id: string) => id],
  (workflowState, id) => workflowState.entities[id]?.destinations || []
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

// FIXED: Utility Selectors for Complex State Arrays with proper input selectors
export const selectWorkflowInputById = createSelector(
  [selectWorkflowInputs, (_: RootState, __: string, index: number) => index],
  (inputs, index) => inputs[index] || null
);

export const selectWorkflowOutputById = createSelector(
  [selectWorkflowOutputs, (_: RootState, __: string, index: number) => index],
  (outputs, index) => outputs[index] || null
);

export const selectWorkflowSourceByBrokerId = createSelector(
  [selectWorkflowSources, (_: RootState, __: string, brokerId: string) => brokerId],
  (sources, brokerId) => sources.find(source => source.brokerId === brokerId) || null
);

// FIXED: User data source selectors with proper input selectors
export const selectWorkflowUserDataSources = createSelector(
  [selectWorkflowSources],
  (sources) => sources.filter(source => source.sourceType === 'user_data')
);

export const selectWorkflowUserDataSourceByBrokerId = createSelector(
  [selectWorkflowUserDataSources, (_: RootState, __: string, brokerId: string) => brokerId],
  (userDataSources, brokerId) => {
    if (!userDataSources || !Array.isArray(userDataSources)) return null;
    return userDataSources.find(source => source.brokerId === brokerId) as BrokerSourceConfig<"user_data"> | null;
  }
);

// FIXED: User input source selectors with proper input selectors
export const selectWorkflowUserInputSources = createSelector(
  [selectWorkflowSources],
  (sources) => sources.filter(source => source.sourceType === 'user_input')
);

export const selectWorkflowUserInputSourceByBrokerId = createSelector(
  [selectWorkflowUserInputSources, (_: RootState, __: string, brokerId: string) => brokerId],
  (userInputSources, brokerId) => {
    if (!userInputSources || !Array.isArray(userInputSources)) return null;
    return userInputSources.find(source => source.brokerId === brokerId) as BrokerSourceConfig<"user_input"> | null;
  }
);

// ADDITIONAL HELPER SELECTORS: Factory functions for creating parameterized selectors
export const createWorkflowInputsSelector = (workflowId: string) => 
  createSelector(
    [(state: RootState) => selectWorkflowById(state, workflowId)],
    (workflow) => workflow?.inputs || []
  );

export const createWorkflowOutputsSelector = (workflowId: string) => 
  createSelector(
    [(state: RootState) => selectWorkflowById(state, workflowId)],
    (workflow) => workflow?.outputs || []
  );

export const createWorkflowDependenciesSelector = (workflowId: string) => 
  createSelector(
    [(state: RootState) => selectWorkflowById(state, workflowId)],
    (workflow) => workflow?.dependencies || []
  );

export const createWorkflowSourcesSelector = (workflowId: string) => 
  createSelector(
    [(state: RootState) => selectWorkflowById(state, workflowId)],
    (workflow) => workflow?.sources || []
  );

export const createWorkflowDestinationsSelector = (workflowId: string) => 
  createSelector(
    [(state: RootState) => selectWorkflowById(state, workflowId)],
    (workflow) => workflow?.destinations || []
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
  
  // Workflow array property selectors (require ID parameter)
  workflowInputs: selectWorkflowInputs,
  workflowOutputs: selectWorkflowOutputs,
  workflowDependencies: selectWorkflowDependencies,
  workflowSources: selectWorkflowSources,
  workflowDestinations: selectWorkflowDestinations,
  
  // Active workflow array property selectors (no ID needed)
  activeWorkflowInputs: selectActiveWorkflowInputs,
  activeWorkflowOutputs: selectActiveWorkflowOutputs,
  activeWorkflowDependencies: selectActiveWorkflowDependencies,
  activeWorkflowSources: selectActiveWorkflowSources,
  activeWorkflowDestinations: selectActiveWorkflowDestinations,
  
  // Utility selectors (require ID parameter)
  workflowInputById: selectWorkflowInputById,
  workflowOutputById: selectWorkflowOutputById,
  workflowSourceByBrokerId: selectWorkflowSourceByBrokerId,
  
  // User data source selectors (require ID parameter)
  workflowUserDataSources: selectWorkflowUserDataSources,
  userDataSourceByBrokerId: selectWorkflowUserDataSourceByBrokerId,
  
  // User input source selectors (require ID parameter)
  workflowUserInputSources: selectWorkflowUserInputSources,
  userInputSourceByBrokerId: selectWorkflowUserInputSourceByBrokerId,
  
  // Factory functions for creating parameterized selectors
  createWorkflowInputsSelector,
  createWorkflowOutputsSelector,
  createWorkflowDependenciesSelector,
  createWorkflowSourcesSelector,
  createWorkflowDestinationsSelector,
};