"use client";
import React from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/styles/themes/utils";
import { PencilIcon } from "lucide-react";
import { useState, useMemo, createContext, useContext, useRef } from "react";
import { LinkComponent } from "@/components/mardown-display/blocks/links/LinkComponent";
import { InlineCopyButton } from "@/components/matrx/buttons/MarkdownCopyButton";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

// Detect text direction utility
const detectTextDirection = (text: string): 'rtl' | 'ltr' => {
    // RTL Unicode ranges for Arabic, Hebrew, Persian, Urdu, etc.
    const rtlRanges = [
        /[\u0590-\u05FF]/,  // Hebrew
        /[\u0600-\u06FF]/,  // Arabic
        /[\u0750-\u077F]/,  // Arabic Supplement
        /[\u08A0-\u08FF]/,  // Arabic Extended-A
        /[\uFB50-\uFDFF]/,  // Arabic Presentation Forms-A
        /[\uFE70-\uFEFF]/,  // Arabic Presentation Forms-B
        /[\u200F]/,         // Right-to-Left Mark
        /[\u202E]/,         // Right-to-Left Override
    ];
    
    // Count RTL and LTR characters
    let rtlCount = 0;
    let ltrCount = 0;
    
    for (const char of text) {
        if (rtlRanges.some(range => range.test(char))) {
            rtlCount++;
        } else if (/[a-zA-Z]/.test(char)) {
            ltrCount++;
        }
    }
    
    // If RTL characters are more than 10% of alphabetic characters, consider it RTL
    // Lowered from 30% to 10% to catch mixed content better
    const totalAlphabetic = rtlCount + ltrCount;
    if (totalAlphabetic === 0) return 'ltr';
    
    const direction = (rtlCount / totalAlphabetic) > 0.1 ? 'rtl' : 'ltr';
    
    return direction;
};

// Get direction classes based on text direction
const getDirectionClasses = (direction: 'rtl' | 'ltr') => {
    return direction === 'rtl' 
        ? 'text-right rtl' 
        : 'text-left ltr';
};

// Get font size based on text direction
const getDirectionFontSize = (direction: 'rtl' | 'ltr') => {
    return direction === 'rtl' 
        ? 'text-base' // Bigger for RTL (Arabic/Persian)
        : 'text-sm';   // Smaller for LTR (English)
};

// Simple List Item Component
const ListItemComponent: React.FC<{ children: React.ReactNode; node?: any }> = ({ children, node }) => {
    // Detect direction for list item content
    const itemText = typeof children === 'string' ? children : 
        Array.isArray(children) ? children.join('') : '';
    const itemDirection = detectTextDirection(itemText);
    
    // Check if this is a task list item (contains a checkbox)
    const isTaskItem = node?.properties?.className?.includes('task-list-item');
    
    // For task items, just return the content without additional styling
    if (isTaskItem) {
        return (
            <li className={`mb-1 ${getDirectionFontSize(itemDirection)} ${getDirectionClasses(itemDirection)}`} dir={itemDirection}>
                {children}
            </li>
        );
    }
    
    // For regular list items, use simple styling
    return (
        <li className={`mb-1 ${getDirectionFontSize(itemDirection)} ${getDirectionClasses(itemDirection)}`} dir={itemDirection}>
            {children}
        </li>
    );
};

interface BasicMarkdownContentProps {
    content: string;
    isStreamActive?: boolean;
    onEditRequest?: () => void;
    messageId?: string;
    showCopyButton?: boolean;
}

