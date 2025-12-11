import React, { RefObject, useRef, useState } from "react";
import { Maximize2, Braces, Edit2, Wand2, Eraser, FileText, Eye } from "lucide-react";
import { VariableSelector } from "../VariableSelector";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PromptEditorContextMenu } from "../PromptEditorContextMenu";
import { HighlightedText } from "../HighlightedText";
import { PromptVariable } from "@/features/prompts/types/core";
import { SystemPromptOptimizer } from "@/features/prompts/components/actions/prompt-optimizers/SystemPromptOptimizer";
import { TemplateSelector } from "../../../content-templates/components/TemplateSelector";
import { ResponsiveIconButtonGroup, IconButtonConfig } from "@/components/official/ResponsiveIconButtonGroup";

interface SystemMessageProps {
    developerMessage: string;
    onDeveloperMessageChange: (value: string) => void;
    onDeveloperMessageClear: () => void;
    variableDefaults?: PromptVariable[];
    variablePopoverOpen?: boolean;
    onVariablePopoverOpenChange?: (open: boolean) => void;
    onInsertVariable?: (variable: string) => void;
    textareaRefs?: RefObject<Record<number, HTMLTextAreaElement | null>>;
    cursorPositions?: Record<number, number>;
    onCursorPositionChange?: (positions: Record<number, number>) => void;
    onOpenFullScreenEditor?: () => void;
    isEditing?: boolean;
    onIsEditingChange?: (isEditing: boolean) => void;
    scrollContainerRef?: RefObject<HTMLDivElement>;
}

