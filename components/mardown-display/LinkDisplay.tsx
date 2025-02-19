import React from "react";
import { Link as LinkIcon } from "lucide-react";

export const extractUrls = (text: string): { urls: string[]; cleanText: string } => {
    // Enhanced regex to capture URLs within markdown links, parentheses, and brackets
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const urlRegex = /(https?:\/\/[^\s)}\]]+)/g;
    
    let urls: string[] = [];
    let cleanText = text;

    // First handle markdown links [text](url)
    let markdownMatch;
    while ((markdownMatch = markdownLinkRegex.exec(text)) !== null) {
        const [fullMatch, linkText, url] = markdownMatch;
        urls.push(url);
        cleanText = cleanText.replace(fullMatch, linkText);
    }

    // Then handle remaining URLs
    let match;
    while ((match = urlRegex.exec(cleanText)) !== null) {
        const url = match[0];
        urls.push(url);
        // Remove the URL and any surrounding brackets/parentheses
        cleanText = cleanText.replace(/[\[\({]?${url}[\]\)}]?/g, '');
    }

    // Clean up any remaining empty brackets or parentheses and extra whitespace
    cleanText = cleanText
        .replace(/[\[\](){}]/g, '')  // Remove any remaining brackets
        .replace(/\s+/g, ' ')        // Normalize whitespace
        .replace(/\s*-\s*$/, '')     // Remove trailing hyphens
        .replace(/^\s*-\s*/, '')     // Remove leading hyphens
        .trim();

    return { 
        urls: urls.map(url => url.trim()),
        cleanText 
    };
};

export const formatUrlForDisplay = (url: string) => {
    try {
        const urlObj = new URL(url);
        // Clean up the URL for display (remove www, etc)
        const domain = urlObj.hostname.replace(/^www\./, '');
        return {
            domain,
            path: urlObj.pathname.length > 1 ? urlObj.pathname : "",
            fullUrl: url,
        };
    } catch {
        return { domain: url, path: "", fullUrl: url };
    }
};

export const LinkDisplay = ({ url, children, className = "" }) => {
    const { domain, fullUrl } = formatUrlForDisplay(url);

    return (
        <div className={`relative flex flex-col ${className}`}>
            {/* Main content */}
            <div className="flex-grow">
                {children}
            </div>
            
            {/* Link container - always at bottom right */}
            <div className="mt-2 self-end">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    aria-label={`Visit ${domain}`}
                >
                    <LinkIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                        {domain}
                    </span>
                    
                    {/* Tooltip */}
                    <span 
                        className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all 
                                 absolute right-0 -bottom-8 bg-gray-900 text-white dark:bg-gray-700 
                                 px-2 py-1 rounded text-xs whitespace-nowrap z-10"
                        role="tooltip"
                    >
                        {fullUrl}
                    </span>
                </a>
            </div>
        </div>
    );
};