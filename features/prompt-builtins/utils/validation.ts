import { ScopeMapping } from '../types';
import { PromptVariable } from '@/features/prompts/types/core';

/**
 * Validation utilities for prompt builtins feature
 * These are placeholders to be implemented in a later phase
 */

// ============================================================================
// Scope Mapping Validation
// ============================================================================

/**
 * TODO: Validate that scope_mappings reference valid variable names from the prompt's variable_defaults
 * 
 * This function should:
 * 1. Check that all values in scope_mappings exist in the prompt's variable_defaults array
 * 2. Warn if the same variable is mapped multiple times (weird but valid)
 * 3. Return validation errors if any
 * 
 * @param scopeMappings - The scope mappings to validate
 * @param variableDefaults - The prompt's variable defaults
 * @returns Validation result with any errors
 */
export function validateScopeMappings(
  scopeMappings: ScopeMapping | null,
  variableDefaults: PromptVariable[] | null
): { valid: boolean; errors: string[]; warnings: string[] } {
  // Placeholder implementation
  // TODO: Implement full validation logic
  
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!scopeMappings) {
    return { valid: true, errors, warnings };
  }

  if (!variableDefaults || variableDefaults.length === 0) {
    // If prompt has no variables but we're trying to map scopes, that's an error
    if (Object.keys(scopeMappings).length > 0) {
      errors.push('Cannot map scopes to a prompt with no variables');
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  // TODO: Implement the actual validation logic here
  // For now, just return valid
  return { valid: true, errors, warnings };
}

/**
 * TODO: Check if a scope mapping creates any conflicts or issues
 * 
 * @param scopeMappings - The scope mappings to check
 * @returns List of potential issues
 */
export function analyzeScopeMappingIssues(
  scopeMappings: ScopeMapping | null
): string[] {
  // Placeholder implementation
  // TODO: Implement analysis logic
  const issues: string[] = [];

  if (!scopeMappings) {
    return issues;
  }

  // Check for duplicate variable mappings
  const mappedVariables = Object.values(scopeMappings).filter(Boolean);
  const uniqueVariables = new Set(mappedVariables);
  
  if (mappedVariables.length !== uniqueVariables.size) {
    issues.push('Warning: Same variable is mapped to multiple scopes');
  }

  return issues;
}

/**
 * Validates that scope_mappings only use keys from available_scopes
 * 
 * @param scopeMappings - The scope mappings to validate
 * @param availableScopes - Array of scope keys that are allowed
 * @returns Validation result with errors
 */
export function validateScopeMappingKeys(
  scopeMappings: ScopeMapping | null,
  availableScopes: string[] | null
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!scopeMappings || Object.keys(scopeMappings).length === 0) {
    return { valid: true, errors };
  }

  if (!availableScopes || availableScopes.length === 0) {
    // If no available_scopes defined, allow any common scopes
    const mappedKeys = Object.keys(scopeMappings).filter(key => scopeMappings[key as keyof ScopeMapping]);
    const invalidKeys = mappedKeys.filter(key => !['selection', 'content', 'context'].includes(key));
    
    if (invalidKeys.length > 0) {
      errors.push(`Invalid scope keys (no available_scopes defined): ${invalidKeys.join(', ')}`);
    }
    
    return { valid: errors.length === 0, errors };
  }

  // Validate each mapped scope is in available_scopes
  const mappedKeys = Object.keys(scopeMappings).filter(key => scopeMappings[key as keyof ScopeMapping]);
  const invalidKeys = mappedKeys.filter(key => !availableScopes.includes(key));

  if (invalidKeys.length > 0) {
    errors.push(
      `Invalid scope keys: ${invalidKeys.join(', ')}. Available scopes: ${availableScopes.join(', ')}`
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates that mapped variable names exist in the prompt's variableDefaults
 * 
 * @param scopeMappings - The scope mappings to validate
 * @param variableDefaults - The prompt's variable defaults
 * @returns Validation result with errors
 */
export function validateMappedVariablesExist(
  scopeMappings: ScopeMapping | null,
  variableDefaults: PromptVariable[] | null
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!scopeMappings || Object.keys(scopeMappings).length === 0) {
    return { valid: true, errors };
  }

  if (!variableDefaults || variableDefaults.length === 0) {
    const mappedVars = Object.values(scopeMappings).filter(Boolean);
    if (mappedVars.length > 0) {
      errors.push('Cannot map scopes: prompt has no variables defined');
    }
    return { valid: errors.length === 0, errors };
  }

  // Get all variable names from variableDefaults
  const availableVarNames = new Set(variableDefaults.map(v => v.name));

  // Check each mapped variable exists
  const mappedVars = Object.values(scopeMappings).filter(Boolean);
  const missingVars = mappedVars.filter(varName => !availableVarNames.has(varName as string));

  if (missingVars.length > 0) {
    errors.push(
      `Mapped variables not found in prompt: ${missingVars.join(', ')}. ` +
      `Available variables: ${Array.from(availableVarNames).join(', ')}`
    );
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Prompt Builtin Validation
// ============================================================================

/**
 * TODO: Validate a prompt builtin structure
 * 
 * This should check:
 * 1. Messages array is not empty
 * 2. Messages have valid roles
 * 3. Variable defaults are properly structured
 * 4. Settings are valid
 * 
 * @param builtin - The builtin to validate
 * @returns Validation result
 */
export function validatePromptBuiltin(builtin: {
  messages: any[];
  variable_defaults?: any;
  settings?: any;
}): { valid: boolean; errors: string[] } {
  // Placeholder implementation
  // TODO: Implement full validation logic
  
  const errors: string[] = [];

  if (!builtin.messages || builtin.messages.length === 0) {
    errors.push('Prompt must have at least one message');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Relationship Validation
// ============================================================================

/**
 * TODO: Validate that a shortcut's references are valid
 * 
 * This should check:
 * 1. prompt_builtin_id exists
 * 2. category_id exists
 * 3. scope_mappings match the builtin's variables
 * 
 * @param shortcutData - The shortcut data to validate
 * @returns Validation result
 */
export async function validateShortcutReferences(shortcutData: {
  prompt_builtin_id: string;
  category_id: string;
  scope_mappings?: ScopeMapping | null;
}): Promise<{ valid: boolean; errors: string[] }> {
  // Placeholder implementation
  // TODO: Implement full validation logic with database checks
  
  const errors: string[] = [];

  // TODO: Check if prompt_builtin_id exists in database
  // TODO: Check if category_id exists in database
  // TODO: Fetch builtin's variable_defaults and validate scope_mappings

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Category Hierarchy Validation
// ============================================================================

/**
 * TODO: Validate category hierarchy doesn't create cycles
 * 
 * @param categoryId - The category ID
 * @param parentCategoryId - The parent category ID
 * @returns Validation result
 */
export async function validateCategoryHierarchy(
  categoryId: string,
  parentCategoryId: string | null
): Promise<{ valid: boolean; errors: string[] }> {
  // Placeholder implementation
  // TODO: Implement cycle detection logic
  
  const errors: string[] = [];

  if (parentCategoryId === categoryId) {
    errors.push('Category cannot be its own parent');
  }

  // TODO: Check for circular references in the hierarchy

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Export Validation Summary
// ============================================================================

/**
 * Summary of what validations need to be implemented:
 * 
 * 1. validateScopeMappings - Ensure scope mappings reference valid prompt variables
 * 2. analyzeScopeMappingIssues - Detect potential issues with scope mappings
 * 3. validatePromptBuiltin - Validate prompt structure and content
 * 4. validateShortcutReferences - Ensure shortcut references exist
 * 5. validateCategoryHierarchy - Prevent circular category hierarchies
 */

