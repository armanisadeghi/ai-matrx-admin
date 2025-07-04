import { supabase } from "@/utils/supabase/client";
import { WorkflowNode, WorkflowNodeCreateInput, WorkflowNodeUpdateInput } from './types';

export const workflowNodeService = {
  async fetchAll(): Promise<WorkflowNode[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_node_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching workflow nodes:', error);
      throw error;
    }
  },

  async fetchOne(id: string): Promise<WorkflowNode> {
    try {
      const { data, error } = await supabase
        .from('workflow_node_data')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Workflow node not found');
      return data;
    } catch (error) {
      console.error('Error fetching workflow node:', error);
      throw error;
    }
  },

  async fetchByWorkflowId(workflowId: string): Promise<WorkflowNode[]> {
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

  async create(node: WorkflowNodeCreateInput): Promise<WorkflowNode> {
    try {
      const { data, error } = await supabase
        .from('workflow_node_data')
        .insert([node])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create workflow node');
      return data;
    } catch (error) {
      console.error('Error creating workflow node:', error);
      throw error;
    }
  },

  async update(id: string, updates: WorkflowNodeUpdateInput): Promise<WorkflowNode> {
    try {
      const { data, error } = await supabase
        .from('workflow_node_data')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update workflow node');
      return data;
    } catch (error) {
      console.error('Error updating workflow node:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<string> {
    try {
      const { error } = await supabase
        .from('workflow_node_data')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    } catch (error) {
      console.error('Error deleting workflow node:', error);
      throw error;
    }
  },
};