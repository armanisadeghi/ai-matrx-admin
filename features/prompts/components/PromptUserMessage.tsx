"use client";
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Copy, Edit, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromptUserMessageProps {
    content: string;
    messageIndex: number;
    onContentChange?: (messageIndex: number, newContent: string) => void;
}

export function PromptUserMessage({ content, messageIndex, onContentChange }: PromptUserMessageProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const canCollapse = content.length > 300;

    // Auto-collapse long messages on mount
    useEffect(() => {
        if (content.length > 300) {
            setIsCollapsed(true);
        }
    }, [content.length]);

    // Reset edit content when message changes
    useEffect(() => {
        if (!isEditing) {
            setEditContent(content);
            setHasUnsavedChanges(false);
        }
    }, [content, isEditing]);

    // Auto-resize textarea in edit mode
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [isEditing, editContent]);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(content).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditContent(content);
        setIsEditing(true);
    };

    const handleSave = () => {
        if (onContentChange) {
            onContentChange(messageIndex, editContent);
        }
        setIsEditing(false);
        setHasUnsavedChanges(false);
    };

    const handleCancel = () => {
        if (hasUnsavedChanges && !window.confirm("Discard unsaved changes?")) return;
        setEditContent(content);
        setIsEditing(false);
        setHasUnsavedChanges(false);
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setEditContent(newContent);
        setHasUnsavedChanges(newContent !== content);
    };

    const toggleCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (canCollapse) {
            setIsCollapsed(!isCollapsed);
        }
    };

    return (
        <div
            className="bg-blue-100 dark:bg-blue-900/30 ml-12 rounded-lg relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header with controls */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    User
                </div>
                {(isHovered || isEditing) && (
                    <div className="flex items-center gap-1">
                        {isEditing ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSave}
                                    className="h-6 px-2 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                                >
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    Save
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancel}
                                    className="h-6 px-2 text-xs text-gray-600 dark:text-gray-400"
                                >
                                    <X className="w-3.5 h-3.5 mr-1" />
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopy}
                                    className="h-6 w-6 p-0 text-gray-600 dark:text-gray-400"
                                    title="Copy"
                                >
                                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </Button>
                                {onContentChange && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleEdit}
                                        className="h-6 w-6 p-0 text-gray-600 dark:text-gray-400"
                                        title="Edit"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                                {canCollapse && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleCollapse}
                                        className="h-6 w-6 p-0 text-gray-600 dark:text-gray-400"
                                        title={isCollapsed ? "Expand" : "Collapse"}
                                    >
                                        {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="px-4 pb-3">
                {isEditing ? (
                    <div className="space-y-2">
                        <textarea
                            ref={textareaRef}
                            value={editContent}
                            onChange={handleTextareaChange}
                            className="w-full px-3 py-2 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 scrollbar-thin"
                            rows={5}
                        />
                        {hasUnsavedChanges && (
                            <div className="text-xs text-amber-600 dark:text-amber-400">
                                Unsaved changes
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative">
                        <div
                            ref={contentRef}
                            className={`text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words overflow-hidden transition-all duration-300 ${
                                isCollapsed ? "max-h-20" : ""
                            }`}
                        >
                            {content}
                        </div>
                        {isCollapsed && canCollapse && (
                            <div
                                className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-blue-100 dark:from-blue-900/30 to-transparent cursor-pointer rounded"
                                onClick={toggleCollapse}
                            >
                                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-gray-500 dark:text-gray-400 text-xs">
                                    Click to expand
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

