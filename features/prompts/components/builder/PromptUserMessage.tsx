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
    const [shouldBeCollapsible, setShouldBeCollapsible] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const previousContentRef = useRef<string>("");

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

    // Determine if content is long enough to be collapsible
    // ~96px (max-h-24) is roughly 3 lines of text
    useEffect(() => {
        if (measureRef.current && !isEditing) {
            const COLLAPSE_THRESHOLD = 48; // 12 * 4px = 48px (max-h-12)
            const contentHeight = measureRef.current.scrollHeight;
            const isContentLongEnough = contentHeight > COLLAPSE_THRESHOLD;
            const contentChanged = previousContentRef.current !== textContent;

            setShouldBeCollapsible(isContentLongEnough);

            // If content changed, reset collapse state
            if (contentChanged) {
                if (isContentLongEnough) {
                    // Long content: start collapsed
                    setIsCollapsed(true);
                } else {
                    // Short content: keep expanded
                    setIsCollapsed(false);
                }
                previousContentRef.current = textContent;
            }
        }
    }, [textContent, isEditing]);

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
        if (!isEditing && shouldBeCollapsible) {
            setIsCollapsed(!isCollapsed);
        }
    };

    const handleHeaderClick = () => {
        if (!isEditing && shouldBeCollapsible) {
            toggleCollapse();
        }
    };

    // Adjust styling based on compact mode - keep ALL functionality
    const containerMargin = compact ? "" : "ml-12";
    const textSize = compact ? "text-xs" : "text-xs";

    return (
        <div className={containerMargin}>
            {/* Unified container with border and background */}
            <div className={`bg-muted border border-border rounded-lg`}>
                {/* Thin delicate header */}
                <div
                    className={`flex items-center justify-end px-2 pt-1 pb-0 cursor-pointer rounded-lg`}
                    onClick={handleHeaderClick}
                >
                    <div className="flex items-center gap-1">
                        {isEditing ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSave}
                                    className="h-5 px-2 text-xs text-success hover:text-success/90"
                                >
                                    <Check className="w-3.0 h-3.0 mr-1" />
                                    Save
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancel}
                                    className="h-5 px-2 text-xs text-muted-foreground"
                                >
                                    <X className="w-3.0 h-3.0 mr-1" />
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
                <div className={`px-2 pb-2 relative`}>
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                ref={textareaRef}
                                value={editContent}
                                onChange={handleTextareaChange}
                                className={`w-full ${textSize} text-foreground bg-muted border-none outline-none focus:outline-none focus:ring-0 resize-none overflow-hidden`}
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
                                        ref={measureRef}
                                        className={`${textSize} text-foreground whitespace-pre-wrap break-words overflow-hidden transition-all duration-300 ${shouldBeCollapsible && isCollapsed ? "max-h-12" : ""
                                            }`}
                                    >
                                        {textContent}
                                    </div>
                                    {shouldBeCollapsible && isCollapsed && (
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