/**
 * Variable Validation Utility
 * 
 * Analyzes prompt messages and variables to detect:
 * - Used variables (variables that appear in messages)
 * - Unused variables (defined but not referenced)
 * - Undefined variables (referenced but not defined)
 */

import { PromptMessage, PromptVariable } from "@/features/prompts/types/core";

/**
 * Regex pattern to match variables in the format {{variable_name}}
 * Captures the variable name between the double curly braces
 */
const VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

/**
 * Result of variable validation
 */
export interface VariableValidationResult {
    /** Variables that are defined and used in messages */
    usedVariables: string[];
    
    /** Variables that are defined but never used in messages */
    unusedVariables: string[];
    
    /** Variables that are referenced in messages but not defined */
    undefinedVariables: string[];
    
    /** Total count of defined variables */
    definedCount: number;
    
    /** Total count of unique variables found in messages */
    referencedCount: number;
    
    /** Whether there are any validation issues (unused or undefined variables) */
    hasIssues: boolean;
    
    /** Whether there are critical issues (undefined variables) */
    hasCriticalIssues: boolean;
}

/**
 * Extracts all variable references from a text string
 * @param text Text to extract variables from
 * @returns Array of unique variable names found in the text
 */
export function extractVariablesFromText(text: string): string[] {
    const matches = text.matchAll(VARIABLE_PATTERN);
    const variables = new Set<string>();
    
    for (const match of matches) {
        if (match[1]) {
            variables.add(match[1]);
        }
    }
    
    return Array.from(variables);
}

/**
 * Extracts all variable references from multiple text strings
 * @param texts Array of text strings to extract variables from
 * @returns Array of unique variable names found across all texts
 */
export function extractVariablesFromTexts(texts: string[]): string[] {
    const allVariables = new Set<string>();
    
    for (const text of texts) {
        const variables = extractVariablesFromText(text);
        variables.forEach(v => allVariables.add(v));
    }
    
    return Array.from(allVariables);
}

/**
 * Validates variables against messages
 * @param messages Array of prompt messages to analyze
 * @param systemMessage System/developer message content
 * @param definedVariables Array of defined variables
 * @returns Validation result with used, unused, and undefined variables
 */
export function validateVariables(
    messages: PromptMessage[],
    systemMessage: string,
    definedVariables: PromptVariable[]
): VariableValidationResult {
    // Extract all text content from messages
    const allTexts = [systemMessage, ...messages.map(m => m.content)];
    
    // Get all unique variable references from messages
    const referencedVariables = extractVariablesFromTexts(allTexts);
    
    // Get all defined variable names
    const definedVariableNames = definedVariables.map(v => v.name);
    
    // Find used variables (defined AND referenced)
    const usedVariables = definedVariableNames.filter(name => 
        referencedVariables.includes(name)
    );
    
    // Find unused variables (defined but NOT referenced)
    const unusedVariables = definedVariableNames.filter(name => 
        !referencedVariables.includes(name)
    );
    
    // Find undefined variables (referenced but NOT defined)
    const undefinedVariables = referencedVariables.filter(name => 
        !definedVariableNames.includes(name)
    );
    
    return {
        usedVariables: usedVariables.sort(),
        unusedVariables: unusedVariables.sort(),
        undefinedVariables: undefinedVariables.sort(),
        definedCount: definedVariableNames.length,
        referencedCount: referencedVariables.length,
        hasIssues: unusedVariables.length > 0 || undefinedVariables.length > 0,
        hasCriticalIssues: undefinedVariables.length > 0,
    };
}

/**
 * Checks if a text contains any variable references
 * @param text Text to check
 * @returns True if the text contains at least one variable reference
 */
export function containsVariables(text: string): boolean {
    return VARIABLE_PATTERN.test(text);
}

/**
 * Counts the number of variable references in a text
 * @param text Text to count variables in
 * @returns Number of variable references (including duplicates)
 */
export function countVariableReferences(text: string): number {
    const matches = text.matchAll(VARIABLE_PATTERN);
    return Array.from(matches).length;
}

/**
 * Replaces all variable references in a text with their values
 * @param text Text containing variable references
 * @param variableValues Map of variable names to their values
 * @param fallbackValue Optional fallback value for undefined variables (default: keeps original {{var}})
 * @returns Text with variables replaced
 */
export function replaceVariables(
    text: string,
    variableValues: Record<string, string>,
    fallbackValue?: string
): string {
    return text.replace(VARIABLE_PATTERN, (match, variableName) => {
        if (variableName in variableValues) {
            return variableValues[variableName];
        }
        return fallbackValue !== undefined ? fallbackValue : match;
    });
}

