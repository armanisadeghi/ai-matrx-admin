import { supabase } from "@/utils/supabase/client";
import { WorkflowData } from './types';

export const workflowService = {
  async fetchOne(id: string): Promise<WorkflowData> {
    try {
      const { data, error } = await supabase
        .from('workflow_data')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching workflow:', error);
      throw error;
    }
  },

  async fetchAll(userId: string): Promise<WorkflowData[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_data')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching workflows:', error);
      throw error;
    }
  },

  async create(workflow: Omit<WorkflowData, 'id' | 'created_at' | 'updated_at' | 'version'>): Promise<WorkflowData> {
    try {
      const { data, error } = await supabase
        .from('workflow_data')
        .insert(workflow)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<WorkflowData>): Promise<WorkflowData> {
    try {
      const { data, error } = await supabase
        .from('workflow_data')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('workflow_data')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  },
};