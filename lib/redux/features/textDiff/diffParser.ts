// lib/redux/features/textDiff/diffParser.ts

import type { ParsedDiff, SearchReplaceDiff, LineRangeDiff } from './types';

/**
 * Parse AI response to extract diff blocks
 * Looks for ```diff and ```replace blocks
 */
export function parseAIResponse(response: string): ParsedDiff[] {
    const diffs: ParsedDiff[] = [];

    // Parse search/replace diffs (```diff blocks)
    const searchReplaceDiffs = parseSearchReplaceDiffs(response);
    diffs.push(...searchReplaceDiffs);

    // Parse line range diffs (```replace blocks)
    const lineRangeDiffs = parseLineRangeDiffs(response);
    diffs.push(...lineRangeDiffs);

    return diffs;
}

/**
 * Parse ```diff blocks for search/replace operations
 * Format:
 * ```diff
 * - old text to find
 * + new text to replace with
 * ```
 */
function parseSearchReplaceDiffs(response: string): SearchReplaceDiff[] {
    const diffs: SearchReplaceDiff[] = [];

    // Match all ```diff code blocks
    const diffBlockRegex = /```diff\s*\n([\s\S]*?)```/g;
    let match;

    while ((match = diffBlockRegex.exec(response)) !== null) {
        const blockContent = match[1];

        // Split into lines
        const lines = blockContent.split('\n');

        let searchText = '';
        let replaceText = '';
        let inSearch = false;
        let inReplace = false;

        for (const line of lines) {
            const trimmedLine = line.trimEnd();

            if (trimmedLine.startsWith('- ')) {
                // Search line
                const text = trimmedLine.substring(2);
                if (inReplace) {
                    // We've moved from replace back to search, so finish previous diff
                    if (searchText || replaceText) {
                        diffs.push(createSearchReplaceDiff(searchText, replaceText));
                        searchText = '';
                        replaceText = '';
                    }
                }
                searchText += (searchText ? '\n' : '') + text;
                inSearch = true;
                inReplace = false;
            } else if (trimmedLine.startsWith('+ ')) {
                // Replace line
                const text = trimmedLine.substring(2);
                replaceText += (replaceText ? '\n' : '') + text;
                inReplace = true;
            } else if (trimmedLine === '-') {
                // Empty removal line
                searchText += (searchText ? '\n' : '');
                inSearch = true;
                inReplace = false;
            } else if (trimmedLine === '+') {
                // Empty addition line
                replaceText += (replaceText ? '\n' : '');
                inReplace = true;
            } else if (trimmedLine && !trimmedLine.startsWith('#')) {
                // Non-empty line without +/- prefix (might be context)
                // Skip context lines
                continue;
            }
        }

        // Add final diff if we have content
        if (searchText || replaceText) {
            diffs.push(createSearchReplaceDiff(searchText, replaceText));
        }
    }

    return diffs;
}

/**
 * Parse ```replace blocks for line-based replacements
 * Format:
 * ```replace
 * START_LINE: 5
 * END_LINE: 12
 * ---
 * new content
 * goes here
 * ```
 */
function parseLineRangeDiffs(response: string): LineRangeDiff[] {
    const diffs: LineRangeDiff[] = [];

    // Match all ```replace code blocks
    const replaceBlockRegex = /```replace\s*\n([\s\S]*?)```/g;
    let match;

    while ((match = replaceBlockRegex.exec(response)) !== null) {
        const blockContent = match[1];

        // Extract START_LINE and END_LINE
        const startLineMatch = blockContent.match(/START_LINE:\s*(\d+)/i);
        const endLineMatch = blockContent.match(/END_LINE:\s*(\d+)/i);

        if (!startLineMatch || !endLineMatch) {
            console.warn('Invalid replace block: missing START_LINE or END_LINE');
            continue;
        }

        const startLine = parseInt(startLineMatch[1], 10);
        const endLine = parseInt(endLineMatch[1], 10);

        // Extract replacement text (everything after the ---)
        const separatorIndex = blockContent.indexOf('---');
        if (separatorIndex === -1) {
            console.warn('Invalid replace block: missing --- separator');
            continue;
        }

        const replaceText = blockContent
            .substring(separatorIndex + 3)
            .trim();

        diffs.push(createLineRangeDiff(startLine, endLine, replaceText));
    }

    return diffs;
}

/**
 * Create a SearchReplaceDiff object
 */
function createSearchReplaceDiff(
    searchText: string,
    replaceText: string
): SearchReplaceDiff {
    return {
        type: 'search_replace',
        id: generateDiffId(),
        searchText: searchText.trim(),
        replaceText: replaceText.trim(),
        status: 'pending',
    };
}

/**
 * Create a LineRangeDiff object
 */
function createLineRangeDiff(
    startLine: number,
    endLine: number,
    replaceText: string
): LineRangeDiff {
    return {
        type: 'line_range',
        id: generateDiffId(),
        startLine,
        endLine,
        replaceText: replaceText.trim(),
        status: 'pending',
    };
}

/**
 * Generate a unique diff ID
 */
function generateDiffId(): string {
    return `diff-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validate a diff block to ensure it's well-formed
 */
export function validateDiff(diff: ParsedDiff): { valid: boolean; error?: string } {
    if (diff.type === 'search_replace') {
        if (!diff.searchText && !diff.replaceText) {
            return { valid: false, error: 'Both search and replace text are empty' };
        }
        return { valid: true };
    } else if (diff.type === 'line_range') {
        if (diff.startLine < 1) {
            return { valid: false, error: 'Start line must be >= 1' };
        }
        if (diff.endLine < diff.startLine) {
            return { valid: false, error: 'End line must be >= start line' };
        }
        return { valid: true };
    }

    return { valid: false, error: 'Unknown diff type' };
}
