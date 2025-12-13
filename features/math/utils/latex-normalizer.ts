/**
 * LaTeX Normalization Utilities
 * 
 * Automatically fixes common AI mistakes in LaTeX formatting to be more forgiving.
 * Includes fixes for:
 * - Fraction notation (1/2 → \frac{1}{2})
 * - Spacing around equals signs
 * - Common notation issues (** → ^)
 * - Escape sequence corruption (\text → [TAB]ext when from JSON)
 */

/**
 * Fix LaTeX escape sequences that were corrupted during JSON parsing
 * When JSON contains single backslashes (should be double), they get interpreted
 * as escape sequences: \t → tab, \n → newline, etc.
 * 
 * This function repairs common LaTeX commands that were corrupted this way.
 * 
 * Examples:
 *   "$[TAB]ext{H}_2$" → "$\text{H}_2$"
 *   "$[NEWLINE]abla$" → "$\nabla$"
 */
export function fixLatexEscapeSequences(content: string): string {
    // Pattern to match math delimiters and their content
    const mathPattern = /(\$\$?)((?:(?!\1)[\s\S])*?)(\$\$?)/g;
    
    return content.replace(mathPattern, (match, openDelim, mathContent, closeDelim) => {
        // Fix common escape sequence issues in LaTeX commands
        let fixed = mathContent;
        
        // Tab character (\t) - Common in: \text, \textbf, \textit, \textrm, etc.
        const tabChar = '\t';
        const newlineChar = '\n';
        const carriageReturnChar = '\r';
        const formFeedChar = '\f';
        
        // Fix \text commands that became [TAB]ext
        fixed = fixed.replace(new RegExp(tabChar + '(ext[a-z]*)', 'gi'), '\\t$1');
        
        // Fix \n commands (newline became literal newline)
        fixed = fixed.replace(new RegExp(newlineChar + '([a-z]+)', 'g'), '\\n$1');
        
        // Fix \r commands (carriage return became literal)
        fixed = fixed.replace(new RegExp(carriageReturnChar + '([a-z]+)', 'g'), '\\r$1');
        
        // Fix \f commands (form feed became literal)
        fixed = fixed.replace(new RegExp(formFeedChar + '([a-z]+)', 'g'), '\\f$1');
        
        // Reconstruct the math block
        return `${openDelim}${fixed}${closeDelim}`;
    });
}

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
 * 
 * @param text - Text containing LaTeX notation
 * @param options - Optional configuration
 * @param options.fixEscapeSequences - Fix corrupted escape sequences from JSON (default: true)
 */
export function normalizeLaTeX(text: string, options: { fixEscapeSequences?: boolean } = {}): string {
    if (!text || typeof text !== 'string') return text;
    
    const { fixEscapeSequences = true } = options;
    
    let normalized = text;
    
    // Apply all normalizations in order
    // 1. Fix escape sequences first (if content came from JSON with single backslashes)
    if (fixEscapeSequences) {
        normalized = fixLatexEscapeSequences(normalized);
    }
    
    // 2. Convert fractions to LaTeX notation
    normalized = convertFractionsToLatex(normalized);
    
    // 3. Normalize spacing
    normalized = normalizeEqualsSpacing(normalized);
    
    // 4. Fix common notation issues
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

