"use client";
import React from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import { cn } from "@/styles/themes/utils";
import { PencilIcon } from "lucide-react";
import { useState } from "react";
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

export const BasicMarkdownContent: React.FC<BasicMarkdownContentProps> = ({ content, isStreamActive, onEditRequest, messageId, showCopyButton = true }) => {
    const [isHovering, setIsHovering] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const handleEdit = () => {
        console.log("Edit clicked with content:", content);
        onEditRequest?.(); // <-- Call the passed-down function
    };

    const handleCopy = () => {
        navigator.clipboard
            .writeText(content)
            .then(() => {
                console.log("Copy clicked with content:", content);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 1000);
            })
            .catch((err) => {
                console.error("Failed to copy: ", err);
            });
    };

    const components = {
        p: ({ node, children, ...props }: any) => {
            // Logic to check if it's the last paragraph might need refinement
            // depending on how content is split and structured, but keeping as is for now.
            const isLastParagraph = false; // Simpler placeholder, adjust if needed
            return (
                <p className={`font-sans tracking-wide leading-relaxed text-md ${isLastParagraph ? "mb-0" : "mb-2"}`} {...props}>
                    {children}
                </p>
            );
        },
        strong: ({ node, children, ...props }) => {
            // Check if parent element is a heading
            const parentTagName = node.parent?.tagName?.toLowerCase() || "";
            const isInHeading = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(parentTagName);

            // Only apply custom styling if not in a heading
            return (
                <strong className={isInHeading ? "" : "font-extrabold"} {...props}>
                    {children}
                </strong>
            );
        },
        em: ({ node, children, ...props }) => {
            // Check if parent element is a heading
            const parentTagName = node.parent?.tagName?.toLowerCase() || "";
            const isInHeading = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(parentTagName);

            // Only apply custom styling if not in a heading
            return (
                <em className={isInHeading ? "italic" : "italic text-purple-600"} {...props}>
                    {children}
                </em>
            );
        },
        blockquote: ({ node, ...props }) => <blockquote className="pl-4 border-l-4 border-gray-300 italic text-gray-700" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc pl-5 ml-3 mb-3 leading-relaxed text-md" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 ml-3 mb-3 leading-relaxed text-md" {...props} />,
        li: ({ node, children, ordered, index, ...props }: any) => {
            if (ordered && typeof index === "number") {
                return (
                    <li className="mb-1 text-md" {...props}>
                        <span className="inline-block w-full">
                            <span className="inline-block w-4 mr-2 text-right">{index + 1}.</span>
                            <span className="inline-block w-[calc(100%-1.5rem)]">{children}</span>
                        </span>
                    </li>
                );
            }
            return (
                <li className="mb-1 text-md" {...props}>
                    {children}
                </li>
            );
        },
        a: ({ node, href, children, ...props }) => <LinkComponent href={href}>{children}</LinkComponent>,
        // a: ({ node, ...props }) => (
        //     <a className="text-blue-500 underline font-medium text-md" target="_blank" rel="noopener noreferrer" {...props} />
        // ),
        h1: ({ node, ...props }) => <h1 className="text-xl text-blue-500 font-bold mb-3 font-heading" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-xl text-blue-500 font-medium mb-2 font-heading" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-lg text-blue-500 font-medium mb-2 font-heading" {...props} />,
        h4: ({ node, ...props }) => <h4 className="text-md text-blue-500 font-medium mb-1 font-heading" {...props} />,
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
        hr: ({ node, ...props }) => <hr className="my-6 border-t border-gray-300" {...props} />,
        table: () => null,
        thead: () => null,
        tbody: () => null,
        tr: () => null,
        th: () => null,
        td: () => null,
    };

    return (
        <div className="relative my-2 group" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {content}
            </ReactMarkdown>
            {/* Edit button now triggers onEditRequest */}
            {isHovering && !isStreamActive && (
                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">  
                    {showCopyButton && <InlineCopyButton markdownContent={content} position="top-right" className="mt-1 mr-1" isMarkdown={true}/>}
                    {/* Only show Edit button if onEditRequest is provided */}
                    {onEditRequest && (
                        <button onClick={handleEdit} className="p-1 text-gray-500 hover:text-gray-700 rounded-md ml-1" title="Edit content">
                            <PencilIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default BasicMarkdownContent;
