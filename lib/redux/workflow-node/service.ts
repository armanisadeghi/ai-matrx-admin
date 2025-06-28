import { supabase } from "@/utils/supabase/client";
import { WorkflowNodeData } from './types';

// Define allowed fields based on the table structure
const ALLOWED_FIELDS = [
  'workflow_id',
  'function_id', 
  'type',
  'step_name',
  'node_type',
  'execution_required',
  'inputs',
  'outputs',
  'dependencies',
  'metadata',
  'ui_data',
  'is_public',
  'authenticated_read',
  'public_read',
  'user_id'
] as const;

// Fields that should never be updated (managed by database)
const RESTRICTED_UPDATE_FIELDS = ['id', 'created_at', 'updated_at'] as const;

// Helper function to sanitize data for create operations
function sanitizeCreateData(data: any): Partial<WorkflowNodeData> {
  const sanitized: any = {};
  
  ALLOWED_FIELDS.forEach(field => {
    if (data.hasOwnProperty(field)) {
      sanitized[field] = data[field];
    }
  });
  
  return sanitized;
}

// Helper function to sanitize data for update operations  
function sanitizeUpdateData(data: any): Partial<WorkflowNodeData> {
  const sanitized: any = {};
  
  ALLOWED_FIELDS.forEach(field => {
    if (data.hasOwnProperty(field)) {
      sanitized[field] = data[field];
    }
  });
  
  // Remove any restricted fields that might have been passed
  RESTRICTED_UPDATE_FIELDS.forEach(field => {
    delete sanitized[field];
  });
  
  return sanitized;
}

// Export utility functions for external use
export const workflowNodeDataUtils = {
  sanitizeCreateData,
  sanitizeUpdateData,
  getAllowedFields: () => [...ALLOWED_FIELDS],
  getRestrictedUpdateFields: () => [...RESTRICTED_UPDATE_FIELDS]
};

export const workflowNodeService = {
  async fetchOne(id: string): Promise<WorkflowNodeData> {
    try {
      const { data, error } = await supabase
        .from('workflow_node_data')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching workflow node:', error);
      throw error;
    }
  },

  async fetchAll(userId: string): Promise<WorkflowNodeData[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_node_data')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching workflow nodes:', error);
      throw error;
    }
  },

  async fetchByWorkflowId(workflowId: string): Promise<WorkflowNodeData[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_node_data')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching workflow nodes by workflow ID:', error);
      throw error;
    }
  },

  async create(node: Omit<WorkflowNodeData, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<WorkflowNodeData> {
    try {
      const sanitizedNode = sanitizeCreateData(node);
      
      const { data, error } = await supabase
        .from('workflow_node_data')
        .insert(sanitizedNode)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating workflow node:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<WorkflowNodeData>): Promise<WorkflowNodeData> {
    try {
      const sanitizedUpdates = sanitizeUpdateData(updates);
      
      // Only proceed if there are valid fields to update
      if (Object.keys(sanitizedUpdates).length === 0) {
        throw new Error('No valid fields provided for update');
      }
      
      const { data, error } = await supabase
        .from('workflow_node_data')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating workflow node:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('workflow_node_data')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting workflow node:', error);
      throw error;
    }
  },
};