"use client";
import React from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import { cn } from "@/styles/themes/utils";
import CodeBlock from "@/components/mardown-display/CodeBlock";
import { parseMarkdownTable } from "@/components/mardown-display/parse-markdown-table";
import MarkdownTable from "@/components/mardown-display/tables/MarkdownTable";
import { CheckIcon, ClipboardIcon, PencilIcon } from "lucide-react";
import { useState } from "react";
import FullScreenMarkdownEditor from "./FullScreenMarkdownEditor"; // Adjust path as needed

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

interface BasicMarkdownContentProps {
    content: string;
    isStreamActive?: boolean;
    onEditRequest?: () => void; // <-- ADD THIS
}

export const BasicMarkdownContent: React.FC<BasicMarkdownContentProps> = ({ content, isStreamActive, onEditRequest }) => {
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
        a: ({ node, ...props }) => <a className="text-blue-500 underline font-medium text-md" {...props} />,
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
                    <button onClick={handleCopy} className="p-1 text-gray-500 hover:text-gray-700 rounded-md" title="Copy to clipboard">
                        {copySuccess ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                    </button>
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

interface ChatMarkdownDisplayProps {
    content: string;
    type: "flashcard" | "message";
    role?: "user" | "assistant";
    className?: string;
    isStreamActive?: boolean;
    onContentChange?: (newContent: string) => void; // <-- ADD THIS
}
interface ContentBlock {
    type: "text" | "code" | "table";
    content: string;
    language?: string;
}

const EnhancedChatMarkdown: React.FC<ChatMarkdownDisplayProps> = ({
    content,
    type,
    role = "assistant",
    className,
    isStreamActive,
    onContentChange,
}) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // --- Editor Handlers ---
    const handleOpenEditor = () => {
        // Don't allow editing if content is streaming
        if (isStreamActive) return;
        setIsEditorOpen(true);
    };

    const handleCancelEdit = () => {
        setIsEditorOpen(false);
    };

    const handleSaveEdit = (newContent: string) => {
        console.log("Saving edited content:", newContent);
        // Call the callback passed from the parent component
        onContentChange?.(newContent);
        // Close the editor
        setIsEditorOpen(false);
        // Note: This component itself doesn't update its internal 'content' prop.
        // The parent component needs to re-render EnhancedChatMarkdown with the new content.
    };

    const splitContentIntoBlocks = (mdContent: string): ContentBlock[] => {
        const blocks: ContentBlock[] = [];
        let currentText = "";
        const lines = mdContent.split("\n");

        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Detect code blocks (```lang or ```)
            if (trimmedLine.startsWith("```")) {
                // Push any preceding text
                if (currentText.trim()) {
                    blocks.push({ type: "text", content: currentText.trimEnd() }); // Use trimEnd to preserve potential leading whitespace for next block
                    currentText = "";
                }

                // Extract language (if any) from the opening ``` line
                const languageMatch = trimmedLine.match(/^```(\w*)/);
                const language = languageMatch && languageMatch[1] ? languageMatch[1] : undefined; // Gets 'javascript', 'python', etc., or undefined

                const codeContent: string[] = [];
                i++; // Move past the opening ``` line

                // Collect lines until the closing ```
                while (i < lines.length && !lines[i].trim().startsWith("```")) {
                    codeContent.push(lines[i]);
                    i++;
                }

                blocks.push({
                    type: "code",
                    content: codeContent.join("\n"), // Join lines without extra trimming here
                    language: language, // Store the detected language
                });

                i++; // Move past the closing ``` line
                continue; // Continue to the next iteration
            }

            // Detect table blocks (| column | column |) - Keep existing logic
            // Check if it's the start of a potential table
            if (trimmedLine.startsWith("|") && trimmedLine.includes("|", 1) && lines[i + 1]?.trim().startsWith("|--")) {
                // Potential table start detected (line with pipes + separator line)

                // Push any preceding text
                if (currentText.trim()) {
                    blocks.push({ type: "text", content: currentText.trimEnd() });
                    currentText = "";
                }

                const tableContent = [];
                // Add the header row
                tableContent.push(lines[i]);
                i++;
                // Add the separator row
                tableContent.push(lines[i]);
                i++;

                // Collect subsequent table rows
                while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
                    tableContent.push(lines[i]);
                    i++;
                }

                blocks.push({ type: "table", content: tableContent.join("\n") });
                // `i` is already pointing to the line after the table, so no need for `i++` or `continue` here.
                // Let the loop handle the increment.
                continue; // Important to skip adding this line to currentText
            }

            // Accumulate text content
            currentText += line + "\n";
            i++;
        }

        // Push any remaining text
        if (currentText.trim()) {
            blocks.push({ type: "text", content: currentText.trimEnd() });
        }

        return blocks;
    };

    const blocks = splitContentIntoBlocks(content);

    // MODIFIED: renderBlock to use the extracted language
    const renderBlock = (block: ContentBlock, index: number) => {
        switch (block.type) {
            case "text":
                // Render non-empty text blocks and pass the edit handler
                return block.content ? (
                    <BasicMarkdownContent
                        key={index}
                        content={block.content}
                        isStreamActive={isStreamActive}
                        // Pass the function to open the editor for the WHOLE message
                        onEditRequest={onContentChange ? handleOpenEditor : undefined} // Only allow editing if a handler is provided
                    />
                ) : null;
            case "code":
                return (
                    <CodeBlock
                        key={index}
                        code={block.content} // Pass the raw code content
                        language={block.language} // Pass the extracted language (can be undefined)
                        fontSize={16}
                        className="my-3" // Apply margin here or within CodeBlock
                        onCodeChange={(newCode) => console.log("Code updated:", newCode)} // Placeholder
                    />
                );
            case "table":
                // Ensure parseMarkdownTable handles the block content correctly
                const tableData = parseMarkdownTable(block.content);
                // Check if tableData is valid before rendering
                if (!tableData || tableData.headers.length === 0 || tableData.rows.length === 0) {
                    console.warn("Skipping invalid or empty table:", block.content);
                    // Optionally render the raw markdown as text if parsing fails
                    // return <BasicMarkdownContent key={index} content={`\`\`\`\n${block.content}\n\`\`\``} isStreamActive={isStreamActive} />;
                    return null;
                }
                return <MarkdownTable key={index} data={tableData} />;
            default:
                return null;
        }
    };

    const containerStyles = cn(
        "font-sans text-md antialiased leading-relaxed tracking-wide",
        type === "flashcard"
            ? "text-left mb-1 text-white" // Added text-white as example, adjust as needed
            : `block p-3 rounded-lg w-full ${
                  role === "user"
                      ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
                      : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
              }`,
        className // Allow overriding styles
    );

    return (
        <div className={`${type === "message" ? "mb-3 w-full" : ""} ${role === "user" ? "text-right" : "text-left"}`}>
            {/* Removed extra 'relative' here, BasicMarkdownContent handles its own relative positioning */}
            <div className={containerStyles}>
                {/* Removed extra div wrapper */}
                {blocks.map((block, index) => renderBlock(block, index))}
            </div>
            <FullScreenMarkdownEditor
                isOpen={isEditorOpen}
                initialContent={content} // Pass the complete original content
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
            />
        </div>
    );
};

export default EnhancedChatMarkdown;
