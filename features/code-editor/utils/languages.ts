
// Normalize language for better syntax highlighting
export function normalizeLanguage(lang: string): string {
    const langLower = lang.toLowerCase();

    // Map common variations to standard language identifiers
    const languageMap: Record<string, string> = {
        'js': 'javascript',
        'ts': 'typescript',
        'jsx': 'jsx',
        'tsx': 'tsx',
        'react': 'typescript',
        'typescript': 'typescript',
        'javascript': 'javascript',
        'py': 'python',
        'python': 'python',
        'rb': 'ruby',
        'ruby': 'ruby',
        'go': 'go',
        'rust': 'rust',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'cs': 'csharp',
        'csharp': 'csharp',
        'php': 'php',
        'swift': 'swift',
        'kotlin': 'kotlin',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'json': 'json',
        'yaml': 'yaml',
        'yml': 'yaml',
        'xml': 'xml',
        'sql': 'sql',
        'bash': 'bash',
        'sh': 'bash',
        'shell': 'bash',
        'markdown': 'markdown',
        'md': 'markdown',
    };

    return languageMap[langLower] || lang;
}
