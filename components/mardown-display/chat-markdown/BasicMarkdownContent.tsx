"use client";
import React from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import { cn } from "@/styles/themes/utils";
import { PencilIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { LinkComponent } from "./parts/LinkComponent";
import { InlineCopyButton } from "@/components/matrx/buttons/MarkdownCopyButton";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

interface BasicMarkdownContentProps {
    content: string;
    isStreamActive?: boolean;
    onEditRequest?: () => void;
    messageId?: string;
    showCopyButton?: boolean;
}

// RTL language detection utility
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
    
    // If RTL characters are more than 30% of alphabetic characters, consider it RTL
    const totalAlphabetic = rtlCount + ltrCount;
    if (totalAlphabetic === 0) return 'ltr';
    
    return (rtlCount / totalAlphabetic) > 0.3 ? 'rtl' : 'ltr';
};

// Get direction classes based on text direction
const getDirectionClasses = (direction: 'rtl' | 'ltr') => {
    return direction === 'rtl' 
        ? 'text-right rtl' 
        : 'text-left ltr';
};

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
    
    const preprocessContent = (rawContent: string): string => {
        // Fix setext-style heading patterns by ensuring there's a blank line before ---
        // This prevents paragraph text from being interpreted as h2 headings
        return rawContent.replace(/([^\n])\n---/g, '$1\n\n---');
    };
    
    const processedContent = preprocessContent(content);
    
    const handleEdit = () => {
        console.log("Edit clicked with content:", content);
        onEditRequest?.();
    };

    // Conditional mouse event handlers - only active when stream is not active
    const handleMouseEnter = !isStreamActive ? () => setIsHovering(true) : undefined;
    const handleMouseLeave = !isStreamActive ? () => setIsHovering(false) : undefined;
    
    const components = {
        p: ({ node, children, ...props }: any) => {
            // Detect direction for this specific paragraph
            const paragraphText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.join('') : '';
            const paragraphDirection = detectTextDirection(paragraphText);
            const paragraphDirClasses = getDirectionClasses(paragraphDirection);
            
            return (
                <p 
                    className={`font-sans tracking-wide leading-relaxed text-sm mb-2 ${paragraphDirClasses}`} 
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
            
            return (
                <strong className={isInHeading ? "" : "font-extrabold"} {...props}>
                    {children}
                </strong>
            );
        },
        em: ({ node, children, ...props }) => {
            const parentTagName = node.parent?.tagName?.toLowerCase() || "";
            const isInHeading = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(parentTagName);
            
            return (
                <em className={isInHeading ? "italic" : "italic text-purple-600"} {...props}>
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
                    className={`${isRtl ? 'pr-4 border-r-4' : 'pl-4 border-l-4'} border-gray-300 italic text-gray-700 ${getDirectionClasses(blockquoteDirection)}`}
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
                    className={`list-none mb-3 leading-relaxed text-md ${getDirectionClasses(listDirection)}`}
                    dir={listDirection}
                    {...props}
                >
                    {children}
                </ul>
            );
        },
        ol: ({ node, children, ...props }) => {
            // Detect direction for ordered list content
            const listText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.join('') : '';
            const listDirection = detectTextDirection(listText);
            
            return (
                <ol 
                    className={`list-none mb-3 leading-relaxed text-md ${getDirectionClasses(listDirection)}`}
                    dir={listDirection}
                    {...props}
                >
                    {children}
                </ol>
            );
        },
        li: ({ node, children, ordered, index, ...props }: any) => {
            // Detect direction for list item content
            const itemText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.join('') : '';
            const itemDirection = detectTextDirection(itemText);
            const isRtl = itemDirection === 'rtl';
            
            if (ordered && typeof index === "number") {
                return (
                    <li className={`mb-1 text-md ${getDirectionClasses(itemDirection)} flex`} dir={itemDirection} {...props}>
                        <span className={`${isRtl ? 'ml-2 order-2' : 'mr-2 order-1'} flex-shrink-0 min-w-[1.5rem] ${isRtl ? 'text-left' : 'text-right'}`}>
                            {index + 1}.
                        </span>
                        <span className={`flex-1 ${isRtl ? 'order-1' : 'order-2'}`}>
                            {children}
                        </span>
                    </li>
                );
            }
            
            // Unordered list item with custom bullet
            return (
                <li className={`mb-1 text-md ${getDirectionClasses(itemDirection)} flex`} dir={itemDirection} {...props}>
                    <span className={`${isRtl ? 'ml-2 order-2' : 'mr-2 order-1'} flex-shrink-0 min-w-[1rem] ${isRtl ? 'text-left' : 'text-right'}`}>
                        •
                    </span>
                    <span className={`flex-1 ${isRtl ? 'order-1' : 'order-2'}`}>
                        {children}
                    </span>
                </li>
            );
        },
        a: ({ node, href, children, ...props }) => <LinkComponent href={href}>{children}</LinkComponent>,
        h1: ({ node, children, ...props }) => {
            const headingText = typeof children === 'string' ? children : 
                Array.isArray(children) ? children.join('') : '';
            const headingDirection = detectTextDirection(headingText);
            
            return (
                <h1 
                    className={`text-xl text-blue-500 font-bold mb-3 font-heading ${getDirectionClasses(headingDirection)}`}
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
                    className={`text-lg text-blue-500 font-medium mb-2 font-heading ${getDirectionClasses(headingDirection)}`}
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
                    className={`text-md text-blue-500 font-medium mb-2 mt-4 font-heading ${getDirectionClasses(headingDirection)}`}
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
                    className={`text-md text-blue-500 font-medium mb-1 mt-3 font-heading ${getDirectionClasses(headingDirection)}`}
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
                            "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
                            className
                        )}
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
        table: () => null,
        thead: () => null,
        tbody: () => null,
        tr: () => null,
        th: () => null,
        td: () => null,
    };

    return (
        <div 
            className={`relative my-2 group ${directionClasses}`}
            dir={textDirection}
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
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