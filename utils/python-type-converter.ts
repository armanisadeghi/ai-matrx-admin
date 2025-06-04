/**
 * Converts Python type abbreviations to user-friendly display names
 * 
 * @param pythonType - The Python type abbreviation (e.g., 'str', 'int', 'bool')
 * @returns User-friendly display name
 */
export function convertPythonTypeToDisplay(pythonType: string | null | undefined): string {
    // Handle null/undefined cases
    if (!pythonType || typeof pythonType !== 'string') {
        return 'Unknown Type';
    }
    
    const type = pythonType.toLowerCase().trim();
    
    const typeMapping: Record<string, string> = {
        'str': 'Text',
        'int': 'Number',
        'float': 'Decimal Number', 
        'dict': 'Data Object',
        'list': 'List',
        'bool': 'True/False',
        'url': 'URL',
        // Additional common variations
        'string': 'Text',
        'integer': 'Number',
        'boolean': 'True/False',
        'array': 'List',
        'object': 'Data Object'
    };
    
    return typeMapping[type] || pythonType; // Return original if no mapping found
}

/**
 * Gets a more descriptive explanation for Python types
 * 
 * @param pythonType - The Python type abbreviation
 * @returns Detailed description of the type
 */
export function getPythonTypeDescription(pythonType: string | null | undefined): string {
    // Handle null/undefined cases
    if (!pythonType || typeof pythonType !== 'string') {
        return 'Type information not available';
    }
    
    const type = pythonType.toLowerCase().trim();
    
    const descriptionMapping: Record<string, string> = {
        'str': 'A text string value',
        'int': 'A whole number (integer)',
        'float': 'A decimal number with fractional values',
        'dict': 'A structured data object with key-value pairs',
        'list': 'An ordered collection of items',
        'bool': 'A true or false value',
        'url': 'A web address or URL string'
    };
    
    return descriptionMapping[type] || `A ${pythonType} value`;
} 