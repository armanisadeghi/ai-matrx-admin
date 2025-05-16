"use client";

import { useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@/styles/themes/ThemeProvider";
import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import { knownConfigOptions, processMarkdownWithConfig } from "./known-configs";
import { markdownSamples } from "./markdown-samples";

// Dynamic imports for client-side only
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

// Dynamically import our view renderer
const ConfigViewRenderer = dynamic(() => import("./custom-views/ConfigViewRenderer"), { 
  ssr: false,
  loading: () => (
    <div className="animate-pulse p-4 space-y-4">
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
      <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded"></div>
    </div>
  )
});

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
  const [selectedConfig, setSelectedConfig] = useState<string>("candidateProfile");
  const [processedData, setProcessedData] = useState<any>(null);

  // Handle parsing Markdown on button click
  const handleParse = useCallback(async () => {
    try {
      // Use the unified processor correctly
      const processor = unified().use(remarkParse).use(remarkGfm);
      const tree = processor.parse(markdown);
      setAst(tree as unknown as MdastNode);
      setParsedMarkdown(markdown);
      
      // Process with selected config
      if (selectedConfig) {
        const config = knownConfigOptions[selectedConfig].config;
        const result = processMarkdownWithConfig({ 
          ast: tree as unknown as MdastNode, 
          config 
        });
        setProcessedData(result);
      }
    } catch (error) {
      console.error("Error parsing Markdown:", error);
    }
  }, [markdown, selectedConfig]);

  const handleConfigChange = (value: string) => {
    setSelectedConfig(value);
    // Reprocess with new config if we already have an AST
    if (ast) {
      const config = knownConfigOptions[value].config;
      const result = processMarkdownWithConfig({ 
        ast, 
        config 
      });
      setProcessedData(result);
    }
  };

  // Handle sample selection
  const handleSampleSelect = (sampleKey: string) => {
    if (markdownSamples[sampleKey]) {
      setMarkdown(markdownSamples[sampleKey]);
    }
  };

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
      {/* Left Side: Markdown Input - 1/3 of the screen */}
      <div className="w-1/3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="border-b border-gray-200 dark:border-gray-700 p-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Select a sample:</p>
          <Select onValueChange={handleSampleSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a markdown sample" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(markdownSamples).map(([key]) => (
                <SelectItem key={key} value={key}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder="Paste your Markdown here..."
          className="flex-1 resize-none font-mono text-base border-0 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-0"
          aria-label="Markdown input"
        />
        <button
          onClick={handleParse}
          className="m-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Parse Markdown"
        >
          Parse Markdown
        </button>
      </div>

      {/* Right Side: Tabs for Analysis - 2/3 of the screen */}
      <div className="w-2/3 flex flex-col overflow-y-auto">
        <Tabs defaultValue="rendered" className="w-full h-full">
          <TabsList className="mx-2 my-1 gap-1 bg-transparent">
            <TabsTrigger value="rendered">Rendered Markdown</TabsTrigger>
            <TabsTrigger value="ast">Raw AST</TabsTrigger>
            <TabsTrigger value="explorer">JSON Explorer</TabsTrigger>
            <TabsTrigger value="processor">Config Processor</TabsTrigger>
            <TabsTrigger value="structured">Structured View</TabsTrigger>
          </TabsList>
          
          {/* Tab 1: Rendered Markdown */}
          <TabsContent value="rendered" className="h-full overflow-auto">
            {parsedMarkdown ? (
              <div className={`prose ${mode === "dark" ? "prose-invert" : ""} max-w-none m-2`}>
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
              <p className="text-gray-500 dark:text-gray-400 m-2">
                Click "Parse Markdown" to see the output.
              </p>
            )}
          </TabsContent>

          {/* Tab 2: Raw AST JSON */}
          <TabsContent value="ast" className="h-full overflow-auto">
            {ast ? (
              <pre className="bg-gray-800 dark:bg-gray-950 text-gray-100 rounded-md overflow-x-auto h-full m-0 p-2">
                <code>{JSON.stringify(ast, null, 2)}</code>
              </pre>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 m-2">
                Click "Parse Markdown" to see the AST.
              </p>
            )}
          </TabsContent>

          {/* Tab 3: JSON Explorer */}
          <TabsContent value="explorer" className="h-full overflow-auto">
            {ast ? (
              <div className="h-full">
                <RawJsonExplorer pageData={ast} />
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 m-2">
                Click "Parse Markdown" to see the JSON Explorer.
              </p>
            )}
          </TabsContent>

          {/* Tab 4: Config Processor */}
          <TabsContent value="processor" className="h-full overflow-auto">
            <div className="m-2 flex flex-col h-full">
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Select a configuration:</p>
                <Select value={selectedConfig} onValueChange={handleConfigChange}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Select a configuration" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(knownConfigOptions).map(([key, option]) => (
                      <SelectItem key={key} value={key}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {processedData ? (
                <div className="flex-1 h-full overflow-auto">
                  <RawJsonExplorer pageData={processedData} />
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Click "Parse Markdown" to process with the selected configuration.
                </p>
              )}
            </div>
          </TabsContent>

          {/* New Tab: Structured View */}
          <TabsContent value="structured" className="h-full overflow-auto p-0">
            {processedData ? (
              <ConfigViewRenderer configKey={selectedConfig} data={processedData} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Click "Parse Markdown" to see the structured view
                </p>
                <button
                  onClick={handleParse}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Parse Markdown
                </button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MarkdownEditor;