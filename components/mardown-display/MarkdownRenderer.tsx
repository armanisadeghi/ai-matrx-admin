"use client";

import React from "react";
import dynamic from "next/dynamic";

const ReactMarkdown = dynamic(() => import("react-markdown"), {
  ssr: false, // This will disable server-side rendering for this component
});

import remarkGfm from "remark-gfm";
import { cn } from "@/styles/themes/utils";
import MarkdownTable from "./markdown-table";
import { parseMarkdownTable } from "@/components/mardown-display/parse-markdown-table";

interface MarkdownRendererProps {
  content: string;
  type: "flashcard" | "message";
  fontSize?: number;
  role?: "user" | "assistant";
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  type,
  fontSize = 16,
  role = "assistant",
  className,
}) => {
  const tableData = parseMarkdownTable(content);

  const components = {
    p: ({ node, ...props }) => (
      <p style={{ fontSize: `${fontSize}px` }} className="mb-2" {...props} />
    ),
    ul: ({ node, ...props }) => (
      <ul
        style={{ fontSize: `${fontSize}px` }}
        className="list-disc pl-5 mb-2"
        {...props}
      />
    ),
    ol: ({ node, ...props }) => (
      <ol
        style={{ fontSize: `${fontSize}px` }}
        className="list-decimal pl-5 mb-2"
        {...props}
      />
    ),
    li: ({ node, children, ordered, index, ...props }: any) => {
      if (ordered && typeof index === "number") {
        return (
          <li className="mb-1" style={{ fontSize: `${fontSize}px` }} {...props}>
            <span className="inline-block w-full">
              <span className="inline-block w-4 mr-2 text-right">
                {index + 1}.
              </span>
              <span className="inline-block w-[calc(100%-1.5rem)]">
                {children}
              </span>
            </span>
          </li>
        );
      }
      return (
        <li className="mb-1" style={{ fontSize: `${fontSize}px` }} {...props}>
          {children}
        </li>
      );
    },
    a: ({ node, ...props }) => (
      <a
        className="text-blue-500 underline"
        style={{ fontSize: `${fontSize}px` }}
        {...props}
      />
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
    <div
      className={`${type === "message" ? "mb-4 w-full" : ""} ${
        role === "user" ? "text-right" : "text-left"
      }`}
    >
      <div className={containerStyles}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownRenderer;
