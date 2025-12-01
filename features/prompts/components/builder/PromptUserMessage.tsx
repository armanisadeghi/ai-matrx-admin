"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { Copy, Edit, Check, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseResourcesFromMessage, extractMessageWithoutResources, messageContainsResources } from "@/features/prompts/utils/resource-parsing";
import { ResourcesContainer } from "../resource-display/ResourceDisplay";

interface PromptUserMessageProps {
    content: string;
    messageIndex: number;
    onContentChange?: (messageIndex: number, newContent: string) => void;
    /** Compact mode: minimal styling, less padding, no left margin */
    compact?: boolean;
}

export function PromptUserMessage({ content, messageIndex, onContentChange, compact = false }: PromptUserMessageProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Parse resources from content
    const hasResources = useMemo(() => messageContainsResources(content), [content]);
    const resources = useMemo(() => hasResources ? parseResourcesFromMessage(content) : [], [content, hasResources]);
    const textContent = useMemo(() => hasResources ? extractMessageWithoutResources(content) : content, [content, hasResources]);

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

    // Adjust styling based on compact mode - keep ALL functionality
    const containerMargin = compact ? "" : "ml-12";
    const headerPadding = compact ? "px-2 py-1" : "px-3 py-2";
    const contentPadding = compact ? "px-2 pb-2" : "px-3 pb-3";
    const textSize = compact ? "text-xs" : "text-sm";

    return (
        <div className={containerMargin}>
            {/* Unified container with border and background */}
            <div className={`bg-muted border border-border ${isCollapsed && !isEditing ? 'rounded-t-lg' : 'rounded-lg'}`}>
                {/* Thin delicate header */}
                <div
                    className={`flex items-center justify-between ${headerPadding} cursor-pointer`}
                    onClick={handleHeaderClick}
                >
                    <div className="text-xs font-semibold text-muted-foreground">
                        User
                    </div>
                    <div className="flex items-center gap-1">
                        {isEditing ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSave}
                                    className="h-6 px-2 text-xs text-success hover:text-success/90"
                                >
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    Save
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancel}
                                    className="h-6 px-2 text-xs text-muted-foreground"
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
                                    className="h-6 w-6 p-0 text-muted-foreground"
                                    title="Copy"
                                >
                                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </Button>
                                {onContentChange && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleEdit}
                                        className="h-6 w-6 p-0 text-muted-foreground"
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
                <div className={`${contentPadding} relative`}>
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                ref={textareaRef}
                                value={editContent}
                                onChange={handleTextareaChange}
                                className={`w-full ${textSize} text-foreground bg-card border-none outline-none focus:outline-none focus:ring-0 resize-none overflow-hidden`}
                            />
                            {hasUnsavedChanges && (
                                <div className="text-xs text-warning">
                                    Unsaved changes
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Display resources first if any */}
                            {resources.length > 0 && (
                                <ResourcesContainer resources={resources} />
                            )}

                            {/* Display text content */}
                            {textContent.trim() && (
                                <div className="relative">
                                    <div
                                        ref={contentRef}
                                        className={`${textSize} text-foreground whitespace-pre-wrap break-words overflow-hidden transition-all duration-300 ${isCollapsed ? "max-h-24" : ""
                                            }`}
                                    >
                                        {textContent}
                                    </div>
                                    {isCollapsed && (
                                        <>
                                            {/* Gradient fade overlay */}
                                            <div
                                                className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-muted via-muted/60 to-transparent pointer-events-none"
                                            />
                                            {/* Expand chevron button */}
                                            <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={toggleCollapse}
                                                    className="h-6 w-6 p-0 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                    title="Expand message"
                                                >
                                                    <ChevronDown className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
