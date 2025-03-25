"use client";
import React from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import { cn } from "@/styles/themes/utils";
import CodeBlock from "@/components/mardown-display/CodeBlock";
import { parseMarkdownTable } from "@/components/mardown-display/parse-markdown-table";
import MarkdownTable from "@/components/mardown-display/tables/MarkdownTable";
import { CheckIcon, ClipboardIcon, Copy, Edit2, PencilIcon } from "lucide-react";
import { useState } from "react";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

interface ChatMarkdownDisplayProps {
    content: string;
    type: "flashcard" | "message";
    role?: "user" | "assistant";
    className?: string;
    isStreamActive?: boolean;
}

interface BasicMarkdownContentProps {
    content: string;
    isStreamActive?: boolean;
}

// Component for continuous basic markdown content
export const BasicMarkdownContent: React.FC<BasicMarkdownContentProps> = ({ content, isStreamActive }) => {
    const [isHovering, setIsHovering] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const handleEdit = () => {
        console.log("Edit clicked with content:", content);
    };

    const handleCopy = () => {
        navigator.clipboard
            .writeText(content)
            .then(() => {
                console.log("Copy clicked with content:", content);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
            })
            .catch((err) => {
                console.error("Failed to copy: ", err);
            });
    };

    const components = {
        p: ({ node, children, ...props }: any) => {
            const isLastParagraph =
                String(children).trim() ===
                String(content)
                    .trim()
                    .split(/\n\n|\r\n\r\n/)
                    .pop()
                    ?.trim();
            return (
                <p className={`font-sans tracking-wide leading-relaxed text-md ${isLastParagraph ? "mb-0" : "mb-2"}`} {...props}>
                    {children}
                </p>
            );
        },
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
        h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-3 font-heading" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-xl font-medium mb-2 font-heading" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-lg font-medium mb-2 font-heading" {...props} />,
        h4: ({ node, ...props }) => <h4 className="text-md font-medium mb-1 font-heading" {...props} />,
        pre: ({ node, children, ...props }) => (
            <pre className="my-3" {...props}>
                {children}
            </pre>
        ),
        code: ({ node, inline, className, children, ...props }) => {
            if (!inline) return null; // Non-inline code blocks are handled separately
            return (
                <code
                    className={cn(
                        "px-1.5 py-0.5 rounded font-mono text-sm font-medium",
                        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
                        className
                    )}
                    {...props}
                >
                    {children}
                </code>
            );
        },
        table: () => null, // Tables are handled separately
        thead: () => null,
        tbody: () => null,
        tr: () => null,
        th: () => null,
        td: () => null,
    };

    return (
        <div className="relative my-2" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {content}
            </ReactMarkdown>
            {isHovering && !isStreamActive && (
                <div className="absolute top-0 right-0 p-1">
                    <button onClick={handleCopy} className="p-1 text-gray-500 hover:text-gray-700 rounded-md" title="Copy to clipboard">
                        {copySuccess ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                    </button>
                    <button onClick={handleEdit} className="p-1 text-gray-500 hover:text-gray-700 rounded-md ml-1" title="Edit content">
                        <PencilIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

const EnhancedChatMarkdown: React.FC<ChatMarkdownDisplayProps> = ({ content, type, role = "assistant", className, isStreamActive }) => {
    const tableData = parseMarkdownTable(content);

    const splitContentIntoBlocks = (content: string) => {
        const blocks: { type: "text" | "code" | "table"; content: string }[] = [];
        let currentText = "";
        const lines = content.split("\n");

        let i = 0;
        while (i < lines.length) {
            const line = lines[i];

            // Detect code blocks (```code```)
            if (line.trim().startsWith("```")) {
                // If we have accumulated text, push it as a text block
                if (currentText.trim()) {
                    blocks.push({ type: "text", content: currentText.trim() });
                    currentText = "";
                }

                // Extract code block content
                const codeContent = [];
                i++; // Skip the opening ```

                while (i < lines.length && !lines[i].trim().startsWith("```")) {
                    codeContent.push(lines[i]);
                    i++;
                }

                blocks.push({ type: "code", content: codeContent.join("\n").trim() });
                i++; // Skip the closing ```
                continue;
            }

            // Detect table blocks (| column | column |)
            if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
                // If we have accumulated text, push it as a text block
                if (currentText.trim()) {
                    blocks.push({ type: "text", content: currentText.trim() });
                    currentText = "";
                }

                // Extract table content
                const tableContent = [line];
                i++;

                while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
                    tableContent.push(lines[i]);
                    i++;
                }

                blocks.push({ type: "table", content: tableContent.join("\n").trim() });
                continue;
            }

            // Accumulate text content
            currentText += line + "\n";
            i++;
        }

        // Push any remaining text
        if (currentText.trim()) {
            blocks.push({ type: "text", content: currentText.trim() });
        }

        return blocks;
    };

    const blocks = splitContentIntoBlocks(content);

    const renderBlock = (block: { type: string; content: string }, index: number) => {
        switch (block.type) {
            case "text":
                return <BasicMarkdownContent key={index} content={block.content} isStreamActive={isStreamActive} />;
            case "code":
                const firstLine = block.content.split("\n")[0].trim();
                const language = firstLine.startsWith("```") ? firstLine.slice(3).trim() : "";
                const codeContent = firstLine.startsWith("```") ? block.content.substring(block.content.indexOf("\n") + 1) : block.content;
                console.log("language", language);

                return (
                    <CodeBlock
                        key={index}
                        code={codeContent}
                        language={language}
                        fontSize={16}
                        className="my-3"
                        onCodeChange={(newCode) => console.log("Code updated:", newCode)}
                    />
                );
            case "table":
                return <MarkdownTable key={index} data={tableData} />;
            default:
                return null;
        }
    };

    const containerStyles = cn(
        "font-sans text-md antialiased leading-relaxed tracking-wide",
        type === "flashcard"
            ? "text-left mb-1 text-white"
            : `block p-3 rounded-lg w-full ${
                  role === "user"
                      ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
                      : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
              }`,
        className
    );

    return (
        <div className={`${type === "message" ? "mb-3 w-full" : ""} ${role === "user" ? "text-right" : "text-left"}`}>
            <div className={containerStyles + " relative"}>
                <div className="text-md leading-relaxed tracking-wide">{blocks.map((block, index) => renderBlock(block, index))}</div>
            </div>
        </div>
    );
};

export default EnhancedChatMarkdown;
