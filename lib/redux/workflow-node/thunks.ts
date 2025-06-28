import { createAsyncThunk } from '@reduxjs/toolkit';
import { workflowNodeService } from './service';
import { WorkflowNodeData } from './types';
import { workflowNodeSelectors } from './selectors';
import { RootState } from '../store';

export const fetchOne = createAsyncThunk(
  'workflowNode/fetchOne',
  async (id: string) => {
    return await workflowNodeService.fetchOne(id);
  }
);

export const fetchAll = createAsyncThunk(
  'workflowNode/fetchAll',
  async (userId: string) => {
    return await workflowNodeService.fetchAll(userId);
  }
);

export const fetchByWorkflowId = createAsyncThunk(
  'workflowNode/fetchByWorkflowId',
  async (workflowId: string) => {
    return await workflowNodeService.fetchByWorkflowId(workflowId);
  }
);

export const create = createAsyncThunk(
  'workflowNode/create',
  async (node: Omit<WorkflowNodeData, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
    const newNode = await workflowNodeService.create(node) as WorkflowNodeData;
    return newNode;
  }
);

export const update = createAsyncThunk(
  'workflowNode/update',
  async ({ id, updates }: { id: string; updates: Partial<WorkflowNodeData> }) => {
    return await workflowNodeService.update(id, updates);
  }
);

export const deleteNode = createAsyncThunk(
  'workflowNode/delete',
  async (id: string) => {
    await workflowNodeService.delete(id);
    return id;
  }
);

export const saveStateToDb = createAsyncThunk(
  'workflowNode/saveStateToDb',
  async (id: string, { getState }) => {
    const state = getState() as RootState;
    
    // Get the node from state
    const node = workflowNodeSelectors.nodeById(state, id);
    
    if (!node) {
      throw new Error(`Node with id ${id} not found in state`);
    }
    
    // Extract data excluding created_at and updated_at for the update
    const { created_at, updated_at, ...updateData } = node;
    
    // Save to database using the service
    return await workflowNodeService.update(id, updateData);
  }
);

export const duplicateNode = createAsyncThunk(
  'workflowNode/duplicate',
  async ({ currentNodeId, newNodePosition }: { currentNodeId: string; newNodePosition: { x: number; y: number } }, { getState }) => {
    const state = getState() as RootState;
    
    // Use the selector to get the source node
    const sourceNode = workflowNodeSelectors.nodeById(state, currentNodeId);
    
    if (!sourceNode) {
      throw new Error(`Node with id ${currentNodeId} not found`);
    }
    
    // Use the duplication selector to get the data to duplicate
    const duplicationData = workflowNodeSelectors.nodeDuplicationData(state, currentNodeId);
    
    if (!duplicationData) {
      throw new Error(`Unable to get duplication data for node ${currentNodeId}`);
    }
    
    // Create duplicate node data with new position and modified step name
    const duplicateNodeData = {
      ...duplicationData,
      step_name: `${sourceNode.step_name} (Copy)`,
      ui_data: {
        ...duplicationData.ui_data,
        position: newNodePosition,
      },
    };
    
    // Create the new node via the service
    const createdNode = await workflowNodeService.create(duplicateNodeData);
    
    return createdNode;
  }
);

export const fetchOrGetFromState = createAsyncThunk(
  'workflowNode/fetchOrGetFromState',
  async (id: string, { getState }) => {
    const state = getState() as RootState;
    
    // Check if the node exists in state
    const nodeExists = workflowNodeSelectors.nodeExists(state, id);
    
    if (nodeExists) {
      // Return the existing node from state
      const existingNode = workflowNodeSelectors.nodeById(state, id);
      return existingNode;
    }
    
    // Node doesn't exist in state, fetch it from the service
    return await workflowNodeService.fetchOne(id);
  }
);