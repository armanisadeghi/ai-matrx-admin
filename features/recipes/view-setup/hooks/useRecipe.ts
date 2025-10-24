// hooks/useRecipe.ts
import { useQuery } from '@tanstack/react-query';

import type { RecipeComplete } from '@/features/recipes/view-setup/types';
import { supabase } from '@/utils/supabase/client';

export function useRecipe(recipeId: string) {
  return useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipe_complete')
        .select('*')
        .eq('recipe_id', recipeId)
        .single();

      if (error) throw error;
      return data as RecipeComplete;
    },
    enabled: !!recipeId,
  });
}

// Alternative: using the function
export function useRecipeFunction(recipeId: string) {
  return useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_recipe_complete', { recipe_uuid: recipeId });

      if (error) throw error;
      return data[0] as RecipeComplete;
    },
    enabled: !!recipeId,
  });
}

export function useRecipeVersions(recipeId: string) {
    return useQuery({
      queryKey: ['recipe-versions', recipeId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('compiled_recipe')
          .select('*')
          .eq('recipe_id', recipeId)
          .order('created_at', { ascending: false });
  
        if (error) throw error;
        return data;
      },
      enabled: !!recipeId,
    });
  }