import { createAsyncThunk } from '@reduxjs/toolkit';
import { workflowService } from './service';
import { workflowNodeService } from '../workflow-node/service';
import { workflowNodeActions } from '../workflow-node/slice';
import { workflowSelectors } from './selectors';
import { workflowNodeSelectors } from '../workflow-node/selectors';
import { WorkflowData } from './types';
import { WorkflowNodeData } from '../workflow-node/types';
import { RootState } from '../store';

export const fetchOne = createAsyncThunk(
  'workflow/fetchOne',
  async (id: string) => {
    return await workflowService.fetchOne(id);
  }
);

export const fetchOrGetFromState = createAsyncThunk(
  'workflow/fetchOrGetFromState',
  async (id: string, { getState }) => {
    const state = getState() as RootState;
    
    // Check if the workflow exists in state
    const workflowExists = workflowSelectors.exists(state, id);
    
    if (workflowExists) {
      // Return the existing workflow from state
      const existingWorkflow = workflowSelectors.workflowById(state, id);
      return existingWorkflow;
    }
    
    // Workflow doesn't exist in state, fetch it from the service
    return await workflowService.fetchOne(id);
  }
);

export const fetchAll = createAsyncThunk(
  'workflow/fetchAll',
  async (userId: string) => {
    return await workflowService.fetchAll(userId);
  }
);

export const create = createAsyncThunk(
  'workflow/create',
  async (workflow: Omit<WorkflowData, 'id' | 'created_at' | 'updated_at' | 'version'>) => {
    return await workflowService.create(workflow);
  }
);

export const update = createAsyncThunk(
  'workflow/update',
  async ({ id, updates }: { id: string; updates: Partial<WorkflowData> }) => {
    return await workflowService.update(id, updates);
  }
);

export const deleteWorkflow = createAsyncThunk(
  'workflow/delete',
  async (id: string) => {
    await workflowService.delete(id);
    return id;
  }
);

export const fetchOneWithNodes = createAsyncThunk(
  'workflow/fetchOneWithNodes',
  async (id: string, { dispatch }) => {
    const workflow = await workflowService.fetchOne(id);
    const nodes = await workflowNodeService.fetchByWorkflowId(id);

    // Update workflow node slice with fetched nodes
    dispatch(workflowNodeActions.setNodes(nodes));

    return workflow;
  }
);

export const saveWithNodes = createAsyncThunk(
  'workflow/saveWithNodes',
  async ({ 
    workflow, 
    nodes 
  }: { 
    workflow: Partial<WorkflowData> & { id?: string }; 
    nodes: WorkflowNodeData[] 
  }, { dispatch }) => {
    try {
      // Filter out only the database fields for workflow (exclude Redux state fields)
      const workflowDataForDB: Partial<WorkflowData> = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        workflow_type: workflow.workflow_type,
        inputs: workflow.inputs,
        outputs: workflow.outputs,
        dependencies: workflow.dependencies,
        sources: workflow.sources,
        destinations: workflow.destinations,
        actions: workflow.actions,
        category: workflow.category,
        tags: workflow.tags,
        is_active: workflow.is_active,
        is_deleted: workflow.is_deleted,
        auto_execute: workflow.auto_execute,
        metadata: workflow.metadata,
        viewport: workflow.viewport,
        user_id: workflow.user_id,
        version: workflow.version,
        is_public: workflow.is_public,
        authenticated_read: workflow.authenticated_read,
        public_read: workflow.public_read,
        // Explicitly exclude created_at and updated_at - database handles these
      };

      // Save or update workflow
      let savedWorkflow: WorkflowData;
      if (workflowDataForDB.id) {
        // Remove id from updates object since it's used for the WHERE clause
        const { id, ...updates } = workflowDataForDB;
        savedWorkflow = await workflowService.update(id, updates);
      } else {
        savedWorkflow = await workflowService.create(workflowDataForDB as Omit<WorkflowData, 'id' | 'created_at' | 'updated_at' | 'version'>);
      }

      // Update nodes with workflow ID and save them
      const nodesToSave = nodes.map(node => ({
        ...node,
        workflow_id: savedWorkflow.id
      }));

      // Save all nodes
      const savedNodes = await Promise.all(
        nodesToSave.map(node => {
          if (node.id) {
            // Remove id from updates object since it's used for the WHERE clause
            const { id, ...updates } = node;
            return workflowNodeService.update(id, updates);
          } else {
            // Remove id for creates
            const { id, ...nodeData } = node;
            return workflowNodeService.create(nodeData as Omit<WorkflowNodeData, 'id' | 'created_at' | 'updated_at'>);
          }
        })
      );

      // Update workflow node slice with saved nodes
      dispatch(workflowNodeActions.setNodes(savedNodes));

      return savedWorkflow;
    } catch (error) {
      console.error('Error saving workflow with nodes:', error);
      throw error;
    }
  }
);

export const saveWorkflowFromState = createAsyncThunk(
  'workflow/saveWorkflowFromState',
  async (workflowId: string, { getState, dispatch }) => {
    try {
      const state = getState() as RootState;
      
      // Get workflow data from state using selector
      const workflowData = workflowSelectors.saveDataById(state, workflowId);
      if (!workflowData) {
        throw new Error(`Workflow with ID ${workflowId} not found in state`);
      }

      // Get nodes data from state using selector
      const nodesData = workflowNodeSelectors.nodesSaveDataByWorkflowId(state, workflowId);

      // Save or update workflow
      let savedWorkflow: WorkflowData;
      if (workflowData.id) {
        // Remove id from updates object since it's used for the WHERE clause
        const { id, ...updates } = workflowData;
        savedWorkflow = await workflowService.update(id, updates);
      } else {
        savedWorkflow = await workflowService.create(workflowData as Omit<WorkflowData, 'id' | 'created_at' | 'updated_at' | 'version'>);
      }

      // Update nodes with workflow ID and save them
      const nodesToSave = nodesData.map(node => ({
        ...node,
        workflow_id: savedWorkflow.id
      }));

      // Save all nodes
      const savedNodes = await Promise.all(
        nodesToSave.map(node => {
          if (node.id) {
            // Remove id from updates object since it's used for the WHERE clause
            const { id, ...updates } = node;
            return workflowNodeService.update(id, updates);
          } else {
            // Remove id for creates
            const { id, ...nodeData } = node;
            return workflowNodeService.create(nodeData as Omit<WorkflowNodeData, 'id' | 'created_at' | 'updated_at'>);
          }
        })
      );

      // Update workflow node slice with saved nodes
      dispatch(workflowNodeActions.setNodes(savedNodes));

      return savedWorkflow;
    } catch (error) {
      console.error('Error saving workflow from state:', error);
      throw error;
    }
  }
);