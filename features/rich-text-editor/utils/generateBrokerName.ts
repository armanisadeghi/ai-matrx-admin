import { ChipData, ChipRequestOptions } from "../_dev/types";

// utils/brokerNameUtils.ts
interface LabelGeneratorOptions {
    chipData: ChipData[];
    requestOptions: ChipRequestOptions;
}

const getNextNumericSuffix = (baseLabel: string, existingLabels: Set<string>): string => {
    if (!existingLabels.has(baseLabel)) return baseLabel;

    let counter = 1;
    let newLabel = `${baseLabel} - ${counter}`;

    while (existingLabels.has(newLabel)) {
        counter++;
        newLabel = `${baseLabel} - ${counter}`;
    }

    return newLabel;
};

const getNextDefaultChipNumber = (existingLabels: Set<string>): string => {
    const baseLabel = 'New Chip';
    let counter = 1;
    let label = `${baseLabel} ${counter}`;

    while (existingLabels.has(label)) {
        counter++;
        label = `${baseLabel} ${counter}`;
    }

    return label;
};

export const generateChipLabel = ({ chipData, requestOptions }: LabelGeneratorOptions): string => {
    // Extract existing labels from chip data
    const existingLabels = new Set(chipData.map((chip) => chip.label));

    // If label is provided in options, ensure it's unique
    if (requestOptions.label) {
        return getNextNumericSuffix(requestOptions.label, existingLabels);
    }

    // If we have string value, generate label based on content
    if (requestOptions.stringValue) {
        const contentType = detectContentType(requestOptions.stringValue);
        let baseLabel: string;

        switch (contentType) {
            case 'code':
                baseLabel = formatCodeContent(requestOptions.stringValue);
                break;
            case 'json':
                baseLabel = formatJsonContent(requestOptions.stringValue);
                break;
            case 'markdown':
                baseLabel = formatMarkdownContent(requestOptions.stringValue);
                break;
            default:
                baseLabel = formatPlainText(requestOptions.stringValue);
        }

        return getNextNumericSuffix(baseLabel, existingLabels);
    }

    // Default case: generate next available "New Chip" number
    return getNextDefaultChipNumber(existingLabels);
};

const detectContentType = (content: string): 'code' | 'json' | 'markdown' | 'text' => {
    // Code detection
    if (content.includes('import ') || content.includes('function ') || content.includes('class ') || content.includes('const ') || content.includes('let ')) {
        return 'code';
    }

    // JSON detection
    if (content.trim().startsWith('{') && content.includes('"')) {
        try {
            JSON.parse(content);
            return 'json';
        } catch {
            // Not valid JSON, continue checking
        }
    }

    // Markdown detection
    if (content.includes('```') || content.includes('##') || content.startsWith('#') || (content.includes('*') && content.includes('*'))) {
        return 'markdown';
    }

    return 'text';
};

const formatCodeContent = (content: string): string => {
    const lines = content.split('\n');
    // Find first significant line (function name, class name, etc.)
    const significantLine =
        lines.find(
            (line) => line.includes('function ') || line.includes('class ') || line.includes('const ') || line.includes('let ') || line.includes('import ')
        ) || lines[0];

    return significantLine
        .replace(/[^\w\s]/g, ' ')
        .replace(/(function|class|const|let|import|from)\s+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 30);
};

const formatJsonContent = (content: string): string => {
    try {
        const obj = JSON.parse(content);
        // Try to find a name/title/id property
        const nameProps = ['name', 'title', 'id', 'key'];
        for (const prop of nameProps) {
            if (obj[prop] && typeof obj[prop] === 'string') {
                return obj[prop].slice(0, 30);
            }
        }
        // Fallback to first property name
        return Object.keys(obj)[0]?.slice(0, 30) || 'JSON Object';
    } catch {
        return 'JSON Object';
    }
};

const formatMarkdownContent = (content: string): string => {
    // Try to find first heading
    const headingMatch = content.match(/^#+ (.+)$/m);
    if (headingMatch) {
        return headingMatch[1].trim().slice(0, 30);
    }

    // Fallback to first non-empty line
    const firstLine = content.split('\n').find((line) => line.trim()) || '';
    return firstLine.replace(/[#*`]/g, '').trim().slice(0, 30);
};

const formatPlainText = (content: string): string => {
    if (content.length <= 30) {
        return content.trim();
    }
    return content.slice(0, 30).trim() + '...';
};