export const BasicMarkdownContent: React.FC<BasicMarkdownContentProps> = ({ 
    content, 
    isStreamActive, 
    onEditRequest, 
    messageId, 
    showCopyButton = true 
}) => {
    const [isHovering, setIsHovering] = useState(false);
    
    // Detect text direction
    const textDirection = useMemo(() => detectTextDirection(content), [content]);
    const directionClasses = getDirectionClasses(textDirection);
    
    // Memoize LinkComponent wrapper to prevent recreation during streaming
    const LinkWrapper = useMemo(() => {
        return ({ node, href, children, ...props }: any) => (
            <LinkComponent href={href}>{children}</LinkComponent>
        );
    }, []); // Empty deps - this doesn't need to change
    
    const preprocessContent = (rawContent: string): string => {
        let processed = rawContent;
        
        // Convert LaTeX-style math delimiters to markdown math notation
        // \[...\] → $$...$$ (display/block math)
        // IMPORTANT: Display math needs blank lines before and after for remark-math to recognize it
        processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, mathContent) => {
            return `\n\n$$${mathContent}$$\n\n`;
        });
        // \(...\) → $...$ (inline math)
        processed = processed.replace(/\\\((.*?)\\\)/g, (match, mathContent) => {
            return `$${mathContent}$`;
        });
        
        // Support non-standard [...] format for display math (some smaller models use this)
        // Only convert if: contains LaTeX commands (\), multiline or substantial, NOT a markdown link
        processed = processed.replace(/\[[\s\n]*([\s\S]*?)[\s\n]*\](?!\()/g, (match, content) => {
            const trimmedContent = content.trim();
            
            // Case 1: Contains LaTeX commands (backslash) - safe to convert if multiline or substantial
            if (content.includes('\\') && (content.includes('\n') || content.length >= 3)) {
                return `\n\n$$${content}$$\n\n`;
            }
            
            // Case 2: Pure math expression without LaTeX commands
            // Only if multiline format (brackets on own lines) and looks like math
            const isMultilineBrackets = match.startsWith('[\n') || match.startsWith('[ \n');
            if (isMultilineBrackets && trimmedContent.length >= 3) {
                // Check for math operators
                const hasMathOperators = /[+\-=×÷*/]/.test(trimmedContent);
                // Check it's not prose (doesn't contain common text words)
                const hasProseWords = /\b(note|step|example|optional|the|is|are|was|were|for|with|this|that)\b/i.test(trimmedContent);
                // Check that it's mostly math-like (numbers, operators, parentheses, variables)
                const mathLikeRatio = (trimmedContent.match(/[0-9+\-=×÷*/()xy\s]/g) || []).length / trimmedContent.length;
                
                if (hasMathOperators && !hasProseWords && mathLikeRatio > 0.6) {
                    return `\n\n$$${content}$$\n\n`;
                }
            }
            
            // Otherwise, leave it as-is (could be regular brackets)
            return match;
        });
        
        // Fix setext-style heading patterns by ensuring there's a blank line before ---
        // This prevents paragraph text from being interpreted as h2 headings
        processed = processed.replace(/([^\n])\n---/g, '$1\n\n---');
        
        // Ensure proper line breaks after bold text that should start a new line
        // This handles cases like "**Meta Title:**\n[content]" to ensure proper paragraph separation
        // BUT exclude cases where bold text is immediately followed by a list item
        processed = processed.replace(/(\*\*[^*]+\*\*)\n([^\n*\-])/g, '$1\n\n$2');
        
        // Ensure proper line breaks before and after italic text that spans multiple lines
        // This handles cases where italic text should be on its own line
        processed = processed.replace(/([^\n])\n(\*[^*]+\*)\n([^\n])/g, '$1\n\n$2\n\n$3');
        
        // Handle cases where there are single line breaks between different formatting elements
        // that should be treated as separate paragraphs
        // BUT exclude cases where formatting is immediately followed by a list item
        processed = processed.replace(/(\*\*[^*]+\*\*|\*[^*]+\*)\n([^\n*\s\-])/g, '$1\n\n$2');
        
        // Ensure proper separation between list items and following paragraph content
        // This handles cases where content follows a list without proper spacing
        
        // First, handle nested/indented list items (most specific case)
        // Use negative lookahead to exclude actual list markers (* or -) but allow bold text (**)
        processed = processed.replace(/(^|\n)(\s+[*-] .+)\n(?!\s*[*-]\s)([^\n\s\-#\d][^\n]*)/gm, '$1$2\n\n$3');
        
        // Then handle regular list items
        // Use negative lookahead to exclude actual list markers but allow bold text
        processed = processed.replace(/(^|\n)(- .+)\n(?!\s*[*-]\s)([^\n\s\-#\d][^\n]*)/gm, '$1$2\n\n$3');
        processed = processed.replace(/(^|\n)(\d+\. .+)\n(?!\s*\d+[.)]\s)([^\n\s\-#\d][^\n]*)/gm, '$1$2\n\n$3');
        processed = processed.replace(/(^|\n)(\d+\) .+)\n(?!\s*\d+[.)]\s)([^\n\s\-#\d][^\n]*)/gm, '$1$2\n\n$3');
        
        // Clean up any excessive line breaks (more than 2 consecutive newlines)
        processed = processed.replace(/\n{3,}/g, '\n\n');
        
        return processed;
    };
    
    const processedContent = preprocessContent(content);
    
    const handleEdit = () => {
        onEditRequest?.();
    };

    // Conditional mouse event handlers - only active when stream is not active
    const handleMouseEnter = !isStreamActive ? () => setIsHovering(true) : undefined;
    const handleMouseLeave = !isStreamActive ? () => setIsHovering(false) : undefined;
    
    // Memoize components to prevent recreation during streaming
    const components = useMemo(() => ({
        input: ({ node, type, checked, disabled, ...props }: any) => {
            if (type === 'checkbox') {
                return (
                    <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        className="mr-2 h-4 w-4 rounded border-2 border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 checked:bg-blue-600 dark:checked:bg-blue-500 checked:border-blue-600 dark:checked:border-blue-500 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-0 cursor-pointer transition-colors"
                        {...props}
                    />
                );
            }
            return <input type={type} {...props} />;
        },
        p: ({ node, children, ...props }: any) => {
            // Check if this paragraph only contains math (display math should be centered)
            // Check if children is a single element with katex class
            let isMathOnly = false;
            const childArray = React.Children.toArray(children);
            
            if (childArray.length === 1) {
                const child = childArray[0] as any;
                // Check if it's a React element with katex className
                if (child && typeof child === 'object' && child.props && child.props.className) {
                    isMathOnly = child.props.className.includes('katex');
                }
            }
            
            // Detect direction for this specific paragraph
            // Better text extraction that handles nested React elements
            const extractTextFromChildren = (children: any): string => {
                if (typeof children === 'string') return children;
                if (Array.isArray(children)) {
                    return children.map(child => extractTextFromChildren(child)).join('');
                }
                if (children && typeof children === 'object' && children.props) {
                    return extractTextFromChildren(children.props.children);
                }
                return '';
            };
            
            const paragraphText = extractTextFromChildren(children);
            const paragraphDirection = detectTextDirection(paragraphText);
            const paragraphDirClasses = getDirectionClasses(paragraphDirection);
            
            // If it's only math, center it and override direction classes
            if (isMathOnly) {
                return (
                    <p 
                        className="font-sans tracking-wide leading-relaxed text-base mb-4 text-center"
                        {...props}
                    >
                        {children}
                    </p>
                );
            }
            
            return (
                <p 
                    className={`font-sans tracking-wide leading-relaxed ${getDirectionFontSize(paragraphDirection)} mb-2 pl-0 ml-0 ${paragraphDirClasses}`} 
                    dir={paragraphDirection}
                    {...props}
                >
                    {children}
                </p>
            );
        },
        strong: ({ node, children, ...props }) => {
            const parentTagName = node.parent?.tagName?.toLowerCase() || "";
            const isInHeading = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(parentTagName);
            
            // Detect direction for bold text content
            const boldText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.join('') : '';
            const boldDirection = detectTextDirection(boldText);
            const boldDirClasses = getDirectionClasses(boldDirection);
            
            return (
                <strong 
                    className={`${isInHeading ? "" : "font-extrabold"} ${boldDirClasses}`} 
                    dir={boldDirection}
                    {...props}
                >
                    {children}
                </strong>
            );
        },
        em: ({ node, children, ...props }) => {
            const parentTagName = node.parent?.tagName?.toLowerCase() || "";
            const isInHeading = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(parentTagName);
            
            // Detect direction for italic text content
            const italicText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.join('') : '';
            const italicDirection = detectTextDirection(italicText);
            const italicDirClasses = getDirectionClasses(italicDirection);
            
            return (
                <em 
                    className={`${isInHeading ? "italic" : "italic text-blue-600 dark:text-blue-400"} ${italicDirClasses}`} 
                    dir={italicDirection}
                    {...props}
                >
                    {children}
                </em>
            );
        },
        blockquote: ({ node, children, ...props }) => {
            // Detect direction for blockquote content
            const blockquoteText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.join('') : '';
            const blockquoteDirection = detectTextDirection(blockquoteText);
            const isRtl = blockquoteDirection === 'rtl';
            
            return (
                <blockquote 
                className={`${isRtl ? 'pr-4 border-r-4' : 'pl-4 border-l-4'} py-3 border-blue-200 dark:border-blue-700 italic text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-950/20 ${getDirectionClasses(blockquoteDirection)}`}
                dir={blockquoteDirection}
                    {...props}
                >
                    {children}
                </blockquote>
            );
        },
        ul: ({ node, children, ...props }) => {
            // Detect direction for list content
            const listText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.join('') : '';
            const listDirection = detectTextDirection(listText);
            
            return (
                <ul 
                    className={`list-disc mb-3 leading-relaxed ${getDirectionFontSize(listDirection)} pl-6 ${getDirectionClasses(listDirection)}`}
                    dir={listDirection}
                    {...props}
                >
                    {children}
                </ul>
            );
        },
        ol: ({ node, children, ...props }) => {
            // Detect direction for list content
            const listText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.join('') : '';
            const listDirection = detectTextDirection(listText);
            
            return (
                <ol 
                    className={`list-decimal mb-3 leading-relaxed ${getDirectionFontSize(listDirection)} pl-6 ${getDirectionClasses(listDirection)}`}
                    dir={listDirection}
                    {...props}
                >
                    {children}
                </ol>
            );
        },
        li: ({ node, children, ...props }) => {
            return <ListItemComponent node={node}>{children}</ListItemComponent>;
        },
        a: LinkWrapper,
        h1: ({ node, children, ...props }) => {
            const headingText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.join('') : '';
            const headingDirection = detectTextDirection(headingText);
            
            return (
                <h1 
                    className={`text-2xl text-blue-500 font-bold mb-3 font-heading ${getDirectionClasses(headingDirection)}`}
                    dir={headingDirection}
                    {...props}
                >
                    {children}
                </h1>
            );
        },
        h2: ({ node, children, ...props }) => {
            const headingText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.join('') : '';
            const headingDirection = detectTextDirection(headingText);
            
            return (
                <h2 
                    className={`text-xl pt-2 text-blue-500 font-medium mb-2 font-heading ${getDirectionClasses(headingDirection)}`}
                    dir={headingDirection}
                    {...props}
                >
                    {children}
                </h2>
            );
        },
        h3: ({ node, children, ...props }) => {
            const headingText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.join('') : '';
            const headingDirection = detectTextDirection(headingText);
            
            return (
                <h3 
                    className={`text-xl pt-2 text-blue-500 font-medium mb-2 mt-4 font-heading ${getDirectionClasses(headingDirection)}`}
                    dir={headingDirection}
                    {...props}
                >
                    {children}
                </h3>
            );
        },
        h4: ({ node, children, ...props }) => {
            const headingText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.join('') : '';
            const headingDirection = detectTextDirection(headingText);
            
            return (
                <h4 
                    className={`text-lg pt-2 text-blue-500 font-medium mb-1 mt-3 font-heading ${getDirectionClasses(headingDirection)}`}
                    dir={headingDirection}
                    {...props}
                >
                    {children}
                </h4>
            );
        },
        pre: ({ node, children, ...props }) => (
            <pre className="my-3" {...props}>
                {children}
            </pre>
        ),
        code: ({ node, inline, className, children, ...props }) => {
            const isCodeBlock =
                Array.isArray(children) && children.length === 1 && typeof children[0] === "string" && children[0] === "pygame";
            if (!isCodeBlock && (inline === true || inline === undefined)) {
                return (
                    <code
                        className={cn(
                            "px-1.5 py-0 rounded font-mono text-sm font-medium",
                            "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                            className
                        )}
                        style={{ 
                            overflowWrap: 'anywhere',
                            wordBreak: 'normal'
                        }}
                        {...props}
                    >
                        {children}
                    </code>
                );
            }
            return null;
        },
        img: ({ node, ...props }) => <img className="max-w-full h-auto rounded-md my-4" {...props} alt={props.alt || "Image"} />,
        hr: ({ node, ...props }) => <hr className="my-6 border-t border-gray-300 dark:border-gray-600" {...props} />,
        br: ({ node, ...props }) => (
            <span className="block h-2 w-full" {...props}></span>
        ),
        div: ({ node, className, children, ...props }: any) => {
            // Regular div - no special handling needed
            return <div className={className} {...props}>{children}</div>;
        },
        span: ({ node, className, children, ...props }: any) => {
            // Regular span - no special handling needed
            return <span className={className} {...props}>{children}</span>;
        },
        table: () => null,
        thead: () => null,
        tbody: () => null,
        tr: () => null,
        th: () => null,
        td: () => null,
    }), []); // Empty deps - LinkWrapper is stable

    return (
        <div 
            className={`relative my-2 group ${directionClasses} math-content-wrapper`}
            dir={textDirection}
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                    /* Center display math that appears after a line break */
                    .math-content-wrapper p > .block + .katex {
                        display: block;
                        text-align: center;
                        margin: 1em 0;
                        font-size: 1.5em;
                    }
                    /* Increase font size for standalone math paragraphs */
                    .math-content-wrapper p.text-center .katex {
                        font-size: 1.5em;
                    }
                    /* Override pre tags that contain inline code (indented text blocks) */
                    .math-content-wrapper pre:has(> code.bg-blue-100),
                    .math-content-wrapper pre:has(> code.dark\\:bg-blue-900\\/30) {
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        overflow-wrap: anywhere;
                        font-family: inherit;
                        background: transparent;
                        padding: 0;
                        margin: 0;
                    }
                    /* Make the code inside these pre tags behave like inline code */
                    .math-content-wrapper pre:has(> code.bg-blue-100) > code,
                    .math-content-wrapper pre:has(> code.dark\\:bg-blue-900\\/30) > code {
                        white-space: normal;
                        display: inline;
                        overflow-wrap: anywhere;
                        word-break: normal;
                    }
                `
            }} />
            <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]} 
                rehypePlugins={[rehypeKatex]}
                components={components}
            >
                {processedContent}
            </ReactMarkdown>
            
            {/* Only render interactive elements when stream is not active */}
            {!isStreamActive && isHovering && (
                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">  
                    {showCopyButton && (
                        <InlineCopyButton 
                            markdownContent={content} 
                            position="top-right" 
                            className="mt-1 mr-1" 
                            isMarkdown={true}
                        />
                    )}
                    {onEditRequest && (
                        <button 
                            onClick={handleEdit} 
                            className="p-1 pt-6 text-gray-500 hover:text-gray-700 rounded-md ml-1" 
                            title="Edit content"
                        >
                            <PencilIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default BasicMarkdownContent;