
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
    const chipPattern = /{([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}!/g;
    const matches = [];
    
    let match;
    while ((match = chipPattern.exec(text)) !== null) {
      matches.push({
        id: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        originalText: match[0]
      });
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
                isEmpty: true
            };
        }

        const chipMatches = findChipPatterns(line);
        const segments: LineSegment[] = [];
        let currentPosition = 0;

        chipMatches.forEach(match => {
            // Add text before chip if exists
            if (match.startIndex > currentPosition) {
                segments.push({
                    type: 'text',
                    content: line.slice(currentPosition, match.startIndex)
                });
            }

            // Add chip
            segments.push({
                type: 'chip',
                content: match.originalText,
                chipId: match.id
            });

            currentPosition = match.endIndex;
        });

        // Add remaining text if any
        if (currentPosition < line.length) {
            segments.push({
                type: 'text',
                content: line.slice(currentPosition)
            });
        }

        return {
            segments,
            isFirstLine: index === 0,
            isEmpty: false
        };
    });
};

/**
 * Create empty line element
 */
const createEmptyLine = (isFirstLine: boolean): HTMLElement => {
    const container = document.createElement(isFirstLine ? 'span' : 'div');
    const br = document.createElement('br');
    container.appendChild(br);
    return container;
};

/**
 * Process text-only line
 */
const createTextOnlyLine = (text: string, isFirstLine: boolean): HTMLElement => {
    const container = document.createElement(isFirstLine ? 'span' : 'div');
    container.textContent = text;
    return container;
};

