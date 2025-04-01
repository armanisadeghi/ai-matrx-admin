import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { cn } from "@/styles/themes/utils";
import CodeEditor from "@/components/code-editor/CodeEditor";
import CodeBlockHeader from "./CodeBlockHeader";
import { EditButton } from "./CodeBlockHeader";
import { useTheme } from "@/styles/themes/ThemeProvider";

interface CodeBlockProps {
    code: string;
    language: string;
    fontSize?: number;
    showLineNumbers?: boolean;
    wrapLines?: boolean;
    className?: string;
    onCodeChange?: (newCode: string) => void;
    inline?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
    code: initialCode,
    language,
    fontSize = 16,
    showLineNumbers = false,
    wrapLines = false,
    className,
    onCodeChange,
    inline = false,
}) => {
    const [code, setCode] = useState(initialCode);
    const [isCopied, setIsCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [lineNumbers, setLineNumbers] = useState(showLineNumbers);
    const [showWrapLines, setShowWrapLines] = useState(wrapLines);

    const { mode } = useTheme();

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const blob = new Blob([code], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `code.${language}`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const toggleLineNumbers = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLineNumbers(!lineNumbers);
    };

    const toggleWrapLines = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowWrapLines(!showWrapLines);
    };

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
        if (isCollapsed) setIsCollapsed(false);
    };

    const toggleCollapse = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (isEditing) return;
        setIsCollapsed(!isCollapsed);
        if (isExpanded) setIsExpanded(false);
    };

    const toggleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(!isEditing);
        if (!isEditing) {
            setIsExpanded(true);
            setIsCollapsed(false);
        } else {
            setIsExpanded(false);
        }
    };

    const handleCodeChange = (newCode: string | undefined) => {
        if (newCode) {
            setCode(newCode);
            onCodeChange?.(newCode);
        }
    };

    return (
        <div
            className={cn(
                "w-full my-4 rounded-t-xl rounded-b-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 transition-all duration-200",
                isExpanded && "fixed inset-4 z-50 bg-white dark:bg-neutral-900",
                className
            )}
        >
            <CodeBlockHeader
                language={language}
                linesCount={code.split("\n").length}
                isEditing={isEditing}
                isExpanded={isExpanded}
                code={code}
                handleCopy={handleCopy}
                handleDownload={handleDownload}
                toggleEdit={toggleEdit}
                toggleExpand={toggleExpand}
                toggleCollapse={toggleCollapse}
                toggleLineNumbers={toggleLineNumbers}
                // toggleWrapLines={toggleWrapLines}
                isCopied={isCopied}
            />
            <div className="relative">
                <EditButton isEditing={isEditing} toggleEdit={toggleEdit} />

                {isEditing ? (
                    <div className={cn("w-full", isExpanded ? "h-[calc(100vh-8rem)]" : "min-h-[200px]")}>
                        <CodeEditor defaultLanguage={language} defaultValue={code} onChange={handleCodeChange} />
                    </div>
                ) : (
                    <div className="relative">
                        <div className={cn("overflow-hidden transition-all duration-200", isCollapsed ? "max-h-[150px]" : "max-h-none")}>
                            <SyntaxHighlighter
                                language={language}
                                style={mode === "dark" ? vscDarkPlus : vs}
                                showLineNumbers={lineNumbers}
                                wrapLines={showWrapLines}
                                wrapLongLines={showWrapLines}
                                customStyle={{
                                    paddingTop: "1rem",
                                    paddingRight: "1rem",
                                    paddingBottom: "1rem",
                                    paddingLeft: "1rem",
                                    fontSize: `${fontSize}px`,
                                    height: "auto",
                                    minHeight: isExpanded ? "calc(100vh - 8rem)" : "auto",
                                }}
                            >
                                {code}
                            </SyntaxHighlighter>
                        </div>

                        {isCollapsed && (
                            <div
                                className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-neutral-900 to-transparent opacity-80 cursor-pointer"
                                onClick={toggleCollapse}
                            >
                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-neutral-400 text-sm">
                                    Click to expand {code.split("\n").length - 3} more lines
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodeBlock;
