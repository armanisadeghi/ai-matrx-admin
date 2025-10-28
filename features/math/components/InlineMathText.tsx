"use client";

import React from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

interface InlineMathTextProps {
    text: string;
    className?: string;
}

/**
 * Component that renders text with inline LaTeX support
 * Converts \(...\) or $...$ notation to rendered math
 */
const InlineMathText: React.FC<InlineMathTextProps> = ({ text, className = "" }) => {
    if (!text) return null;

    // Split text by inline math delimiters: \(...\) or $...$
    // We'll use a regex to find both patterns
    const parts: Array<{ type: "text" | "math"; content: string }> = [];
    
    // Regex to match \(...\) or $...$
    // We need to handle escaped backslashes properly
    const inlineMathRegex = /\\\((.*?)\\\)|\$([^$]+)\$/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = inlineMathRegex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            parts.push({
                type: "text",
                content: text.slice(lastIndex, match.index)
            });
        }
        
        // Add the math content (either from \(...\) or $...$)
        const mathContent = match[1] || match[2];
        parts.push({
            type: "math",
            content: mathContent
        });
        
        lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after last match
    if (lastIndex < text.length) {
        parts.push({
            type: "text",
            content: text.slice(lastIndex)
        });
    }
    
    // If no math found, just return the text
    if (parts.length === 0) {
        return <span className={className}>{text}</span>;
    }
    
    return (
        <span className={className}>
            {parts.map((part, index) => {
                if (part.type === "math") {
                    return <InlineMath key={index} math={part.content} />;
                }
                return <React.Fragment key={index}>{part.content}</React.Fragment>;
            })}
        </span>
    );
};

export default InlineMathText;

