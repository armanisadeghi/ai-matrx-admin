"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { dracula, prism } from "react-syntax-highlighter/dist/cjs/styles/prism";

// Import SyntaxHighlighter properly
const SyntaxHighlighter = dynamic(
    () => import("react-syntax-highlighter").then((mod) => mod.Prism),
    { ssr: false }
  );
  
// Define our own CodeProps type since we can't import directly
interface CodeProps {
    mode: "dark" | "light";
    node?: any;
    inline?: boolean;
    className?: string;
    children: ReactNode;
    [key: string]: any;
  }
  
// Define code rendering component with proper typing
export const CodeComponent = ({ mode, node, inline, className, children, ...props }: CodeProps) => {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
        <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
            {/* We need to render this conditionally to avoid type errors with the dynamic import */}
            {mode === "dark" ? (
                <div className="rounded-md overflow-hidden">
                    {/* @ts-ignore - TypeScript doesn't properly handle dynamic components */}
                    <SyntaxHighlighter language={match[1]} style={dracula} PreTag="div" showLineNumbers useInlineStyles>
                        {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                </div>
            ) : (
                <div className="rounded-md overflow-hidden">
                    {/* @ts-ignore - TypeScript doesn't properly handle dynamic components */}
                    <SyntaxHighlighter language={match[1]} style={prism} PreTag="div" showLineNumbers useInlineStyles>
                        {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                </div>
            )}
        </div>
    ) : (
        <code className={className} {...props}>
            {children}
        </code>
    );
};

export default CodeComponent;