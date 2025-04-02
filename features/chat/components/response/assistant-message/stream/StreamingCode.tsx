import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { cn } from "@/styles/themes/utils";
import LanguageDisplay from "@/components/mardown-display/LanguageDisplay";
import { useTheme } from "@/styles/themes/ThemeProvider";
import CodeBlockHeader from "@/components/mardown-display/code/CodeBlockHeader";

interface StreamingCodeProps {
    code: string;
    language: string;
    fontSize?: number;
    className?: string;
}

const StreamingCode: React.FC<StreamingCodeProps> = ({ code, language, fontSize = 16, className }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

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

    return (
        <div
            className={cn(
                "w-full my-4 rounded-t-xl rounded-b-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 transition-all duration-200",
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
                isCopied={isCopied}
            />

            <div className="relative">
                <div className={cn("overflow-hidden transition-all duration-200 max-h-none")}>
                    <SyntaxHighlighter
                        language={language}
                        style={mode === "dark" ? vscDarkPlus : vs}
                        showLineNumbers={false}
                        wrapLines={true}
                        wrapLongLines={true}
                        customStyle={{
                            paddingTop: "1rem",
                            paddingRight: "1rem",
                            paddingBottom: "1rem",
                            paddingLeft: "1rem",
                            fontSize: `${fontSize}px`,
                            height: "auto",
                            minHeight: "auto",
                        }}
                    >
                        {code}
                    </SyntaxHighlighter>
                </div>
            </div>
        </div>
    );
};

export default StreamingCode;
