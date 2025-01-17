import { EditorHookResult } from "../useEditor";
import { findChipPatterns } from "./set-editor-utils";

interface ContentSegment {
    type: 'text' | 'chip' | 'linebreak';
    content: string;
    chipData?: {
        id?: string;
        brokerId?: string;
        stringValue?: string;
        // other chip properties
    };
    isFirstLine?: boolean;
}

/**
 * Parse content into segments we can process
 */
const parseContent = (content: string): ContentSegment[] => {
    const segments: ContentSegment[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
            segments.push({ type: 'linebreak', content: '\n' });
        }

        let currentIndex = 0;
        const chipMatches = findChipPatterns(line);

        // Handle text before first chip
        if (chipMatches.length > 0) {
            chipMatches.forEach(match => {
                // Add text before chip if any
                if (match.startIndex > currentIndex) {
                    segments.push({
                        type: 'text',
                        content: line.slice(currentIndex, match.startIndex),
                        isFirstLine: lineIndex === 0
                    });
                }

                // Add chip
                segments.push({
                    type: 'chip',
                    content: match.originalText,
                    chipData: {
                        id: match.id,
                        // other chip data will be added when processing
                    }
                });

                currentIndex = match.endIndex;
            });

            // Add remaining text after last chip if any
            if (currentIndex < line.length) {
                segments.push({
                    type: 'text',
                    content: line.slice(currentIndex),
                    isFirstLine: lineIndex === 0
                });
            }
        } else {
            // No chips in this line
            segments.push({
                type: 'text',
                content: line,
                isFirstLine: lineIndex === 0
            });
        }
    });

    return segments;
};

/**
 * Process each segment type appropriately
 */
const processSegments = async (segments: ContentSegment[], editorHook: EditorHookResult) => {
    const editorElement = document.getElementById(editorHook.editorId);
    if (!editorElement) return;

    let currentContainer = document.createElement('div');
    let isFirstLine = true;

    for (const segment of segments) {
        switch (segment.type) {
            case 'text':
                if (isFirstLine) {
                    const span = document.createElement('span');
                    span.textContent = segment.content;
                    currentContainer.appendChild(span);
                    isFirstLine = false;
                } else {
                    currentContainer.appendChild(document.createTextNode(segment.content));
                }
                break;

            case 'chip':
                // Here we need to either:
                // 1. Create a temporary selection range for the chip text
                // 2. Or implement a direct chip insertion method that doesn't rely on selection
                break;

            case 'linebreak':
                editorElement.appendChild(currentContainer);
                currentContainer = document.createElement('div');
                if (segment.content.trim() === '') {
                    currentContainer.appendChild(document.createElement('br'));
                }
                break;
        }
    }

    // Append final container if it has content
    if (currentContainer.hasChildNodes()) {
        editorElement.appendChild(currentContainer);
    }
};