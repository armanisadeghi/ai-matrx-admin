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
    // Split on newlines but preserve the exact number of empty lines
    const lines = content.split('\n');

    let previousWasEmpty = false;  // Track consecutive empty lines
    
    return lines.map((line, index) => {
        const trimmedLine = line.trim();
        
        // Handle empty lines
        if (trimmedLine === '') {
            // If this is an empty line, mark it as a true empty line
            // but don't create additional ones
            const result = {
                segments: [],
                isFirstLine: index === 0,
                isEmpty: true,
            };
            previousWasEmpty = true;
            return result;
        }

        // Non-empty line processing
        previousWasEmpty = false;
        const segments: LineSegment[] = [];
        let lastIndex = 0;
        let match;

        MATRX_PATTERN.lastIndex = 0;
        while ((match = MATRX_PATTERN.exec(line))) {
            if (match.index > lastIndex) {
                segments.push({
                    type: 'text',
                    content: line.slice(lastIndex, match.index),
                });
            }

            segments.push({
                type: 'chip',
                content: match[0],
                metadata: match[1],
            });

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < line.length) {
            segments.push({
                type: 'text',
                content: line.slice(lastIndex),
            });
        }

        return {
            segments,
            isFirstLine: index === 0,
            isEmpty: false,
        };
    }).filter((line, index, array) => {
        // Filter out consecutive empty lines
        if (index > 0 && line.isEmpty && array[index - 1].isEmpty) {
            return false;
        }
        return true;
    });
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