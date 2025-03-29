import React from "react";
import { Copy, Check, Download, Expand, Eye, Minimize, Edit2, WrapText, Hash } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import LanguageDisplay from "./LanguageDisplay";

interface CodeBlockHeaderProps {
    language: string;
    linesCount: number;
    isEditing: boolean;
    isExpanded: boolean;
    code: string;
    handleCopy: (e: React.MouseEvent) => void;
    handleDownload: (e: React.MouseEvent) => void;
    toggleEdit: (e: React.MouseEvent) => void;
    toggleExpand: (e: React.MouseEvent) => void;
    toggleCollapse: (e?: React.MouseEvent) => void;
    toggleLineNumbers: (e: React.MouseEvent) => void;
    toggleWrapLines: (e: React.MouseEvent) => void;
    isCopied: boolean;
}

export const CodeBlockHeader: React.FC<CodeBlockHeaderProps> = ({
    language,
    linesCount,
    isEditing,
    isExpanded,
    code,
    handleCopy,
    handleDownload,
    toggleEdit,
    toggleExpand,
    toggleCollapse,
    toggleLineNumbers,
    toggleWrapLines,
    isCopied,
}) => {
    // Determine if collapse functionality should be available
    const canCollapse = linesCount > 5;

    return (
        <div
            className={cn(
                "flex items-center justify-between",
                "pl-2 py-0 rounded-t-xl",
                "bg-zinc-300 dark:bg-zinc-700",
                "text-xs text-gray-700 dark:text-gray-300",
                "transition-all duration-200",
                !isEditing && canCollapse && "cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            )}
            onClick={isEditing || !canCollapse ? undefined : toggleCollapse}
        >
            <div className="flex items-center space-x-4">
                <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex items-center space-x-2">
                    <LanguageDisplay language={language} />
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                        {linesCount} {linesCount === 1 ? "line" : "lines"}
                    </span>
                </div>
            </div>
            <CodeBlockButtons
                isEditing={isEditing}
                isExpanded={isExpanded}
                isCopied={isCopied}
                canCollapse={canCollapse}
                handleCopy={handleCopy}
                handleDownload={handleDownload}
                toggleEdit={toggleEdit}
                toggleExpand={toggleExpand}
                toggleLineNumbers={toggleLineNumbers}
                toggleWrapLines={toggleWrapLines}
            />
        </div>
    );
};

interface CodeBlockButtonsProps {
    isEditing: boolean;
    isExpanded: boolean;
    isCopied: boolean;
    canCollapse: boolean;
    handleCopy: (e: React.MouseEvent) => void;
    handleDownload: (e: React.MouseEvent) => void;
    toggleEdit: (e: React.MouseEvent) => void;
    toggleExpand: (e: React.MouseEvent) => void;
    toggleLineNumbers: (e: React.MouseEvent) => void;
    toggleWrapLines: (e: React.MouseEvent) => void;
}

const CodeBlockButtons: React.FC<CodeBlockButtonsProps> = ({
    isEditing,
    isExpanded,
    isCopied,
    handleCopy,
    handleDownload,
    toggleLineNumbers,
    toggleWrapLines,
    toggleEdit,
    toggleExpand,
}) => {
    const buttonClass =
        "py-3 px-2 rounded-xl text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors flex items-center gap-1";
    return (
        <div className="flex items-center space-x-1">
            <button onClick={toggleLineNumbers} className={buttonClass} title="Toggle line numbers">
                <Hash size={16} />
                <span>Lines</span>
            </button>
            <button onClick={toggleWrapLines} className={buttonClass} title="Toggle wrap lines">
                <WrapText size={16} />
                <span>Wrap</span>
            </button>
            <button onClick={handleCopy} className={buttonClass} title={isCopied ? "Copied!" : "Copy code"}>
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                <span>Copy</span>
            </button>
            <button onClick={handleDownload} className={buttonClass} title="Download code">
                <Download size={16} />
                <span>Download</span>
            </button>
            {isEditing ? (
                <button onClick={toggleEdit} className={buttonClass} title="Exit edit mode">
                    <Eye size={16} />
                    <span>View</span>
                </button>
            ) : (
                <button onClick={toggleExpand} className={buttonClass} title={isExpanded ? "Minimize" : "Expand"}>
                    {isExpanded ? <Minimize size={16} /> : <Expand size={16} />}
                    <span>{isExpanded ? "Minimize" : "Expand"}</span>
                </button>
            )}
        </div>
    );
};

export const EditButton = ({ isEditing, toggleEdit }) => {
    if (isEditing) return null;
    return (
        <button
            onClick={toggleEdit}
            className={cn(
                "absolute top-4 right-2 z-10 p-1 rounded-md bg-transparent backdrop-blur-sm",
                "hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors shadow-sm",
                "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
                ""
            )}
            title="Edit code"
        >
            <Edit2 size={16} />
        </button>
    );
};

export default CodeBlockHeader;
