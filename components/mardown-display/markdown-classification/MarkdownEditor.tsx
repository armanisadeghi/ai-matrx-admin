"use client";

import { useState, useCallback, Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@/styles/themes/ThemeProvider";
import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Switch } from "@/components/ui";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import { processMarkdownWithConfig } from "./json-config-system/config-processor";
import { markdownSamples } from "./markdown-samples";
import CandidateProfileSkeleton from "./custom-views/CandidateProfileSkeleton";

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
import { configRegistry } from "./json-config-system/config-registry";

// Import themes directly but use them only on client side
import { prism, dracula } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useState as useStateImport, useEffect as useEffectImport } from "react";

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

// Add props interface near the top before the component definition
interface MarkdownEditorProps {
  initialMarkdown?: string;
  showSampleSelector?: boolean;
  showConfigSelector?: boolean;
  showLoadingSimulator?: boolean;
}

// Update the component signature and initialization
const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialMarkdown,
  showSampleSelector = true,
  showConfigSelector = true,
  showLoadingSimulator = true
}) => {
  // Theme context
  const { mode } = useTheme();
  // State for Markdown input, parsed AST, and rendered output
  const [markdown, setMarkdown] = useState<string>(initialMarkdown || `# Sample Markdown

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
  const [simulateLoading, setSimulateLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Add effect to parse initial markdown if provided
  useEffect(() => {
    if (initialMarkdown) {
      handleParse();
    }
  }, [initialMarkdown]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle parsing Markdown on button click
  const handleParse = useCallback(async () => {
    try {
      // Set loading state if simulation is enabled
      if (simulateLoading) {
        setIsLoading(true);
        setProcessedData(null); // Clear any existing data while loading
      }
      
      // Use the unified processor correctly
      const processor = unified().use(remarkParse).use(remarkGfm);
      const tree = processor.parse(markdown);
      setAst(tree as unknown as MdastNode);
      setParsedMarkdown(markdown);
      
      // Process with selected config using only the JSON system
      if (selectedConfig) {
        const config = configRegistry[selectedConfig]?.config;
        if (config) {
          const result = processMarkdownWithConfig({ 
            ast: tree as unknown as MdastNode, 
            config 
          });
          
          // If simulating loading, delay setting the processed data
          if (simulateLoading) {
            // Use a minimum 2 second delay
            const startTime = Date.now();
            setTimeout(() => {
              setProcessedData(result);
              // Ensure we display skeleton for at least 2 seconds total
              const elapsed = Date.now() - startTime;
              const remainingTime = Math.max(0, 2000 - elapsed);
              setTimeout(() => setIsLoading(false), remainingTime);
            }, 2000);
          } else {
            setProcessedData(result);
          }
        }
      }
    } catch (error) {
      console.error("Error parsing Markdown:", error);
      setIsLoading(false);
    }
  }, [markdown, selectedConfig, simulateLoading]);

  const handleConfigChange = (value: string) => {
    setSelectedConfig(value);
    // Reprocess with new config if we already have an AST
    if (ast) {
      const config = configRegistry[value]?.config;
      if (config) {
        if (simulateLoading) {
          setIsLoading(true);
          setProcessedData(null); // Clear existing data while loading
          // Use a minimum 2 second delay
          const startTime = Date.now();
          setTimeout(() => {
            const result = processMarkdownWithConfig({ ast, config });
            setProcessedData(result);
            // Ensure we display skeleton for at least 2 seconds total
            const elapsed = Date.now() - startTime;
            const remainingTime = Math.max(0, 2000 - elapsed);
            setTimeout(() => setIsLoading(false), remainingTime);
          }, 2000);
        } else {
          const result = processMarkdownWithConfig({ ast, config });
          setProcessedData(result);
        }
      }
    }
  };

  // Get available configs from the JSON system
  const getAvailableConfigs = () => {
    return configRegistry;
  };

  // Handle sample selection
  const handleSampleSelect = (sampleKey: string) => {
    if (markdownSamples[sampleKey]) {
      setMarkdown(markdownSamples[sampleKey]);
    }
  };

  // Check if current config is a modern view
  const isModernView = () => {
    return selectedConfig.includes('modern') || 
           configRegistry[selectedConfig]?.type === 'candidate_profile_modern' ||
           configRegistry[selectedConfig]?.type === 'candidate_profile_modern_one_column';
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
              style={dracula}
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
              style={prism}
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
        {showSampleSelector && (
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
        )}
        
        {/* Add config selection to left column */}
        {showConfigSelector && (
          <div className="border-b border-gray-200 dark:border-gray-700 p-2">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Select Parsing Configuration:</p>
            <Select value={selectedConfig} onValueChange={handleConfigChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a configuration" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(getAvailableConfigs()).map(([key, option]) => (
                  <SelectItem key={key} value={key}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Add loading simulation toggle */}
        {showLoadingSimulator && (
          <div className="border-b border-gray-200 dark:border-gray-700 p-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">Simulate Loading (2s):</p>
              <Switch 
                checked={simulateLoading} 
                onCheckedChange={setSimulateLoading} 
                aria-label="Toggle loading simulation"
              />
            </div>
          </div>
        )}
        
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder="Paste your Markdown here..."
          className="flex-1 resize-none font-mono text-base border-0 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-0"
          aria-label="Markdown input"
        />
        <div className="flex items-center justify-center border-t border-gray-200 dark:border-gray-700 p-2">
          <button
            onClick={handleParse}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Parse Markdown"
          >
            Parse Markdown
          </button>
        </div>
      </div>

      {/* Right Side: Tabs for Analysis - 2/3 of the screen */}
      <div className="w-2/3 flex flex-col">
        <Tabs defaultValue="rendered" className="w-full h-full flex flex-col">
          <TabsList className="mx-2 my-1 gap-1 bg-transparent flex-shrink-0">
            <TabsTrigger value="rendered">Rendered Markdown</TabsTrigger>
            <TabsTrigger value="ast">Raw AST</TabsTrigger>
            <TabsTrigger value="explorer">AST Explorer</TabsTrigger>
            <TabsTrigger value="processedJson">Processed JSON</TabsTrigger>
            <TabsTrigger value="structured">Structured View</TabsTrigger>
          </TabsList>
          
          {/* Tab 1: Rendered Markdown */}
          <TabsContent value="rendered" className="h-full overflow-auto flex-grow">
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
          <TabsContent value="ast" className="h-full overflow-auto flex-grow">
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

          {/* Tab 3: JSON Explorer for AST */}
          <TabsContent value="explorer" className="h-full overflow-auto flex-grow">
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

          {/* New Tab: Processed JSON Explorer */}
          <TabsContent value="processedJson" className="h-full overflow-auto flex-grow">
            {processedData ? (
              <div className="h-full">
                <RawJsonExplorer pageData={processedData} />
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 m-2">
                Click "Parse Markdown" to see the processed JSON data.
              </p>
            )}
          </TabsContent>

          {/* Structured View Tab */}
          <TabsContent value="structured" className="h-full overflow-hidden p-0 flex-grow">
            {isLoading && isModernView() ? (
              <div className="p-4 h-full overflow-auto">
                <CandidateProfileSkeleton />
              </div>
            ) : processedData ? (
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