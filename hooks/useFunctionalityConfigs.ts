import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SYSTEM_FUNCTIONALITIES } from '@/types/system-prompt-functionalities';

export interface FunctionalityConfig {
  id: string;
  functionality_id: string;
  category_id: string;
  label: string;
  description: string | null;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data from category
  category?: {
    id: string;
    label: string;
    color: string;
    icon_name: string;
  };
  // Metadata from hardcoded SYSTEM_FUNCTIONALITIES
  requiredVariables?: string[];
  optionalVariables?: string[];
  placementTypes?: string[];
}

interface UseFunctionalityConfigsOptions {
  activeOnly?: boolean;
  categoryId?: string;
  includeCategory?: boolean;
}

interface UseFunctionalityConfigsReturn {
  configs: FunctionalityConfig[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch functionality configs from the database
 * Merges database config with hardcoded functionality definitions
 */
export function useFunctionalityConfigs(
  options: UseFunctionalityConfigsOptions = {}
): UseFunctionalityConfigsReturn {
  const { activeOnly = true, categoryId, includeCategory = true } = options;
  const [configs, setConfigs] = useState<FunctionalityConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfigs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      let query = supabase
        .from('system_prompt_functionality_configs')
        .select(includeCategory 
          ? `
            *,
            category:system_prompt_categories(
              id,
              label,
              color,
              icon_name
            )
          `
          : '*'
        )
        .order('sort_order', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      console.log('[useFunctionalityConfigs] Executing query with options:', { activeOnly, categoryId, includeCategory });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('[useFunctionalityConfigs] Supabase query error:', fetchError);
        throw fetchError;
      }

      console.log('[useFunctionalityConfigs] Query returned data:', data?.length, 'configs');

      // Merge with hardcoded functionality definitions
      const enrichedConfigs = (data || []).map((config: any) => {
        const hardcodedFunc = SYSTEM_FUNCTIONALITIES[config.functionality_id];
        if (!hardcodedFunc) {
          console.warn('[useFunctionalityConfigs] No hardcoded definition for:', config.functionality_id);
        }
        return {
          ...config,
          requiredVariables: hardcodedFunc?.requiredVariables || [],
          optionalVariables: hardcodedFunc?.optionalVariables || [],
          placementTypes: hardcodedFunc?.placementTypes || []
        };
      });

      console.log('[useFunctionalityConfigs] Enriched configs:', enrichedConfigs.length);
      setConfigs(enrichedConfigs);
    } catch (err) {
      console.error('[useFunctionalityConfigs] CATCH block - Error type:', err?.constructor?.name, 'Error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly, categoryId, includeCategory]);

  return {
    configs,
    isLoading,
    error,
    refetch: fetchConfigs
  };
}

/**
 * Hook to get functionality configs grouped by category
 */
export function useFunctionalityConfigsByCategory(
  options: UseFunctionalityConfigsOptions = {}
) {
  const { configs, isLoading, error, refetch } = useFunctionalityConfigs({
    ...options,
    includeCategory: true
  });

  // Group configs by category - MEMOIZED to prevent infinite re-renders
  const configsByCategory = useMemo(() => {
    return configs.reduce((acc, config) => {
      if (!config.category) return acc;
      
      const categoryName = config.category.label;
      if (!acc[categoryName]) {
        acc[categoryName] = {
          category: config.category,
          configs: []
        };
      }
      acc[categoryName].configs.push(config);
      return acc;
    }, {} as Record<string, { category: FunctionalityConfig['category']; configs: FunctionalityConfig[] }>);
  }, [configs]);

  return {
    configsByCategory,
    isLoading,
    error,
    refetch
  };
}