export function SystemMessage({
    developerMessage,
    onDeveloperMessageChange,
    onDeveloperMessageClear,
    variableDefaults = [],
    variablePopoverOpen = false,
    onVariablePopoverOpenChange,
    onInsertVariable,
    textareaRefs,
    cursorPositions = {},
    onCursorPositionChange,
    onOpenFullScreenEditor,
    isEditing = false,
    onIsEditingChange,
    scrollContainerRef,
}: SystemMessageProps) {
    // System message uses index -1 in textareaRefs
    const systemMessageIndex = -1;
    
    // Track if context menu is open to prevent blur from closing edit mode
    const contextMenuOpenRef = useRef(false);
    
    // Optimizer state
    const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
    
    // Check if variable insertion is enabled
    const hasVariableSupport = variableDefaults.length > 0 && onInsertVariable && onVariablePopoverOpenChange && textareaRefs && onCursorPositionChange;
    
    // Derive variable names from variableDefaults
    const variableNames = variableDefaults.map(v => v.name);
    
    const handleOptimizedAccept = (optimizedText: string) => {
        onDeveloperMessageChange(optimizedText);
    };

    // Configure buttons for ResponsiveIconButtonGroup
    const buttons: IconButtonConfig[] = [
        {
            id: 'variable',
            icon: Braces,
            tooltip: 'Insert Variable',
            mobileLabel: 'Insert Variable',
            hidden: !hasVariableSupport,
            render: () => {
                if (!hasVariableSupport) return null;
                
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span 
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            >
                                <VariableSelector
                                    variables={variableNames}
                                    onVariableSelected={(variable) => {
                                        if (onInsertVariable) {
                                            onInsertVariable(variable);
                                        }
                                    }}
                                    onBeforeOpen={() => {
                                        const textarea = textareaRefs?.current[systemMessageIndex];
                                        if (textarea && onCursorPositionChange) {
                                            onCursorPositionChange({
                                                ...cursorPositions,
                                                [systemMessageIndex]: textarea.selectionStart,
                                            });
                                        }
                                        if (!isEditing && onIsEditingChange) {
                                            onIsEditingChange(true);
                                        }
                                    }}
                                />
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="z-[9999]">
                            Insert Variable
                        </TooltipContent>
                    </Tooltip>
                );
            },
        },
        {
            id: 'template',
            icon: FileText,
            tooltip: 'Templates',
            mobileLabel: 'Templates',
            render: (isMobile) => {
                // On desktop, use icon-only version; on mobile, show in menu
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span>
                                <TemplateSelector
                                    role="system"
                                    currentContent={developerMessage}
                                    onTemplateSelected={(content) => onDeveloperMessageChange(content)}
                                    onSaveTemplate={() => {}}
                                    messageIndex={systemMessageIndex}
                                />
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="z-[9999]">
                            Templates
                        </TooltipContent>
                    </Tooltip>
                );
            },
        },
        {
            id: 'optimize',
            icon: Wand2,
            tooltip: 'Optimize with AI',
            mobileLabel: 'Optimize with AI',
            onClick: (e) => {
                e?.stopPropagation();
                setIsOptimizerOpen(true);
            },
            onMouseDown: (e) => {
                e.preventDefault();
                e.stopPropagation();
            },
            iconClassName: 'text-purple-400',
            className: 'hover:text-purple-300',
        },
        {
            id: 'fullscreen',
            icon: Maximize2,
            tooltip: 'Open in full screen editor',
            mobileLabel: 'Full Screen Editor',
            onClick: (e) => {
                e?.stopPropagation();
                onOpenFullScreenEditor?.();
            },
            onMouseDown: (e) => {
                e.preventDefault();
                e.stopPropagation();
            },
            hidden: !onOpenFullScreenEditor,
        },
        {
            id: 'edit',
            icon: isEditing ? Eye : Edit2,
            tooltip: isEditing ? 'View' : 'Edit',
            mobileLabel: isEditing ? 'View' : 'Edit',
            onClick: (e) => {
                e?.stopPropagation();
                onIsEditingChange?.(!isEditing);
            },
            onMouseDown: (e) => {
                e.preventDefault();
                e.stopPropagation();
            },
            hidden: !onIsEditingChange,
        },
        {
            id: 'clear',
            icon: Eraser,
            tooltip: 'Clear message',
            mobileLabel: 'Clear Message',
            onClick: (e) => {
                e?.stopPropagation();
                onDeveloperMessageClear();
            },
            onMouseDown: (e) => {
                e.preventDefault();
                e.stopPropagation();
            },
        },
    ];
    
    return (
        <div className="space-y-3">
            <div className="group border-border rounded-lg bg-gray-50 dark:bg-gray-800">
                {/* Header */}
                <div className="flex items-center justify-between px-2 py-1">
                    <Label className="text-xs text-gray-600 dark:text-gray-400">System</Label>
                    <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                        <ResponsiveIconButtonGroup
                            buttons={buttons}
                            sheetTitle="System Message Actions"
                            size="sm"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    {isEditing ? (
                        <PromptEditorContextMenu 
                            getTextarea={() => textareaRefs?.current[systemMessageIndex] || null}
                            onContentInserted={() => {
                                // Reset context menu flag after insertion
                                contextMenuOpenRef.current = false;
                            }}
                        >
                            <textarea
                                ref={(el) => {
                                    if (textareaRefs?.current) {
                                        textareaRefs.current[systemMessageIndex] = el;
                                    }
                                    // ⚠️ CRITICAL: preventScroll is required - see ../SCROLL_FIX.md
                                    if (el) {
                                        // Set correct height BEFORE focusing to prevent glitch
                                        el.style.height = "auto";
                                        el.style.height = el.scrollHeight + "px";
                                        
                                        // Focus immediately with preventScroll (no setTimeout needed)
                                        el.focus({ preventScroll: true });
                                    }
                                }}
                                value={developerMessage}
                                onChange={(e) => {
                                    onDeveloperMessageChange(e.target.value);
                                    
                                    if (!scrollContainerRef?.current) {
                                        // Fallback if no scroll container ref
                                        e.target.style.height = "auto";
                                        e.target.style.height = e.target.scrollHeight + "px";
                                        return;
                                    }
                                    
                                    // ⚠️ CRITICAL: Temporarily disable scroll to prevent browser auto-scroll
                                    const scrollContainer = scrollContainerRef.current;
                                    const savedScroll = scrollContainer.scrollTop;
                                    const savedOverflow = scrollContainer.style.overflow;
                                    
                                    // Lock scroll by hiding overflow temporarily
                                    scrollContainer.style.overflow = "hidden";
                                    
                                    // Auto-resize textarea
                                    e.target.style.height = "auto";
                                    e.target.style.height = e.target.scrollHeight + "px";
                                    
                                    // Restore scroll position and overflow immediately
                                    scrollContainer.scrollTop = savedScroll;
                                    scrollContainer.style.overflow = savedOverflow;
                                }}
                                onMouseDown={(e) => {
                                    // ⚠️ CRITICAL: Prevent scroll BEFORE focus event
                                    // Save scroll position before any potential scroll
                                    if (scrollContainerRef?.current) {
                                        const savedScroll = scrollContainerRef.current.scrollTop;
                                        // Restore after any browser scroll attempts
                                        requestAnimationFrame(() => {
                                            if (scrollContainerRef.current) {
                                                scrollContainerRef.current.scrollTop = savedScroll;
                                            }
                                        });
                                    }
                                }}
                                onSelect={(e) => {
                                    // ⚠️ CRITICAL: Lock scroll position during cursor movement
                                    if (scrollContainerRef?.current) {
                                        const savedScroll = scrollContainerRef.current.scrollTop;
                                        requestAnimationFrame(() => {
                                            if (scrollContainerRef.current) {
                                                scrollContainerRef.current.scrollTop = savedScroll;
                                            }
                                        });
                                    }
                                    
                                    // Track cursor position
                                    if (onCursorPositionChange) {
                                        const target = e.target as HTMLTextAreaElement;
                                        onCursorPositionChange({
                                            ...cursorPositions,
                                            [systemMessageIndex]: target.selectionStart,
                                        });
                                    }
                                }}
                                onContextMenu={() => {
                                    // Mark that context menu is being opened
                                    contextMenuOpenRef.current = true;
                                }}
                                onFocus={(e) => {
                                    // Note: Auto-resize handled in ref callback to prevent glitch
                                    // Note: Cursor position set by click handler (see SCROLL_FIX.md)
                                    // Only track the current cursor position on focus
                                    if (onCursorPositionChange) {
                                        onCursorPositionChange({
                                            ...cursorPositions,
                                            [systemMessageIndex]: e.target.selectionStart,
                                        });
                                    }
                                }}
                                onBlur={() => {
                                    // Don't close edit mode if context menu is open
                                    if (!contextMenuOpenRef.current && onIsEditingChange) {
                                        onIsEditingChange(false);
                                    }
                                    // Reset the flag after a short delay (in case menu was opened)
                                    setTimeout(() => {
                                        contextMenuOpenRef.current = false;
                                    }, 100);
                                }}
                                placeholder="You're a very helpful assistant"
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none outline-none text-xs text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-0 resize-none overflow-hidden leading-normal"
                                style={{
                                    minHeight: "240px",
                                    lineHeight: "1.5",
                                }}
                            />
                        </PromptEditorContextMenu>
                    ) : (
                        <div
                            className="text-xs pb-2 text-gray-600 dark:text-gray-400 whitespace-pre-wrap cursor-text leading-normal"
                            onClick={(e) => {
                                // ⚠️ CRITICAL: DO NOT MODIFY THIS CLICK HANDLER WITHOUT READING ../SCROLL_FIX.md
                                // This prevents browser auto-scroll when transitioning to edit mode.
                                // Removing or modifying will break scroll position preservation.
                                
                                if (!scrollContainerRef?.current) return;
                                
                                const scrollContainer = scrollContainerRef.current;
                                const savedScrollPosition = scrollContainer.scrollTop;
                                
                                // Calculate approximate cursor position from click
                                const target = e.target as HTMLElement;
                                const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
                                let clickPosition = 0;
                                
                                if (range) {
                                    // Get text content up to the click point
                                    const preCaretRange = range.cloneRange();
                                    preCaretRange.selectNodeContents(target);
                                    preCaretRange.setEnd(range.endContainer, range.endOffset);
                                    clickPosition = preCaretRange.toString().length;
                                }
                                
                                onIsEditingChange && onIsEditingChange(true);
                                
                                // CRITICAL: Single requestAnimationFrame waits for React to render textarea
                                requestAnimationFrame(() => {
                                    scrollContainer.scrollTop = savedScrollPosition;
                                    
                                    // Set cursor position in the textarea
                                    const textarea = textareaRefs?.current?.[systemMessageIndex];
                                    if (textarea && clickPosition > 0) {
                                        textarea.setSelectionRange(clickPosition, clickPosition);
                                    }
                                });
                            }}
                            style={{
                                minHeight: "240px",
                                lineHeight: "1.5",
                            }}
                        >
                            {developerMessage ? (
                                <HighlightedText text={developerMessage} validVariables={variableNames} />
                            ) : (
                                <span className="text-gray-500 dark:text-gray-500 italic">
                                    You're a very helpful assistant
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* System Prompt Optimizer Dialog */}
            <SystemPromptOptimizer
                isOpen={isOptimizerOpen}
                onClose={() => setIsOptimizerOpen(false)}
                currentSystemMessage={developerMessage}
                onAccept={handleOptimizedAccept}
            />
        </div>
    );
}

