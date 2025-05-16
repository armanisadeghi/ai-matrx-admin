"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@/styles/themes/ThemeProvider";
import type { ReactNode } from "react";

// Dynamic imports for client-side only
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

// Import SyntaxHighlighter properly
const SyntaxHighlighter = dynamic(
  () => import("react-syntax-highlighter").then((mod) => mod.Prism),
  { ssr: false }
);

// Import these normally without dynamic
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

// Dynamic import for Prism themes
const lightTheme = dynamic(
  () =>
    import("react-syntax-highlighter/dist/esm/styles/prism").then(
      (mod) => mod.prism
    ),
  { ssr: false }
);
const darkTheme = dynamic(
  () =>
    import("react-syntax-highlighter/dist/esm/styles/prism").then(
      (mod) => mod.dracula
    ),
  { ssr: false }
);

// Define types for the AST
interface MdastNode {
  type: string;
  children?: MdastNode[];
  value?: string;
  depth?: number;
  url?: string;
  lang?: string;
  [key: string]: any;
}

// Define our own CodeProps type since we can't import directly
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: ReactNode;
  [key: string]: any;
}

const MarkdownEditor: React.FC = () => {
  // Theme context
  const { mode } = useTheme();
  // State for Markdown input, parsed AST, and rendered output
  const [markdown, setMarkdown] = useState<string>(`# Sample Markdown

This is a **bold** paragraph with [a link](https://example.com).

## List
- Item 1
- Item 2

\`\`\`javascript
console.log("Hello, World!");
\`\`\`
`);
  const [ast, setAst] = useState<MdastNode | null>(null);
  const [parsedMarkdown, setParsedMarkdown] = useState<string>("");

  // Handle parsing Markdown on button click
  const handleParse = useCallback(async () => {
    try {
      // Use the unified processor correctly
      const processor = unified().use(remarkParse).use(remarkGfm);
      const tree = processor.parse(markdown);
      setAst(tree as unknown as MdastNode);
      setParsedMarkdown(markdown);
    } catch (error) {
      console.error("Error parsing Markdown:", error);
    }
  }, [markdown]);

  // Define code rendering component with proper typing
  const CodeComponent = ({ node, inline, className, children, ...props }: CodeProps) => {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
        {/* We need to render this conditionally to avoid type errors with the dynamic import */}
        {mode === "dark" ? (
          <div className="rounded-md overflow-hidden">
            {/* @ts-ignore - TypeScript doesn't properly handle dynamic components */}
            <SyntaxHighlighter
              language={match[1]}
              style={darkTheme}
              PreTag="div"
              showLineNumbers
              useInlineStyles
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          </div>
        ) : (
          <div className="rounded-md overflow-hidden">
            {/* @ts-ignore - TypeScript doesn't properly handle dynamic components */}
            <SyntaxHighlighter
              language={match[1]}
              style={lightTheme}
              PreTag="div"
              showLineNumbers
              useInlineStyles
            >
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
  
  return (
    <div className="flex h-full overflow-hidden bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Left Side: Markdown Input */}
      <div className="flex-1 p-6 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col gap-4">
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder="Paste your Markdown here..."
          className="flex-1 resize-none p-4 font-mono text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Markdown input"
        />
        <button
          onClick={handleParse}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Parse Markdown"
        >
          Parse Markdown
        </button>
      </div>

      {/* Right Side: Rendered Output and AST */}
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        {/* Rendered Markdown */}
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-4">Rendered Markdown</h2>
          {parsedMarkdown ? (
            <div className={`prose ${mode === "dark" ? "prose-invert" : ""} max-w-none`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: CodeComponent
                }}
              >
                {parsedMarkdown}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Click "Parse Markdown" to see the output.
            </p>
          )}
        </div>

        {/* AST Output */}
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-4">MDAST JSON Structure</h2>
          {ast ? (
            <pre className="p-4 bg-gray-800 dark:bg-gray-950 text-gray-100 rounded-md overflow-x-auto">
              <code>{JSON.stringify(ast, null, 2)}</code>
            </pre>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Click "Parse Markdown" to see the AST.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarkdownEditor;