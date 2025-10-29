"use client";

import React from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

interface InlineMathTextProps {
    text: string | null | undefined;
    className?: string;
}

/**
 * Component that renders text with inline LaTeX support
 * Converts \(...\) or $...$ notation to rendered math
 * Also auto-detects common LaTeX commands like \frac, \sqrt, etc.
 */
const InlineMathText: React.FC<InlineMathTextProps> = ({ text, className = "" }) => {
    if (!text) return null;

    // Split text by inline math delimiters: \(...\) or $...$
    const parts: Array<{ type: "text" | "math"; content: string }> = [];
    
    // Regex to match \(...\) or $...$ (non-greedy)
    const inlineMathRegex = /\\\((.*?)\\\)|\$([^$]+?)\$/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = inlineMathRegex.exec(text)) !== null) {
        // Add text before the match (and check for auto-detectable math)
        if (match.index > lastIndex) {
            const textBefore = text.slice(lastIndex, match.index);
            parts.push(...processTextWithAutoMath(textBefore));
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
        const remainingText = text.slice(lastIndex);
        parts.push(...processTextWithAutoMath(remainingText));
    }
    
    // If no parts were created, just return the text
    if (parts.length === 0) {
        return <span className={className}>{text}</span>;
    }
    
    return (
        <span className={className}>
            {parts.map((part, index) => {
                if (part.type === "math") {
                    try {
                        return <InlineMath key={index} math={part.content} />;
                    } catch (error) {
                        // If KaTeX fails to render, show the raw content
                        console.warn("Failed to render math:", part.content, error);
                        return <span key={index} className="text-red-500">{part.content}</span>;
                    }
                }
                return <React.Fragment key={index}>{part.content}</React.Fragment>;
            })}
        </span>
    );
};

/**
 * Process text and auto-detect common LaTeX commands that should be rendered as math
 * Looks for patterns like \frac{}{}, \sqrt{}, ^{}, _{}, etc.
 */
function processTextWithAutoMath(text: string): Array<{ type: "text" | "math"; content: string }> {
    const parts: Array<{ type: "text" | "math"; content: string }> = [];
    
    // Regex to detect common LaTeX commands:
    // \frac{...}{...}, \sqrt{...}, \text{...}, x^{...}, x_{...}, etc.
    // This catches standalone LaTeX that wasn't wrapped in delimiters
    const latexCommandRegex = /\\(?:frac|sqrt|text|sum|prod|int|lim|infty|alpha|beta|gamma|delta|theta|pi|sigma|omega|cdot|times|div|pm|ne|le|ge|approx|equiv|subset|supset|cap|cup|in|notin|forall|exists|partial|nabla)\s*(?:\{[^}]*\})*(?:\{[^}]*\})?|[a-zA-Z]\^?\{[^}]+\}|[a-zA-Z]_\{[^}]+\}/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = latexCommandRegex.exec(text)) !== null) {
        // Add plain text before the match
        if (match.index > lastIndex) {
            const plainText = text.slice(lastIndex, match.index);
            if (plainText.trim()) {
                parts.push({ type: "text", content: plainText });
            }
        }
        
        // Add the LaTeX command as math
        parts.push({
            type: "math",
            content: match[0]
        });
        
        lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
        const remainingText = text.slice(lastIndex);
        if (remainingText.trim()) {
            parts.push({ type: "text", content: remainingText });
        }
    }
    
    // If no LaTeX commands found, return the original text
    if (parts.length === 0) {
        parts.push({ type: "text", content: text });
    }
    
    return parts;
}

export default InlineMathText;

