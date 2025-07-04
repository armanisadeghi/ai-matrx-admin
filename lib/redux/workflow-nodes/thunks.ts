import { createAsyncThunk } from '@reduxjs/toolkit';
import { workflowNodeService } from './service';
import { workflowNodesSelectors } from './selectors';
import { WorkflowNode, WorkflowNodeCreateInput, WorkflowNodeUpdateInput } from './types';
import { RootState } from '../store';

export const fetchAllWorkflowNodes = createAsyncThunk(
  'workflowNodes/fetchAll',
  async () => {
    return await workflowNodeService.fetchAll();
  }
);

export const fetchOneWorkflowNode = createAsyncThunk(
  'workflowNodes/fetchOne',
  async (id: string) => {
    return await workflowNodeService.fetchOne(id);
  }
);

export const fetchWorkflowNodesByWorkflowId = createAsyncThunk(
  'workflowNodes/fetchByWorkflowId',
  async (workflowId: string) => {
    return await workflowNodeService.fetchByWorkflowId(workflowId);
  }
);

export const createWorkflowNode = createAsyncThunk(
  'workflowNodes/create',
  async (node: WorkflowNodeCreateInput) => {
    return await workflowNodeService.create(node);
  }
);

export const updateWorkflowNode = createAsyncThunk(
  'workflowNodes/update',
  async ({ id, updates }: { id: string; updates: WorkflowNodeUpdateInput }) => {
    return await workflowNodeService.update(id, updates);
  }
);

export const deleteWorkflowNode = createAsyncThunk(
  'workflowNodes/delete',
  async (id: string) => {
    return await workflowNodeService.delete(id);
  }
);

export const saveWorkflowNode = createAsyncThunk(
  'workflowNodes/save',
  async (
    { 
      id, 
      updates 
    }: { 
      id: string; 
      updates?: WorkflowNodeUpdateInput 
    }, 
    { getState }
  ) => {
    // 1. Get current node state from Redux
    const state = getState() as RootState;
    const currentNode = workflowNodesSelectors.nodeById(state, id);
    
    if (!currentNode) {
      throw new Error(`WorkflowNode not found: ${id}`);
    }
    
    // 2. If updates provided, merge them with current state
    const nodeToSave = updates ? { ...currentNode, ...updates } : currentNode;
    
    // 3. Save to database using the current updateWorkflowNode service
    return await workflowNodeService.update(id, nodeToSave);
  }
);

export const duplicateWorkflowNode = createAsyncThunk(
  'workflowNodes/duplicate',
  async (id: string, { getState }) => {
    // 1. Get current node state from Redux
    const state = getState() as RootState;
    const currentNode = workflowNodesSelectors.nodeById(state, id);
    
    if (!currentNode) {
      throw new Error(`WorkflowNode not found: ${id}`);
    }
    
    // 2. Create a copy excluding id, created_at, updated_at, and user_id
    const { 
      id: _id, 
      created_at: _created_at, 
      updated_at: _updated_at, 
      user_id: _user_id,
      ...nodeData 
    } = currentNode;
    
    // 3. Modify step_name to add " copy"
    const duplicatedNode: WorkflowNodeCreateInput = {
      ...nodeData,
      step_name: nodeData.step_name ? `${nodeData.step_name} copy` : 'Copy',
    };
    
    // 4. Modify position in ui_data if it exists
    if (duplicatedNode.ui_data && duplicatedNode.ui_data.position) {
      duplicatedNode.ui_data = {
        ...duplicatedNode.ui_data,
        position: {
          x: duplicatedNode.ui_data.position.x + 100,
          y: duplicatedNode.ui_data.position.y + 100,
        },
      };
    }
    
    // 5. Create the new node using the service
    return await workflowNodeService.create(duplicatedNode);
  }
);