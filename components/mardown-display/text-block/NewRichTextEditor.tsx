// --- Imports ---
import React, { useState, useEffect } from "react";
import { cn } from "@/styles/themes/utils";
import { Button } from "@/components/ui/button";
// Remove Tabs imports if no longer needed directly here
// Keep icon imports needed for header
import { ExpandIcon, MinimizeIcon, Copy, Download, Edit, Eye } from "lucide-react";
// Remove formatting button icons (Bold, Italic, etc.)
import FullScreenMarkdownEditor from './FullScreenMarkdownEditor'; // Import the new editor
import dynamic from 'next/dynamic'; // For ReactMarkdown

// Dynamically import ReactMarkdown for view mode
const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });
import remarkGfm from 'remark-gfm'; // Add GFM support

// --- TextBlockHeader Props (Remove isEditing) ---
interface TextBlockHeaderProps {
    wordCount: number;
    charCount: number;
    // isEditing: boolean; // REMOVED
    isExpanded: boolean;
    content: string; // Keep for potential future use or remove if not needed by header
    handleCopy: (e: React.MouseEvent) => void;
    handleDownload: (e: React.MouseEvent) => void;
    // toggleEdit: (e: React.MouseEvent) => void; // RENAMED/REPURPOSED
    onEditClick: (e: React.MouseEvent) => void; // NEW: To open the modal
    toggleExpand: (e: React.MouseEvent) => void;
    toggleCollapse: (e: React.MouseEvent) => void;
    isCopied: boolean;
}

// --- EditButton (Simpler, always shows "Edit") ---
// Can be removed if the header button is sufficient
export const EditButton = ({
    onClick, // Changed prop name
}: {
    onClick: (e: React.MouseEvent) => void;
}) => {
    return (
        <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 z-10 bg-neutral-100 dark:bg-neutral-800 opacity-50 hover:opacity-100"
            onClick={onClick} // Use the passed handler
        >
            <Edit className="h-4 w-4 mr-1" />
            Edit
        </Button>
    );
};


// --- TextBlockHeader Component (Adjusted) ---
const TextBlockHeader: React.FC<TextBlockHeaderProps> = ({
    wordCount,
    charCount,
    // isEditing, // REMOVED
    isExpanded,
    // content, // Removed if not used
    handleCopy,
    handleDownload,
    onEditClick, // Use new prop name
    toggleExpand,
    toggleCollapse,
    isCopied,
}) => {
    return (
        <div className="flex justify-between items-center px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
                {/* Removed Editing/Viewing status */}
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{charCount} characters</span>
            </div>
            <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs">
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    {isCopied ? "Copied!" : "Copy"}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload} className="text-xs">
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Save {/* Consider changing label if download format changes */}
                </Button>
                {/* Collapse button logic remains */}
                 <Button variant="ghost" size="sm" onClick={toggleCollapse} className="text-xs">
                    {/* Conditional text based on isCollapsed state needed */}
                    Collapse/Expand
                 </Button>
                <Button variant="ghost" size="sm" onClick={toggleExpand} className="text-xs">
                    {isExpanded ? <MinimizeIcon className="h-3.5 w-3.5" /> : <ExpandIcon className="h-3.5 w-3.5" />}
                </Button>
                 {/* Edit button - always shows Edit */}
                <Button variant="ghost" size="sm" onClick={onEditClick} className="text-xs">
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Edit
                </Button>
            </div>
        </div>
    );
};

// --- Remove RichTextEditor component ---

// --- RichTextBlock Props ---
interface RichTextBlockProps {
    content: string;
    className?: string;
    onContentChange?: (newContent: string) => void;
    // initialEditMode = false, // REMOVED
}

// --- RichTextBlock Component (Refactored) ---
const RichTextBlock: React.FC<RichTextBlockProps> = ({
    content: initialContent,
    className,
    onContentChange,
}) => {
    const [content, setContent] = useState(initialContent);
    const [isCopied, setIsCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    // const [isEditing, setIsEditing] = useState(initialEditMode); // REMOVED
    const [isEditorOpen, setIsEditorOpen] = useState(false); // NEW state for modal
    // isDark state remains if needed for other styling

    // wordCount/charCount logic remains
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const charCount = content.length;

    // useEffect for dark mode remains

    // handleCopy logic remains
    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // handleDownload logic remains (consider changing filename/type if it's now markdown)
    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const blob = new Blob([content], { type: "text/markdown" }); // CHANGED type
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `document.md`; // CHANGED extension
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // toggleExpand logic remains
    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
        if (isCollapsed) setIsCollapsed(false);
         // Close editor if expanding/minimizing from non-edit state? Optional.
         // if (isEditorOpen) setIsEditorOpen(false);
    };

    // toggleCollapse logic remains
    const toggleCollapse = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        // Removed !isEditing check as inline editing is gone
        setIsCollapsed(!isCollapsed);
        if (isExpanded) setIsExpanded(false);
    };

    // --- NEW Handlers for Full Screen Editor ---
    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditorOpen(true);
         // Maybe ensure it's not collapsed/expanded when editing?
         setIsCollapsed(false);
         setIsExpanded(false);
    };

    const handleSaveEdit = (newContent: string) => {
        setContent(newContent);
        onContentChange?.(newContent);
        setIsEditorOpen(false); // Close the modal on save
    };

    const handleCancelEdit = () => {
        setIsEditorOpen(false); // Close the modal on cancel
    };

    const collapsedHeight = 160;

    return (
        // Container div styling remains largely the same
        <div
            className={cn(
                "my-4 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 transition-all duration-200",
                 // Expansion logic might conflict with modal, review if needed.
                 // Maybe disable expansion when editor is open?
                isExpanded && !isEditorOpen && "fixed inset-4 z-50 bg-background",
                className
            )}
        >
            {/* Pass new props to header */}
            <TextBlockHeader
                wordCount={wordCount}
                charCount={charCount}
                isExpanded={isExpanded}
                content={content} // Or remove if header doesn't need it
                handleCopy={handleCopy}
                handleDownload={handleDownload}
                onEditClick={handleEditClick} // Pass the modal opener
                toggleExpand={toggleExpand}
                toggleCollapse={toggleCollapse}
                isCopied={isCopied}
            />
            {/* No longer conditionally render based on isEditing */}
            <div className="relative">
                {/* Optional: Keep floating Edit button if desired */}
                {/* <EditButton onClick={handleEditClick} /> */}

                 {/* --- View Mode (Always Rendered) --- */}
                <div className="relative">
                    <div
                        className={cn(
                            "overflow-hidden transition-all duration-200",
                             // Use style for maxHeight to ensure Tailwind compiles the class
                        )}
                        style={{ maxHeight: isCollapsed ? `${collapsedHeight}px` : 'none' }}
                    >
                        {/* --- CHANGED: Render using ReactMarkdown --- */}
                        <div className="prose dark:prose-invert p-4 max-w-none bg-background text-foreground">
                            {typeof window !== 'undefined' && (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {content}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                    {/* Collapse overlay remains the same */}
                    {isCollapsed && (
                         <div
                            className={cn(
                                "absolute bottom-0 left-0 right-0 h-24 opacity-80 cursor-pointer",
                                "bg-gradient-to-t from-background to-transparent" // Use theme colors
                            )}
                            onClick={() => toggleCollapse()} // Simplified onClick
                        >
                            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-muted-foreground text-sm">
                                Click to expand more content
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Render the FullScreenMarkdownEditor Modal --- */}
            <FullScreenMarkdownEditor
                isOpen={isEditorOpen}
                initialContent={content}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
            />
        </div>
    );
};

export default RichTextBlock;