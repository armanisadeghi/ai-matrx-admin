// utils/supabase/tools-service.ts

import { createClient } from './client';

export interface DatabaseTool {
  id: string;
  name: string;
  description: string;
  parameters: any;
  output_schema?: any;
  annotations?: any[];
  function_path: string;
  category?: string;
  tags?: string[];
  icon?: string;
  is_active?: boolean;
  version?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
}

/**
 * Client-side service for fetching tools
 */
export class ToolsService {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Fetch all active tools from the database
   */
  async fetchTools(): Promise<DatabaseTool[]> {
    try {
      const { data, error } = await this.supabase
        .from('tools')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching tools:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch tools:', error);
      throw error;
    }
  }

  /**
   * Fetch tools by category
   */
  async fetchToolsByCategory(category: string): Promise<DatabaseTool[]> {
    try {
      const { data, error } = await this.supabase
        .from('tools')
        .select('*')
        .eq('is_active', true)
        .eq('category', category)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching tools by category:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch tools by category:', error);
      throw error;
    }
  }

  /**
   * Fetch tools by tool identifiers (names)
   */
  async fetchToolsByIds(toolIdentifiers: string[]): Promise<DatabaseTool[]> {
    if (toolIdentifiers.length === 0) return [];

    try {
      const { data, error } = await this.supabase
        .from('tools')
        .select('*')
        .in('name', toolIdentifiers)  // Query by 'name' field which contains the tool identifiers
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching tools by identifiers:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch tools by identifiers:', error);
      throw error;
    }
  }

  /**
   * Search tools by name or description
   */
  async searchTools(query: string): Promise<DatabaseTool[]> {
    if (!query.trim()) return this.fetchTools();

    try {
      const { data, error } = await this.supabase
        .from('tools')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error searching tools:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to search tools:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const toolsService = new ToolsService();
