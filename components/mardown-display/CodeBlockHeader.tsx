import React from "react";
import { Copy, Check, Download, Expand, Eye, Minimize, Edit2 } from "lucide-react";
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
    isCopied,
}) => (
    <div
        className={cn(
            "flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700",
            !isEditing && "cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        )}
        onClick={isEditing ? undefined : toggleCollapse}
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
            handleCopy={handleCopy}
            handleDownload={handleDownload}
            toggleEdit={toggleEdit}
            toggleExpand={toggleExpand}
        />
    </div>
);

interface CodeBlockButtonsProps {
    isEditing: boolean;
    isExpanded: boolean;
    isCopied: boolean;
    handleCopy: (e: React.MouseEvent) => void;
    handleDownload: (e: React.MouseEvent) => void;
    toggleEdit: (e: React.MouseEvent) => void;
    toggleExpand: (e: React.MouseEvent) => void;
}

const CodeBlockButtons: React.FC<CodeBlockButtonsProps> = ({
    isEditing,
    isExpanded,
    isCopied,
    handleCopy,
    handleDownload,
    toggleEdit,
    toggleExpand,
}) => {
    const buttonClass =
        "p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors";

    return (
        <div className="flex items-center space-x-2">
            <button onClick={handleCopy} className={buttonClass} title={isCopied ? "Copied!" : "Copy code"}>
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button onClick={handleDownload} className={buttonClass} title="Download code">
                <Download size={16} />
            </button>
            {isEditing ? (
                <button onClick={toggleEdit} className={buttonClass} title="Exit edit mode">
                    <Eye size={16} />
                </button>
            ) : (
                <button onClick={toggleExpand} className={buttonClass} title={isExpanded ? "Minimize" : "Expand"}>
                    {isExpanded ? <Minimize size={16} /> : <Expand size={16} />}
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
