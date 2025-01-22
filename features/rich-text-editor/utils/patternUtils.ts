export const MATRX_PATTERN = /\{(.*?)\}!/gs;
export const MATRX_BARE_UUID = /{([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}!/gs;
export const MATRX_ID_PATTERN = /{([a-zA-Z_][a-zA-Z0-9_]*:[^:}]+(?:::(?:[a-zA-Z_][a-zA-Z0-9_]*:[^:}]+))*)}!/gs;

export const PATTERN_OPTIONS = {
    basic: MATRX_PATTERN,
    UUID: MATRX_BARE_UUID,
    recordkey: MATRX_ID_PATTERN,
};

type PatternKey = keyof typeof PATTERN_OPTIONS;
type PatternMatch = {
    pattern: PatternKey;
    matches: string[];
};

/**
 * Find all matches for specified MATRX patterns in content
 * @param content The text content to search through
 * @param patterns Array of pattern names to match against ('basic', 'UUID', 'recordkey')
 * @returns Array of objects containing pattern name and its matches
 */
export const findMatrxPatterns = (
    content: string,
    patterns: PatternKey[]
): PatternMatch[] => {
    const validPatterns = patterns.filter((p): p is PatternKey => 
        p in PATTERN_OPTIONS
    );

    return validPatterns.map(patternName => {
        // Reset the regex lastIndex to ensure fresh search
        PATTERN_OPTIONS[patternName].lastIndex = 0;
        
        // Find all matches for this pattern
        const matches = Array.from(
            content.matchAll(PATTERN_OPTIONS[patternName]),
            match => match[1]  // Get the captured group instead of full match
        );

        return {
            pattern: patternName,
            matches: matches
        };
    });
};

/**
 * Find all MATRX pattern matches in content
 * @param content The text content to search through
 * @returns Array of matched strings without delimiters
 */
export const findMatrxMatches = (content: string): string[] => {
    // Reset the regex lastIndex
    MATRX_PATTERN.lastIndex = 0;
    
    // Return all matches
    return Array.from(
        content.matchAll(MATRX_PATTERN),
        match => match[1]
    );
};


/**
 * Find and parse all MATRX ID patterns in content into record objects
 * @param content The text content to search through
 * @returns Array of parsed record objects
 */
export const findMatrxRecords = (content: string): Record<string, unknown>[] => {
    // Reset the regex lastIndex
    MATRX_ID_PATTERN.lastIndex = 0;
    
    // Find all ID pattern matches and parse them
    return Array.from(
        content.matchAll(MATRX_ID_PATTERN),
        match => match[1] // Get the captured content without delimiters
    ).map(idContent => {
        // Parse each ID content using the same logic as parseRecordKey
        return idContent.split('::').reduce((acc, pair) => {
            const [field, value] = pair.split(':');
            if (field && value !== undefined) {
                acc[field] = value;
            } else {
                throw new Error(`Invalid format in record key part: ${pair}`);
            }
            return acc;
        }, {} as Record<string, unknown>);
    });
};