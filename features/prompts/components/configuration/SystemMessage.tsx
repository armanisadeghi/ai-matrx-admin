import React, { RefObject, useRef, useEffect, useState } from "react";
import { Maximize2, Braces, Edit2, Wand2, Eraser, FileText } from "lucide-react";
import { VariableSelector } from "../VariableSelector";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
                    <TemplateSelector
                        role="system"
                        currentContent={developerMessage}
                        onTemplateSelected={(content) => onDeveloperMessageChange(content)}
                        onSaveTemplate={() => {}}
                        messageIndex={systemMessageIndex}
                    />
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
            icon: Edit2,
            tooltip: isEditing ? 'Stop editing' : 'Edit',
            mobileLabel: isEditing ? 'Stop Editing' : 'Edit',
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
            <div className="group border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
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
                                        
                                        setTimeout(() => {
                                            el.focus({ preventScroll: true });
                                        }, 0);
                                    }
                                }}
                                value={developerMessage}
                                onChange={(e) => {
                                    onDeveloperMessageChange(e.target.value);
                                    // Auto-resize textarea
                                    e.target.style.height = "auto";
                                    e.target.style.height = e.target.scrollHeight + "px";
                                }}
                                onSelect={(e) => {
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
                                
                                const scrollContainer = document.querySelector('.scrollbar-thin') as HTMLElement;
                                const savedScrollPosition = scrollContainer?.scrollTop || 0;
                                
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
                                
                                // CRITICAL: Double requestAnimationFrame waits for React to render textarea
                                requestAnimationFrame(() => {
                                    requestAnimationFrame(() => {
                                        if (scrollContainer) {
                                            scrollContainer.scrollTop = savedScrollPosition;
                                        }
                                        
                                        // Set cursor position in the textarea
                                        const textarea = textareaRefs?.current?.[systemMessageIndex];
                                        if (textarea && clickPosition > 0) {
                                            textarea.setSelectionRange(clickPosition, clickPosition);
                                        }
                                    });
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

