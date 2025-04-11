export function parseMarkdownToText(markdown: string) {
    if (!markdown || typeof markdown !== 'string') {
        return '';
    }

    let result = markdown
        // Remove code blocks longer than 100 characters
        .replace(/```[\s\S]*?```/g, (match) => {
            // Extract content between triple backticks
            const codeContent = match.slice(3, -3).trim();
            return codeContent.length > 100 ? 'Please see the code provided' : codeContent;
        })
        // Remove inline code
        .replace(/`([^`]+)`/g, '$1')
        // Remove headers (#, ##, etc.)
        .replace(/^(#+)\s*/gm, '')
        // Remove bold and italic (** or __ or *)
        .replace(/(\*\*|__|\*)(.*?)\1/g, '$2')
        // Remove links [text](url)
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        // Remove images ![alt](url)
        .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
        // Remove blockquotes
        .replace(/^>\s*/gm, '')
        // Remove unordered list markers
        .replace(/^[-*+]\s+/gm, '')
        // Remove ordered list markers
        .replace(/^\d+\.\s+/gm, '')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
        // Trim whitespace
        .trim();

    return result;
}