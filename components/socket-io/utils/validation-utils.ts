/**
 * Utilities for handling form validation
 */

/**
 * Maps validation errors to form fields
 * @param isValid Whether the form is valid overall
 * @param validationErrors Array of validation error messages
 * @param schemaKeys List of keys in the form schema
 * @returns Record of field keys with boolean error states
 */
export const mapValidationErrorsToFields = (
    isValid: boolean, 
    validationErrors: string[], 
    schemaKeys: string[]
): Record<string, boolean> => {
    const result: Record<string, boolean> = {};
    
    if (!isValid) {
        // Map validation errors to specific fields
        schemaKeys.forEach(key => {
            // Check if any error message contains this field key
            result[key] = validationErrors.some(err => 
                err.includes(`'${key}'`) || 
                err.toLowerCase().includes(key.toLowerCase())
            );
        });
    }
    
    return result;
};

/**
 * Maps validation error messages to fields as notices
 * @param validationErrors Array of validation error messages
 * @returns Record of field keys with error message notices
 */
export const mapValidationMessagesToNotices = (
    validationErrors: string[]
): Record<string, string> => {
    const result: Record<string, string> = {};
    
    // Parse error messages to determine which field they apply to
    validationErrors.forEach(error => {
        // Look for field names in quotes, e.g., Field 'fieldName' is required
        const fieldMatch = error.match(/Field '([^']+)'/);
        if (fieldMatch && fieldMatch[1]) {
            result[fieldMatch[1]] = error;
        }
    });
    
    return result;
}; 