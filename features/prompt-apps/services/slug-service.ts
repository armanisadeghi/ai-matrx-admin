/**
 * Prompt App Slug Service
 * 
 * Utilities for generating, validating, and managing app slugs
 */

import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// ============================================================================
// Slug Generation
// ============================================================================

/**
 * Generate multiple slug candidates for validation
 * Returns array of slugs in order of preference
 * 
 * @param promptName - The prompt name to convert to slug
 * @returns Array of 5 slug candidates, ordered by preference
 * 
 * @example
 * generateSlugCandidates('Debate Case Builder')
 * // Returns:
 * // ['debate-case-builder', 'debate-case-builder-app', 'my-debate-case-builder', 
 * //  'prompt-debate-case-builder', 'debate-case-builder-456']
 */
export function generateSlugCandidates(promptName: string): string[] {
  // Clean base name: lowercase, replace special chars with hyphens
  const cleanName = promptName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
  
  const candidates: string[] = [];
  
  // Option 1: Clean name without numbers (most preferred)
  candidates.push(cleanName);
  
  // Option 2: Add 'app' suffix
  const withAppSuffix = `${cleanName.substring(0, 46)}-app`;
  if (withAppSuffix !== cleanName) {
    candidates.push(withAppSuffix);
  }
  
  // Option 3: Add 'my-' prefix
  const withMyPrefix = `my-${cleanName.substring(0, 47)}`;
  if (withMyPrefix !== cleanName) {
    candidates.push(withMyPrefix);
  }
  
  // Option 4: Add 'prompt-' prefix
  const withPromptPrefix = `prompt-${cleanName.substring(0, 43)}`;
  if (withPromptPrefix !== cleanName && withPromptPrefix !== withMyPrefix) {
    candidates.push(withPromptPrefix);
  }
  
  // Option 5: Guaranteed unique with random 3-digit code (fallback)
  const randomCode = Math.floor(100 + Math.random() * 900);
  candidates.push(`${cleanName.substring(0, 46)}-${randomCode}`);
  
  return candidates;
}

/**
 * Legacy function - generates slug with random number
 * Use generateSlugCandidates + validateSlugsInBatch for better results
 * 
 * @deprecated Prefer generateSlugCandidates with validateSlugsInBatch
 */
export function generateAppSlug(promptName: string): string {
  const candidates = generateSlugCandidates(promptName);
  return candidates[candidates.length - 1]; // Return the one with random number
}

// ============================================================================
// Slug Validation
// ============================================================================

interface SlugValidationResult {
  slug: string;
  is_available: boolean;
  is_format_valid: boolean;
  error: string | null;
}

interface BatchSlugValidationResult {
  valid: SlugValidationResult[];
  invalid: SlugValidationResult[];
  available: string[];
}

/**
 * Validates a single slug for format and availability
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('validate_slugs', {
      slug_array: [slug],
    });

    if (error) throw error;

    if (!data || data.length === 0) return false;

    const result = data[0] as SlugValidationResult;
    return result.is_format_valid && result.is_available;
  } catch (error) {
    console.error('Error checking slug availability:', error);
    throw error;
  }
}

/**
 * Validates up to 5 slugs and returns availability status
 * Performs all validation in a single database call
 *
 * @param slugs - Array of 1-5 slugs to validate
 * @returns Object with separate arrays for valid/invalid slugs and available slug list
 */
export async function validateSlugsInBatch(
  slugs: string[]
): Promise<BatchSlugValidationResult> {
  if (!Array.isArray(slugs) || slugs.length === 0 || slugs.length > 5) {
    throw new Error('Provide between 1 and 5 slugs');
  }

  try {
    const { data, error } = await supabase.rpc('validate_slugs', {
      slug_array: slugs,
    });

    if (error) throw error;

    const results = (data || []) as SlugValidationResult[];

    const valid = results.filter(r => r.is_format_valid);
    const invalid = results.filter(r => !r.is_format_valid);
    const available = valid.filter(r => r.is_available).map(r => r.slug);

    return {
      valid,
      invalid,
      available,
    };
  } catch (error) {
    console.error('Error validating slugs:', error);
    throw error;
  }
}