"use client";

import { Textarea } from "@/components/ui";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import CodeComponent from "./parts/CodeComponent";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

interface MarkdownInputProps {
    markdown: string;
    parsedMarkdown: string;
    onMarkdownChange: (markdown: string) => void;
    mode: "light" | "dark";
}

const MarkdownInput: React.FC<MarkdownInputProps> = ({
    markdown,
    parsedMarkdown,
    onMarkdownChange,
    mode,
}) => {
    return (
        <div className="w-1/3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            <Textarea
                value={markdown}
                onChange={(e) => onMarkdownChange(e.target.value)}
                placeholder="Paste your Markdown here..."
                className="flex-1 resize-none font-mono text-base border-0 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-0 min-h-[200px]"
                aria-label="Markdown input"
                rows={12}
            />
            
            {/* Preview section below textarea */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-2 overflow-auto flex-1">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Preview</h3>
                {parsedMarkdown ? (
                    <div className={`prose ${mode === "dark" ? "prose-invert" : ""} max-w-none`}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code: (props) => <CodeComponent mode={mode} {...(props as any)} />,
                            }}
                        >
                            {parsedMarkdown}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400">Start typing to see the preview.</p>
                )}
            </div>
        </div>
    );
};

export default MarkdownInput; 