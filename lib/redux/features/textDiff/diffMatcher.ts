// lib/redux/features/textDiff/diffMatcher.ts

import type {
    ParsedDiff,
    SearchReplaceDiff,
    LineRangeDiff,
    ApplyDiffsResult,
} from './types';

/**
 * Two-pass search for text matching
 * Pass 1: Exact match (including whitespace)
 * Pass 2: Fuzzy match (whitespace-stripped)
 */
export function findTextMatch(
    content: string,
    searchText: string
): {
    found: boolean;
    matchType: 'exact' | 'fuzzy' | 'none' | 'multiple';
    startIndex?: number;
    endIndex?: number;
    actualText?: string;
} {
    // Pass 1: Exact match
    const exactIndex = content.indexOf(searchText);
    if (exactIndex !== -1) {
        // Check if there are multiple exact matches
        const secondMatch = content.indexOf(searchText, exactIndex + 1);
        if (secondMatch !== -1) {
            return {
                found: false,
                matchType: 'multiple',
            };
        }

        return {
            found: true,
            matchType: 'exact',
            startIndex: exactIndex,
            endIndex: exactIndex + searchText.length,
            actualText: searchText,
        };
    }

    // Pass 2: Fuzzy match (whitespace-normalized)
    const normalizedSearch = normalizeWhitespace(searchText);
    const normalizedContent = normalizeWhitespace(content);

    const fuzzyIndex = normalizedContent.indexOf(normalizedSearch);
    if (fuzzyIndex === -1) {
        return {
            found: false,
            matchType: 'none',
        };
    }

    // Check for multiple fuzzy matches
    const secondFuzzyMatch = normalizedContent.indexOf(
        normalizedSearch,
        fuzzyIndex + 1
    );
    if (secondFuzzyMatch !== -1) {
        return {
            found: false,
            matchType: 'multiple',
        };
    }

    // Find actual position in original content
    const actualMatch = findActualTextPosition(
        content,
        fuzzyIndex,
        searchText.length
    );

    if (!actualMatch) {
        return {
            found: false,
            matchType: 'none',
        };
    }

    return {
        found: true,
        matchType: 'fuzzy',
        startIndex: actualMatch.startIndex,
        endIndex: actualMatch.endIndex,
        actualText: actualMatch.text,
    };
}

/**
 * Normalize whitespace for fuzzy matching
 * - Trims leading/trailing whitespace
 * - Converts multiple spaces to single space
 * - Converts tabs to spaces
 * - Normalizes line endings
 */
function normalizeWhitespace(text: string): string {
    return text
        .replace(/\t/g, ' ') // tabs to spaces
        .replace(/\r\n/g, '\n') // normalize line endings
        .replace(/\r/g, '\n') // normalize line endings
        .replace(/ +/g, ' ') // multiple spaces to single
        .replace(/\n +/g, '\n') // trim leading spaces on lines
        .replace(/ +\n/g, '\n') // trim trailing spaces on lines
        .trim();
}

/**
 * Find the actual position in the original content based on normalized position
 */
function findActualTextPosition(
    content: string,
    normalizedIndex: number,
    approximateLength: number
): {
    startIndex: number;
    endIndex: number;
    text: string;
} | null {
    // This is a simplified approach - we reconstruct positions
    let normalizedPos = 0;
    let actualPos = 0;

    // Move to the normalized position
    while (actualPos < content.length && normalizedPos < normalizedIndex) {
        const char = content[actualPos];
        const normalizedChar = normalizeWhitespace(char);

        if (normalizedChar.length > 0) {
            normalizedPos += normalizedChar.length;
        }

        actualPos++;
    }

    const startIndex = actualPos;

    // Extract approximately the right amount of text
    let endIndex = Math.min(
        actualPos + approximateLength * 2,
        content.length
    );

    // Refine the end position
    const extractedText = content.substring(startIndex, endIndex);
    const normalizedExtracted = normalizeWhitespace(extractedText);

    // Adjust endIndex to match the normalized length
    endIndex = startIndex + extractedText.length;

    return {
        startIndex,
        endIndex,
        text: content.substring(startIndex, endIndex),
    };
}

