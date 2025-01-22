import { MatrxRecordId } from '@/types';
import { ChipData } from '../types/editor.types';
import { MATRX_PATTERN } from './patternUtils';

interface LineSegment {
    type: 'text' | 'chip';
    content: string;
    chipId?: string;
}

interface ProcessedLine {
    segments: LineSegment[];
    isFirstLine: boolean;
    isEmpty: boolean;
}

export const findChipPatterns = (text: string) => {
    const chipPattern = /\{([^}]+)\}!/g;
    const matches = [];

    let match;
    while ((match = chipPattern.exec(text)) !== null) {
        matches.push({
            id: match[1],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            originalText: match[0],
        });
    }

    return matches;
};

interface ChipMatch {
    key?: string;
    id: string;
    matrxRecordId?: MatrxRecordId
    startIndex: number;
    endIndex: number;
    originalText: string;
}

export const findAllChipPatterns = (text: string): ChipMatch[] => {
    const chipPattern = MATRX_PATTERN;
    const matches: ChipMatch[] = [];

    let match;
    while ((match = chipPattern.exec(text)) !== null) {
        const content = match[1]; // Content between { and }
        const colonIndex = content.indexOf(':');
        
        let chipMatch: ChipMatch;

        // If there's a colon, treat the entire content as a MatrxRecordId
        if (colonIndex !== -1) {
            const key = content.substring(0, colonIndex).trim();
            const value = content.substring(colonIndex + 1).trim();
            
            chipMatch = {
                key,
                id: value,
                matrxRecordId: content.trim(), // Direct string assignment
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                originalText: match[0]
            };
        } else {
            // If no colon, the entire content is just the id
            chipMatch = {
                id: content.trim(),
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                originalText: match[0]
            };
        }

        matches.push(chipMatch);
    }

    return matches;
};

/**
 * Process content into lines with proper segmentation
 */
export const processContentLines = (content: string): ProcessedLine[] => {
    const lines = content.split('\n');

    return lines.map((line, index) => {
        if (line.trim() === '') {
            return {
                segments: [],
                isFirstLine: index === 0,
                isEmpty: true,
            };
        }

        const chipMatches = findAllChipPatterns(line);
        const segments: LineSegment[] = [];
        let currentPosition = 0;

        chipMatches.forEach((match) => {
            // Add text before chip if exists
            if (match.startIndex > currentPosition) {
                segments.push({
                    type: 'text',
                    content: line.slice(currentPosition, match.startIndex),
                });
            }

            // Add chip
            segments.push({
                type: 'chip',
                content: match.originalText,
                chipId: match.id,
            });

            currentPosition = match.endIndex;
        });

        // Add remaining text if any
        if (currentPosition < line.length) {
            segments.push({
                type: 'text',
                content: line.slice(currentPosition),
            });
        }

        return {
            segments,
            isFirstLine: index === 0,
            isEmpty: false,
        };
    });
};

/**
 * Create empty line element
 */
export const createEmptyLine = (isFirstLine: boolean): HTMLElement => {
    const container = document.createElement(isFirstLine ? 'span' : 'div');
    const br = document.createElement('br');
    container.appendChild(br);
    return container;
};

/**
 * Process text-only line
 */
export const createTextOnlyLine = (text: string, isFirstLine: boolean): HTMLElement => {
    const container = document.createElement(isFirstLine ? 'span' : 'div');
    container.textContent = text;
    return container;
};

/**
 * Process line with chips
 */
export const createChipLine = (
    segments: LineSegment[],
    isFirstLine: boolean,
    createChipStructure: (chipData: ChipData) => {
        insertionWrapper: HTMLElement;
        anchorNode: Text;
    },
    chipDataMap: Map<string, ChipData>
): HTMLElement => {
    const container = document.createElement(isFirstLine ? 'span' : 'div');

    segments.forEach((segment, index) => {
        if (segment.type === 'text') {
            container.appendChild(document.createTextNode(segment.content));
        } else if (segment.type === 'chip' && segment.chipId) {
            const chipData = chipDataMap.get(segment.chipId);
            if (!chipData) {
                console.warn(`Chip data not found for id: ${segment.chipId}`);
                // Fallback to basic chip if data not found
                const { insertionWrapper } = createChipStructure({
                    id: segment.chipId,
                    label: segment.chipId,
                    stringValue: segment.content
                });
                container.appendChild(insertionWrapper);
            } else {
                const { insertionWrapper } = createChipStructure(chipData);
                container.appendChild(insertionWrapper);
            }
        }
    });

    return container;
};
