"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import CodeComponent from "./parts/CodeComponent";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Ensure textarea always reflects the latest markdown prop
    useEffect(() => {
        if (textareaRef.current && textareaRef.current.value !== markdown) {
            textareaRef.current.value = markdown;
        }
    }, [markdown]);

    // Stop propagation of events to prevent overlay close
    const handleContainerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        e.stopPropagation();
        onMarkdownChange(e.target.value);
    };

    return (
        <div 
            className="w-1/3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden h-full"
            onClick={handleContainerClick}
        >
            <ResizablePanelGroup
                direction="vertical"
                className="h-full"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <ResizablePanel defaultSize={50} minSize={10}>
                    <textarea
                        ref={textareaRef}
                        value={markdown}
                        onChange={handleTextareaChange}
                        placeholder="Paste your Markdown here..."
                        className="h-full w-full p-4 font-mono text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none border-0 resize-none"
                        aria-label="Markdown input"
                        onClick={(e) => e.stopPropagation()}
                    />
                </ResizablePanel>
                
                <ResizableHandle withHandle />
                
                <ResizablePanel defaultSize={50} minSize={20}>
                    <div className="h-full p-2 overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Simple Formatted Markdown</h3>
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
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};

export default MarkdownInput; 