/**
 * Find lines in content by line range
 */
export function findLineRange(
    content: string,
    startLine: number,
    endLine: number
): {
    found: boolean;
    startIndex?: number;
    endIndex?: number;
    actualLines?: string[];
} {
    const lines = content.split('\n');

    // Convert to 0-based index
    const startIdx = startLine - 1;
    const endIdx = endLine - 1;

    if (startIdx < 0 || endIdx >= lines.length || startIdx > endIdx) {
        return { found: false };
    }

    const actualLines = lines.slice(startIdx, endIdx + 1);

    // Find character positions
    const startIndex = lines.slice(0, startIdx).join('\n').length + (startIdx > 0 ? 1 : 0);
    const endIndex = lines.slice(0, endIdx + 1).join('\n').length;

    return {
        found: true,
        startIndex,
        endIndex,
        actualLines,
    };
}

/**
 * Apply a single diff to content
 */
export function applySingleDiff(
    content: string,
    diff: ParsedDiff
): {
    success: boolean;
    newContent: string;
    error?: string;
} {
    if (diff.type === 'search_replace') {
        return applySearchReplaceDiff(content, diff);
    } else if (diff.type === 'line_range') {
        return applyLineRangeDiff(content, diff);
    }

    return {
        success: false,
        newContent: content,
        error: 'Unknown diff type',
    };
}

/**
 * Apply search/replace diff
 */
function applySearchReplaceDiff(
    content: string,
    diff: SearchReplaceDiff
): {
    success: boolean;
    newContent: string;
    error?: string;
} {
    const match = findTextMatch(content, diff.searchText);

    if (!match.found) {
        return {
            success: false,
            newContent: content,
            error:
                match.matchType === 'multiple'
                    ? 'Multiple matches found - ambiguous replacement'
                    : 'No match found',
        };
    }

    // Replace the text
    const before = content.substring(0, match.startIndex);
    const after = content.substring(match.endIndex);
    const newContent = before + diff.replaceText + after;

    return {
        success: true,
        newContent,
    };
}

/**
 * Apply line range diff
 */
function applyLineRangeDiff(
    content: string,
    diff: LineRangeDiff
): {
    success: boolean;
    newContent: string;
    error?: string;
} {
    const match = findLineRange(content, diff.startLine, diff.endLine);

    if (!match.found) {
        return {
            success: false,
            newContent: content,
            error: 'Line range not found or invalid',
        };
    }

    // Replace the lines
    const before = content.substring(0, match.startIndex);
    const after = content.substring(match.endIndex!);
    const newContent = before + diff.replaceText + after;

    return {
        success: true,
        newContent,
    };
}

/**
 * Apply multiple diffs in sequence
 * Returns new content and details about which diffs succeeded/failed
 */
export function applyMultipleDiffs(
    content: string,
    diffs: ParsedDiff[]
): ApplyDiffsResult {
    let currentContent = content;
    const appliedDiffs: string[] = [];
    const failedDiffs: Array<{ diffId: string; error: string }> = [];

    for (const diff of diffs) {
        const result = applySingleDiff(currentContent, diff);

        if (result.success) {
            currentContent = result.newContent;
            appliedDiffs.push(diff.id);
        } else {
            failedDiffs.push({
                diffId: diff.id,
                error: result.error || 'Unknown error',
            });
        }
    }

    return {
        success: failedDiffs.length === 0,
        newContent: currentContent,
        appliedDiffs,
        failedDiffs,
    };
}

/**
 * Process diffs and update their match info
 * This validates each diff against the content and populates matchInfo
 */
export function processDiffsMatchInfo(
    content: string,
    diffs: ParsedDiff[]
): ParsedDiff[] {
    return diffs.map((diff) => {
        if (diff.type === 'search_replace') {
            const match = findTextMatch(content, diff.searchText);
            return {
                ...diff,
                matchInfo: match,
            };
        } else if (diff.type === 'line_range') {
            const match = findLineRange(content, diff.startLine, diff.endLine);
            return {
                ...diff,
                matchInfo: match,
            };
        }

        return diff;
    });
}
