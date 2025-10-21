"use client";
import React, { useState, useRef, useEffect } from "react";
import { Copy, Edit, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromptUserMessageProps {
    content: string;
    messageIndex: number;
    onContentChange?: (messageIndex: number, newContent: string) => void;
}

export function PromptUserMessage({ content, messageIndex, onContentChange }: PromptUserMessageProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        setIsCollapsed(false); // Expand when editing
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

    const toggleCollapse = () => {
        if (!isEditing) {
            setIsCollapsed(!isCollapsed);
        }
    };

    const handleHeaderClick = () => {
        if (!isEditing) {
            toggleCollapse();
        }
    };

    return (
        <div className="ml-12">
            {/* Unified container with border and background */}
            <div className={`bg-zinc-100 dark:bg-zinc-850 border border-zinc-300 dark:border-zinc-700 ${isCollapsed && !isEditing ? 'rounded-t-lg' : 'rounded-lg'}`}>
                {/* Thin delicate header */}
                <div 
                    className="flex items-center justify-between px-3 py-2 cursor-pointer"
                    onClick={handleHeaderClick}
                >
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        User
                    </div>
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
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="px-3 pb-3 relative">
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                ref={textareaRef}
                                value={editContent}
                                onChange={handleTextareaChange}
                                className="w-full text-sm text-gray-800 dark:text-gray-200 bg-zinc-50 dark:bg-zinc-900 border-none outline-none focus:outline-none focus:ring-0 resize-none overflow-hidden"
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
                                className={`text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words overflow-hidden transition-all duration-300 ${
                                    isCollapsed ? "max-h-16" : ""
                                }`}
                            >
                                {content}
                            </div>
                            {isCollapsed && (
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-zinc-100 dark:from-zinc-850 to-transparent pointer-events-none"
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

