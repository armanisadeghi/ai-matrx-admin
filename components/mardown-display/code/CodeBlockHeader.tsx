import React  from "react";
import { Copy, Check, Download, Expand, Eye, Minimize, Edit2, WrapText, Hash, Globe, Loader2 } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import LanguageDisplay from "../LanguageDisplay";
import { BsChevronBarContract, BsChevronBarExpand } from "react-icons/bs";
import { FaEdit } from "react-icons/fa";

interface CodeBlockHeaderProps {
    language: string;
    linesCount: number;
    isEditing: boolean;
    isFullScreen: boolean;
    isCollapsed: boolean;
    code: string;
    handleCopy: (e: React.MouseEvent) => void;
    handleDownload: (e: React.MouseEvent) => void;
    toggleEdit?: (e: React.MouseEvent) => void;
    toggleFullScreen?: (e: React.MouseEvent) => void;
    toggleCollapse?: (e?: React.MouseEvent) => void;
    toggleLineNumbers?: (e: React.MouseEvent) => void;
    toggleWrapLines?: (e: React.MouseEvent) => void;
    isCopied: boolean;
    isMobile: boolean;
    isCompleteHTML?: boolean;
    handleViewHTML?: () => void;
    isViewingHTML?: boolean;
    isCreatingPage?: boolean;
}

export const CodeBlockHeader: React.FC<CodeBlockHeaderProps> = ({
    language,
    linesCount,
    isEditing,
    isFullScreen,
    isCollapsed,
    code,
    handleCopy,
    handleDownload,
    toggleEdit,
    toggleFullScreen,
    toggleCollapse,
    toggleLineNumbers,
    toggleWrapLines,
    isCopied,
    isMobile,
    isCompleteHTML = false,
    handleViewHTML,
    isViewingHTML = false,
    isCreatingPage = false,
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
                !isEditing && canCollapse && "cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors",
            )}
            onClick={isEditing || !canCollapse ? undefined : toggleCollapse}
        >
            <div className="flex items-center space-x-4">
                {!language && (
                    <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                )}
                <div className="flex items-center space-x-2">
                    <LanguageDisplay language={language} isMobile={isMobile} />
                    {!isMobile && (
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">
                            {linesCount} {linesCount === 1 ? "line" : "lines"}
                        </span>
                    )}
                </div>
                {/* View HTML Button */}
                {isCompleteHTML && handleViewHTML && !isMobile && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewHTML();
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300"
                        title={isViewingHTML ? "Show Code" : "View HTML Page"}
                        disabled={isCreatingPage}
                    >
                        {isCreatingPage ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Creating...</span>
                            </>
                        ) : isViewingHTML ? (
                            <>
                                <Eye size={14} />
                                <span>Code</span>
                            </>
                        ) : (
                            <>
                                <Globe size={14} />
                                <span>View</span>
                            </>
                        )}
                    </button>
                )}
            </div>
            <CodeBlockButtons
                isEditing={isEditing}
                isFullScreen={isFullScreen}
                isCopied={isCopied}
                canCollapse={canCollapse}
                isCollapsed={isCollapsed}
                handleCopy={handleCopy}
                handleDownload={handleDownload}
                toggleEdit={toggleEdit}
                toggleFullScreen={toggleFullScreen}
                toggleLineNumbers={toggleLineNumbers}
                toggleWrapLines={toggleWrapLines}
                toggleCollapse={toggleCollapse}
                isMobile={isMobile}
            />
        </div>
    );
};



interface CodeBlockButtonsProps {
    isEditing: boolean;
    isFullScreen: boolean;
    isCopied: boolean;
    canCollapse: boolean;
    isCollapsed: boolean;
    handleCopy: (e: React.MouseEvent) => void;
    handleDownload: (e: React.MouseEvent) => void;
    toggleEdit?: (e: React.MouseEvent) => void;
    toggleFullScreen?: (e: React.MouseEvent) => void;
    toggleLineNumbers?: (e: React.MouseEvent) => void;
    toggleWrapLines?: (e: React.MouseEvent) => void;
    toggleCollapse?: (e?: React.MouseEvent) => void;
    isMobile: boolean;
}

const CodeBlockButtons: React.FC<CodeBlockButtonsProps> = ({
    isEditing,
    isFullScreen,
    isCopied,
    canCollapse,
    isCollapsed,
    handleCopy,
    handleDownload,
    toggleLineNumbers,
    toggleWrapLines,
    toggleEdit,
    toggleFullScreen,
    toggleCollapse,
    isMobile,
}) => {
    const buttonClass =
        "py-3 px-2 rounded-xl text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors flex items-center gap-1";

    return (
        <div className="flex items-center space-x-1">
            {toggleLineNumbers && !isMobile && (
                <button onClick={toggleLineNumbers} className={buttonClass} title="Toggle line numbers">
                    <Hash size={16} />
                    <span>Lines</span>
                </button>
            )}

            {toggleWrapLines && !isMobile && (
                <button onClick={toggleWrapLines} className={buttonClass} title="Toggle wrap lines">
                    <WrapText size={16} />
                    <span>Wrap</span>
                </button>
            )}

            {toggleFullScreen && !isEditing && !isMobile && (
                <button onClick={toggleFullScreen} className={buttonClass} title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}>
                    {isFullScreen ? <Minimize size={16} /> : <Expand size={16} />}
                    <span>{isFullScreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                </button>
            )}
            {!isMobile && (
                <button onClick={handleDownload} className={buttonClass} title="Download code">
                    <Download size={16} />
                    <span>Download</span>
                </button>
            )}

            {toggleEdit && isEditing && !isMobile && (
                <button onClick={toggleEdit} className={buttonClass} title="Exit edit mode">
                    <Eye size={16} />
                    <span>View</span>
                </button>
            )}

            {toggleCollapse && !isEditing && canCollapse && (
                <button onClick={toggleCollapse} className={buttonClass} title={isCollapsed ? "Expand" : "Collapse"}>
                    {isCollapsed ? <BsChevronBarContract size={16} /> : <BsChevronBarExpand size={16} />}
                    <span>{isCollapsed ? "Expand" : "Collapse"}</span>
                </button>
            )}
            <button onClick={handleCopy} className={buttonClass} title={isCopied ? "Copied!" : "Copy code"}>
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                <span>Copy</span>
            </button>
        </div>
    );
};

export const EditButton = ({ isEditing, toggleEdit }) => {
    if (isEditing || !toggleEdit) return null;

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
            <FaEdit size={16} />
        </button>
    );
};

export default CodeBlockHeader;
