/**
 * LaTeX Normalization Utilities
 * 
 * Automatically fixes common AI mistakes in LaTeX formatting to be more forgiving.
 */

/**
 * Convert plain fraction notation to LaTeX \frac{} notation
 * Examples:
 *   "x = 1/2" -> "x = \frac{1}{2}"
 *   "Test x = -3/2" -> "Test x = -\frac{3}{2}"
 *   "f(1/2)" -> "f(\frac{1}{2})"
 */
function convertFractionsToLatex(text: string): string {
    // Match patterns like: -?(\d+)/(\d+) but not already in \frac{}
    // This regex looks for optional minus, digits, slash, digits
    // And ensures we're not already inside \frac{} by looking ahead/behind
    
    // Replace fractions that are not already in LaTeX format
    // Pattern: optional minus sign, one or more digits, slash, one or more digits
    return text.replace(/(?<!\\frac\{[^}]*)-?(\d+)\/(\d+)(?![^{]*\})/g, (match, num, denom) => {
        const isNegative = match.startsWith('-');
        if (isNegative) {
            return `-\\frac{${num}}{${denom}}`;
        }
        return `\\frac{${num}}{${denom}}`;
    });
}

/**
 * Ensure proper spacing around equals signs in LaTeX
 */
function normalizeEqualsSpacing(text: string): string {
    // Add spaces around = if not already present (but not inside LaTeX commands)
    return text.replace(/([^\\=\s])=([^=\s])/g, '$1 = $2');
}

/**
 * Fix common LaTeX notation issues
 */
function fixCommonLatexIssues(text: string): string {
    let result = text;
    
    // Convert ** to proper exponent notation if not already using ^
    result = result.replace(/(\w+)\*\*(\d+)/g, '$1^{$2}');
    
    // Ensure proper multiplication symbol (cdot) instead of * in LaTeX contexts
    // Only do this if we detect LaTeX-like content (has backslashes)
    if (result.includes('\\')) {
        result = result.replace(/\s\*\s/g, ' \\cdot ');
    }
    
    return result;
}

/**
 * Normalize all LaTeX-related content in a text string
 * This is the main function to call for cleaning up AI-generated content
 */
export function normalizeLaTeX(text: string): string {
    if (!text || typeof text !== 'string') return text;
    
    let normalized = text;
    
    // Apply all normalizations
    normalized = convertFractionsToLatex(normalized);
    normalized = normalizeEqualsSpacing(normalized);
    normalized = fixCommonLatexIssues(normalized);
    
    return normalized;
}

/**
 * Recursively apply LaTeX normalization to all string values in an object
 */
export function normalizeLatexInObject<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;
    
    const normalized = { ...obj } as any;
    
    for (const key in normalized) {
        const value = normalized[key];
        
        if (typeof value === 'string') {
            // Normalize string values
            normalized[key] = normalizeLaTeX(value);
        } else if (Array.isArray(value)) {
            // Recursively process arrays
            normalized[key] = value.map(item => 
                typeof item === 'object' ? normalizeLatexInObject(item) : 
                typeof item === 'string' ? normalizeLaTeX(item) : 
                item
            );
        } else if (typeof value === 'object' && value !== null) {
            // Recursively process nested objects
            normalized[key] = normalizeLatexInObject(value);
        }
    }
    
    return normalized as T;
}

/**
 * Normalize a math problem's LaTeX content
 * This processes all relevant fields in the problem structure
 */
export function normalizeMathProblemLatex(problem: any): any {
    return normalizeLatexInObject(problem);
}

