import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface SystemPromptCategory {
  id: string;
  category_id: string;
  placement_type: 'context-menu' | 'card' | 'button' | 'modal' | 'link' | 'action';
  parent_category_id: string | null;
  label: string;
  description: string | null;
  icon_name: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Populated for hierarchy
  subcategories?: SystemPromptCategory[];
}

interface UseSystemPromptCategoriesOptions {
  placement_type?: 'context-menu' | 'card' | 'button' | 'modal' | 'link' | 'action';
  activeOnly?: boolean;
  includeHierarchy?: boolean; // If true, organizes categories with subcategories
}

interface UseSystemPromptCategoriesReturn {
  categories: SystemPromptCategory[];
  topLevelCategories: SystemPromptCategory[];  // Only parent categories
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch system prompt categories from the database (NEW SCHEMA)
 */
export function useSystemPromptCategories(
  options: UseSystemPromptCategoriesOptions = {}
): UseSystemPromptCategoriesReturn {
  const { placement_type, activeOnly = true, includeHierarchy = false } = options;
  const [categories, setCategories] = useState<SystemPromptCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      let query = supabase
        .from('system_prompt_categories_new')
        .select('*')
        .order('sort_order', { ascending: true });

      if (placement_type) {
        query = query.eq('placement_type', placement_type);
      }

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setCategories(data || []);
    } catch (err) {
      console.error('[useSystemPromptCategories] Error fetching categories:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement_type, activeOnly]);

  // Build hierarchy if requested
  const topLevelCategories = useMemo(() => {
    if (!includeHierarchy) {
      return categories.filter(c => !c.parent_category_id);
    }

    // Get top-level categories
    const topLevel = categories.filter(c => !c.parent_category_id);
    
    // Attach subcategories to their parents
    return topLevel.map(parent => ({
      ...parent,
      subcategories: categories.filter(c => c.parent_category_id === parent.id)
    }));
  }, [categories, includeHierarchy]);

  return {
    categories,  // Flat list
    topLevelCategories,  // Hierarchical structure
    isLoading,
    error,
    refetch: fetchCategories
  };
}

