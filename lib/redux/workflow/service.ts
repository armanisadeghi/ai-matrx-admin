import { supabase } from "@/utils/supabase/client";
import { Workflow, WorkflowCreateInput, WorkflowUpdateInput } from './types';

export const workflowService = {
  async fetchAll(): Promise<Workflow[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_data')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching workflows:', error);
      throw error;
    }
  },

  async fetchOne(id: string): Promise<Workflow> {
    try {
      const { data, error } = await supabase
        .from('workflow_data')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Workflow not found');
      return data;
    } catch (error) {
      console.error('Error fetching workflow:', error);
      throw error;
    }
  },

  async create(workflow: WorkflowCreateInput): Promise<Workflow> {
    try {
      const { data, error } = await supabase
        .from('workflow_data')
        .insert([workflow])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create workflow');
      return data;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  },

  async update(id: string, updates: WorkflowUpdateInput): Promise<Workflow> {
    try {
      const { data, error } = await supabase
        .from('workflow_data')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update workflow');
      return data;
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<string> {
    try {
      const { error } = await supabase
        .from('workflow_data')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;
      return id;
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  },
};