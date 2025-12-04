/**
 * Utility functions for handling prompt variables
 */

import { PromptMessage } from "@/features/prompts/types/core";

/**
 * Sanitizes a variable name to be valid for use in prompts.
 * 
 * Rules:
 * - Trims leading and trailing whitespace
 * - Converts to lowercase
 * - Replaces spaces and dashes with underscores
 * - Removes any characters that aren't letters, numbers, or underscores
 * - Removes multiple consecutive underscores
 * - Removes leading and trailing underscores
 * 
 * @param input - The raw variable name input from the user
 * @returns The sanitized variable name
 * 
 * @example
 * sanitizeVariableName("  User Name  ") // "user_name"
 * sanitizeVariableName("product-category") // "product_category"
 * sanitizeVariableName("API Key") // "api_key"
 * sanitizeVariableName("user__info___") // "user_info"
 * sanitizeVariableName("   ") // ""
 */
export const sanitizeVariableName = (input: string): string => {
    // Trim leading and trailing whitespace
    const trimmed = input.trim();
    
    // Convert to lowercase
    const lowercased = trimmed.toLowerCase();
    
    // Replace spaces and dashes with underscores
    const spacesAndDashesToUnderscores = lowercased.replace(/[\s-]+/g, "_");
    
    // Remove any characters that aren't letters, numbers, or underscores
    const alphanumericOnly = spacesAndDashesToUnderscores.replace(/[^a-z0-9_]/g, "");
    
    // Remove multiple consecutive underscores
    const singleUnderscores = alphanumericOnly.replace(/_+/g, "_");
    
    // Remove leading and trailing underscores
    const cleanedUnderscores = singleUnderscores.replace(/^_+|_+$/g, "");
    
    return cleanedUnderscores;
};

/**
 * Checks if the sanitized version of a variable name would be different from a simple lowercase version.
 * This is useful for determining whether to show a preview of the sanitized name to the user.
 * 
 * @param input - The raw variable name input from the user
 * @returns True if the sanitized version differs from a simple lowercase version
 */
export const shouldShowSanitizationPreview = (input: string): boolean => {
    const trimmed = input.trim();
    if (!trimmed) return false;
    
    const sanitized = sanitizeVariableName(input);
    const simpleLowercase = trimmed.toLowerCase();
    
    return sanitized !== simpleLowercase;
};

/**
 * Checks if a variable is used in any of the prompt messages (including system message).
 * 
 * @param variableName - The name of the variable to check
 * @param messages - Array of prompt messages to search through
 * @param systemMessage - Optional system/developer message to search through
 * @returns True if the variable is used (appears as {{variableName}}) in any message
 * 
 * @example
 * isVariableUsed("city", messages, systemMessage) // true if any message contains {{city}}
 */
export const isVariableUsed = (
    variableName: string,
    messages: PromptMessage[],
    systemMessage?: string
): boolean => {
    const variablePattern = `{{${variableName}}}`;
    
    // Check system message
    if (systemMessage && systemMessage.includes(variablePattern)) {
        return true;
    }
    
    // Check all messages
    return messages.some(message => message.content.includes(variablePattern));
};
