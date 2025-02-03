// utils/brokerNameUtils.ts
function generateNewBroker() {
    const randomNumber = Math.floor(Math.random() * 900) + 100;
    return `New Broker ${randomNumber}`;
}

export const generateChipLabel = (content: string) => {
    // Check if content is null, undefined, or less than 3 characters
    if (!content || content.trim().length < 3) {
        return generateNewBroker();
    }

    const contentType = detectContentType(content);

    return (() => {
        switch (contentType) {
            case 'code':
                return formatCodeContent(content);
            case 'json':
                return formatJsonContent(content);
            case 'markdown':
                return formatMarkdownContent(content);
            default:
                return formatPlainText(content);
        }
    })();
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
