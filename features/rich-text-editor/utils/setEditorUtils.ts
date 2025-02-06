import { BrokerMetaData } from '../../../types/editor.types';
import { MATRX_PATTERN, parseMatrxMetadata } from './patternUtils';

interface LineSegment {
    type: 'text' | 'chip';
    content: string;
    metadata?: string;
}

interface ProcessedLine {
    segments: LineSegment[];
    isFirstLine: boolean;
    isEmpty: boolean;
}

export const processContentLines = (content: string): ProcessedLine[] => {
    // First, protect all chip content
    const chips: { start: number; end: number; content: string }[] = [];
    let match;
    
    MATRX_PATTERN.lastIndex = 0;
    while ((match = MATRX_PATTERN.exec(content))) {
        chips.push({
            start: match.index,
            end: match.index + match[0].length,
            content: match[0]
        });
    }

    const protectedRanges = chips.map(chip => ({
        start: chip.start,
        end: chip.end
    }));

    const isProtected = (index: number): boolean => {
        return protectedRanges.some(range => 
            index >= range.start && index < range.end
        );
    };

    // Split content into first line and rest
    let firstLineEnd = -1;
    let searchIndex = 0;
    
    // Find the first unprotected newline
    while (searchIndex < content.length) {
        if (content[searchIndex] === '\n' && !isProtected(searchIndex)) {
            firstLineEnd = searchIndex;
            break;
        }
        searchIndex++;
    }

    // Handle case where there is no newline
    if (firstLineEnd === -1) {
        firstLineEnd = content.length;
    }

    // Get first line and remaining content
    const firstLine = content.slice(0, firstLineEnd);
    const remainingContent = firstLineEnd < content.length ? 
        content.slice(firstLineEnd + 1) : '';

    // Process remaining content for line breaks
    const remainingLines: string[] = [];
    if (remainingContent) {
        let lastPos = 0;
        searchIndex = 0;

        while (searchIndex < remainingContent.length) {
            if (remainingContent[searchIndex] === '\n' && !isProtected(searchIndex)) {
                remainingLines.push(remainingContent.slice(lastPos, searchIndex));
                lastPos = searchIndex + 1;
            }
            searchIndex++;
        }

        // Add final line if exists
        if (lastPos < remainingContent.length) {
            remainingLines.push(remainingContent.slice(lastPos));
        }
    }

    // Process all lines into segments
    const processLineContent = (lineContent: string, isFirst: boolean): ProcessedLine => {
        if (lineContent === '' || lineContent === '\n') {
            return {
                segments: [],
                isFirstLine: isFirst,
                isEmpty: true,
            };
        }

        const segments: LineSegment[] = [];
        let lastIndex = 0;
        
        MATRX_PATTERN.lastIndex = 0;
        while ((match = MATRX_PATTERN.exec(lineContent))) {
            if (match.index > lastIndex) {
                segments.push({
                    type: 'text',
                    content: lineContent.slice(lastIndex, match.index),
                });
            }

            segments.push({
                type: 'chip',
                content: match[0],
                metadata: match[1]
            });

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < lineContent.length) {
            segments.push({
                type: 'text',
                content: lineContent.slice(lastIndex),
            });
        }

        return {
            segments,
            isFirstLine: isFirst,
            isEmpty: false,
        };
    };

    // Combine first line and remaining lines
    const allProcessedLines = [
        processLineContent(firstLine, true),
        ...remainingLines.map((line, index) => processLineContent(line, false))
    ];

    // Handle trailing newline case
    if (content.endsWith('\n') && !isProtected(content.length - 1)) {
        allProcessedLines.push({
            segments: [],
            isFirstLine: false,
            isEmpty: true,
        });
    }

    return allProcessedLines;
};

export const createEmptyLine = (isFirstLine: boolean): HTMLElement => {
    const container = document.createElement(isFirstLine ? 'span' : 'div');
    const span = document.createElement('span');
    const br = document.createElement('br');
    span.appendChild(br);
    container.appendChild(span);
    return container;
};

export const createTextOnlyLine = (text: string, isFirstLine: boolean): HTMLElement => {
    const container = document.createElement(isFirstLine ? 'span' : 'div');
    const span = document.createElement('span');
    span.appendChild(document.createTextNode(text));
    container.appendChild(span);
    return container;
};

interface ChipStructureResult {
    insertionWrapper: HTMLSpanElement;
    chipWrapper: HTMLSpanElement;
    chip: HTMLSpanElement;
    anchorNode: Text;
}

export const createChipLine = (
    segments: LineSegment[],
    isFirstLine: boolean,
    createChipStructure: (metadata: BrokerMetaData) => ChipStructureResult
): HTMLElement => {
    const container = document.createElement(isFirstLine ? 'span' : 'div');
    const span = document.createElement('span');
    
    segments.forEach((segment) => {
        if (segment.type === 'text') {
            span.appendChild(document.createTextNode(segment.content));
        } else if (segment.type === 'chip' && segment.metadata) {
            const metadata = parseMatrxMetadata(segment.metadata);
            const { insertionWrapper } = createChipStructure(metadata);
            span.appendChild(insertionWrapper);
        }
    });

    container.appendChild(span);
    return container;
};