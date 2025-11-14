/**
 * Functionality Helpers - Database-Driven
 * 
 * These functions replace the hardcoded SYSTEM_FUNCTIONALITIES lookups
 * with database queries.
 */

import { createClient } from '@/utils/supabase/client';
import type { FunctionalityConfig } from '@/hooks/useFunctionalityConfigs';

/**
 * Get functionality config by ID from database
 */
export async function getFunctionalityById(
  functionalityId: string
): Promise<FunctionalityConfig | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('system_prompt_functionality_configs')
    .select(`
      *,
      category:system_prompt_categories(
        id,
        label,
        color,
        icon_name
      )
    `)
    .eq('functionality_id', functionalityId)
    .single();

  if (error || !data) {
    console.error('[getFunctionalityById] Error:', error);
    return null;
  }

  return data as FunctionalityConfig;
}

/**
 * Get all functionality configs from database
 */
export async function getAllFunctionalities(
  activeOnly: boolean = true
): Promise<FunctionalityConfig[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('system_prompt_functionality_configs')
    .select(`
      *,
      category:system_prompt_categories(
        id,
        label,
        color,
        icon_name
      )
    `)
    .order('sort_order');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getAllFunctionalities] Error:', error);
    return [];
  }

  return (data || []) as FunctionalityConfig[];
}

/**
 * Get functionalities that support a specific placement type
 */
export async function getFunctionalitiesByPlacementType(
  placementType: string,
  activeOnly: boolean = true
): Promise<FunctionalityConfig[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('system_prompt_functionality_configs')
    .select(`
      *,
      category:system_prompt_categories(
        id,
        label,
        color,
        icon_name
      )
    `)
    .contains('placement_types', [placementType])
    .order('sort_order');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getFunctionalitiesByPlacementType] Error:', error);
    return [];
  }

  return (data || []) as FunctionalityConfig[];
}

/**
 * Extract variables from prompt snapshot
 */
export function extractVariablesFromPrompt(promptSnapshot: any): string[] {
  const variables = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  
  promptSnapshot.messages?.forEach((msg: any) => {
    if (msg.content) {
      let match;
      while ((match = regex.exec(msg.content)) !== null) {
        variables.add(match[1]);
      }
    }
  });
  
  return Array.from(variables);
}

/**
 * Validate that a prompt's variables match a functionality's requirements
 * 
 * A prompt is valid if it contains ALL required variables.
 * Extra variables are allowed since they may have default values.
 */
export async function validatePromptForFunctionality(
  promptSnapshot: any,
  functionalityId: string
): Promise<{ valid: boolean; missing: string[]; extra: string[] }> {
  const functionality = await getFunctionalityById(functionalityId);
  
  if (!functionality) {
    return { valid: false, missing: [], extra: [] };
  }

  // Extract variables from prompt
  const variables = extractVariablesFromPrompt(promptSnapshot);
  
  // Check required variables
  const missing = (functionality.required_variables || []).filter(v => !variables.includes(v));
  
  // Calculate extra variables for informational purposes
  const allowed = [
    ...(functionality.required_variables || []),
    ...(functionality.optional_variables || [])
  ];
  const extra = variables.filter(v => !allowed.includes(v));
  
  // A prompt is valid if it has ALL required variables
  // Extra variables are allowed (they may have defaults)
  return {
    valid: missing.length === 0,
    missing,
    extra
  };
}

/**
 * Check if a functionality supports a specific placement type
 */
export async function supportsPlacementType(
  functionalityId: string,
  placementType: string
): Promise<boolean> {
  const functionality = await getFunctionalityById(functionalityId);
  return functionality?.placement_types?.includes(placementType) || false;
}

