import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface SystemPromptCategory {
  id: string;
  name: string;
  description: string | null;
  icon_name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseSystemPromptCategoriesOptions {
  activeOnly?: boolean;
}

interface UseSystemPromptCategoriesReturn {
  categories: SystemPromptCategory[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch system prompt categories from the database
 */
export function useSystemPromptCategories(
  options: UseSystemPromptCategoriesOptions = {}
): UseSystemPromptCategoriesReturn {
  const { activeOnly = true } = options;
  const [categories, setCategories] = useState<SystemPromptCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      let query = supabase
        .from('system_prompt_categories')
        .select('*')
        .order('sort_order', { ascending: true });

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
  }, [activeOnly]);

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories
  };
}

