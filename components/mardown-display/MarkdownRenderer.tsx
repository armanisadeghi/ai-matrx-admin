"use client";
import React from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import { cn } from "@/styles/themes/utils";
import CodeBlock from "./code/CodeBlock";
import { parseMarkdownTable } from "@/components/mardown-display/parse-markdown-table";
import MarkdownTable from "./tables/MarkdownTable";
import { InlineCopyButton } from "@/components/ui";

const ReactMarkdown = dynamic(() => import("react-markdown"), {
    ssr: false,
});

interface MarkdownRendererProps {
    content: string;
    type: "flashcard" | "message";
    fontSize?: number;
    role?: "user" | "assistant";
    className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, type, fontSize = 16, role = "assistant", className }) => {
    const tableData = parseMarkdownTable(content);

    const components = {
        p: ({ node, ...props }) => (
            <p style={{ fontSize: `${fontSize}px` }} className="mb-4 font-sans tracking-wide leading-relaxed" {...props} />
        ),
        ul: ({ node, ...props }) => <ul style={{ fontSize: `${fontSize}px` }} className="list-disc pl-5 mb-4 leading-relaxed" {...props} />,
        ol: ({ node, ...props }) => (
            <ol style={{ fontSize: `${fontSize}px` }} className="list-decimal pl-5 mb-4 leading-relaxed" {...props} />
        ),
        li: ({ node, children, ordered, index, ...props }: any) => {
            if (ordered && typeof index === "number") {
                return (
                    <li className="mb-2" style={{ fontSize: `${fontSize}px` }} {...props}>
                        <span className="inline-block w-full">
                            <span className="inline-block w-4 mr-2 text-right">{index + 1}.</span>
                            <span className="inline-block w-[calc(100%-1.5rem)]">{children}</span>
                        </span>
                    </li>
                );
            }
            return (
                <li className="mb-2" style={{ fontSize: `${fontSize}px` }} {...props}>
                    {children}
                </li>
            );
        },
        a: ({ node, ...props }) => <a className="text-blue-500 underline font-medium" style={{ fontSize: `${fontSize}px` }} {...props} />,
        h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-medium mb-4 font-heading" style={{ fontSize: `${Math.max(fontSize + 8, 24)}px` }} {...props} />
        ),
        h2: ({ node, ...props }) => (
            <h2 className="text-xl font-medium mb-3 font-heading" style={{ fontSize: `${Math.max(fontSize + 6, 20)}px` }} {...props} />
        ),
        h3: ({ node, ...props }) => (
            <h3 className="text-lg font-medium mb-3 font-heading" style={{ fontSize: `${Math.max(fontSize + 4, 18)}px` }} {...props} />
        ),
        h4: ({ node, ...props }) => (
            <h4 className="text-base font-medium mb-2 font-heading" style={{ fontSize: `${Math.max(fontSize + 2, 16)}px` }} {...props} />
        ),
        code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            if (!inline && language) {
                return (
                    <CodeBlock
                        code={String(children).replace(/\n$/, "")}
                        language={language}
                        fontSize={fontSize}
                        className="my-4"
                        onCodeChange={(newCode) => {
                            // Handle code changes if needed
                            console.log("Code updated:", newCode);
                        }}
                    />
                );
            }
            return (
                <code
                    className={cn(
                        "px-1.5 py-0.5 rounded font-mono text-sm",
                        "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
                        className
                    )}
                    style={{ fontSize: `${Math.max(fontSize - 2, 12)}px` }}
                    {...props}
                >
                    {children}
                </code>
            );
        },
        pre: ({ node, children, ...props }) => (
            <pre className="my-4" {...props}>
                {children}
            </pre>
        ),
        table: () => {
            if (!tableData) return null;
            return <MarkdownTable data={tableData} />;
        },
        thead: () => null,
        tbody: () => null,
        tr: () => null,
        th: () => null,
        td: () => null,
    };

    const containerStyles = cn(
        "font-sans text-base antialiased leading-relaxed tracking-wide",
        type === "flashcard"
            ? "text-left mb-4 text-white"
            : `inline-block p-3 rounded-lg w-full ${
                  role === "user"
                      ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
                      : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
              }`,
        className
    );

    return (
        <div className={`${type === "message" ? "mb-4 w-full" : ""} ${role === "user" ? "text-right" : "text-left"}`}>
            <div className={containerStyles + " relative"}>
                <InlineCopyButton content={content} position="top-right" className="mt-1 mr-1" />
                <div className="text-base leading-relaxed tracking-wide">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                        {content}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
};

export default MarkdownRenderer;
