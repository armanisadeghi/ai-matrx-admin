"use client";
import React from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import { cn } from "@/utils";
import CodeBlock from "@/components/mardown-display/code/CodeBlock";
import { parseMarkdownTable } from "@/components/mardown-display/markdown-classification/processors/bock-processors/parse-markdown-table";
import MarkdownTable from "@/components/mardown-display/tables/MarkdownTable";


const ReactMarkdown = dynamic(() => import("react-markdown"), {
    ssr: false,
});

interface ChatMarkdownDisplayProps {
    content: string;
    type: "flashcard" | "message";
    role?: "user" | "assistant";
    className?: string;
}

const ChatMarkdownDisplay: React.FC<ChatMarkdownDisplayProps> = ({ content, type, role = "assistant", className }) => {
    const tableData = parseMarkdownTable(content);

    const components = {
        // Last paragraph in content shouldn't have a bottom margin
        // eslint-disable-next-line react/display-name
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
        code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";

            if (!inline && language) {
                return (
                    <CodeBlock
                        code={String(children).replace(/\n$/, "")}
                        language={language}
                        fontSize={16}
                        className="my-3"
                        onCodeChange={(newCode) => {
                            console.log("Code updated:", newCode);
                        }}
                    />
                );
            }

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
        pre: ({ node, children, ...props }) => (
            <pre className="my-3" {...props}>
                {children}
            </pre>
        ),
        table: () => {
            if (!tableData) return null;
            return <MarkdownTable data={tableData.markdown} />;
        },
        thead: () => null,
        tbody: () => null,
        tr: () => null,
        th: () => null,
        td: () => null,
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
                <div className="text-md leading-relaxed tracking-wide">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                        {content}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
};

export default ChatMarkdownDisplay;
