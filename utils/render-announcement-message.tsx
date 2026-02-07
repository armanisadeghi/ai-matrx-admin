import React from 'react';

/**
 * Parses markdown-style links [text](url) in announcement messages
 * and renders them as clickable anchor elements.
 * 
 * Only allows http/https URLs to prevent XSS via javascript: URIs.
 * 
 * @example
 * renderAnnouncementMessage("Check [our docs](https://example.com) for details")
 * // Returns: ["Check ", <a href="...">our docs</a>, " for details"]
 */
export function renderAnnouncementMessage(message: string): React.ReactNode[] {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = linkRegex.exec(message)) !== null) {
        if (match.index > lastIndex) {
            parts.push(message.substring(lastIndex, match.index));
        }

        const linkText = match[1];
        const linkUrl = match[2];

        if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
            parts.push(
                <a
                    key={key++}
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium"
                >
                    {linkText}
                </a>
            );
        } else {
            // Non-http URL — render as plain text for safety
            parts.push(match[0]);
        }

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < message.length) {
        parts.push(message.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [message];
}
