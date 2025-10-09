import React, { RefObject, useRef } from "react";

// Global scroll blocking system
let isScrollBlocked = false;
let blockedScrollPositions: { element: Element | Window, scrollTop: number, scrollLeft: number }[] = [];

const blockAllScrolling = () => {
    if (isScrollBlocked) return;
    
    isScrollBlocked = true;
    blockedScrollPositions = [];
    
    // Save current scroll positions
    blockedScrollPositions.push({
        element: window,
        scrollTop: window.pageYOffset || document.documentElement.scrollTop,
        scrollLeft: window.pageXOffset || document.documentElement.scrollLeft
    });
    
    // Find and save all scrollable containers
    document.querySelectorAll('*').forEach((element) => {
        const computedStyle = window.getComputedStyle(element);
        const overflowY = computedStyle.overflowY;
        const overflowX = computedStyle.overflowX;
        
        if ((overflowY === 'auto' || overflowY === 'scroll' || overflowX === 'auto' || overflowX === 'scroll') && 
            (element.scrollTop > 0 || element.scrollLeft > 0)) {
            blockedScrollPositions.push({
                element,
                scrollTop: element.scrollTop,
                scrollLeft: element.scrollLeft
            });
        }
    });
    
    // Add scroll event listeners to prevent scrolling
    const preventScroll = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Restore blocked positions
        blockedScrollPositions.forEach(({ element, scrollTop, scrollLeft }) => {
            if (element === window) {
                window.scrollTo(scrollLeft, scrollTop);
            } else {
                (element as HTMLElement).scrollTop = scrollTop;
                (element as HTMLElement).scrollLeft = scrollLeft;
            }
        });
        
        return false;
    };
    
    // Block all scroll events on all elements
    window.addEventListener('scroll', preventScroll, { passive: false, capture: true });
    document.addEventListener('scroll', preventScroll, { passive: false, capture: true });
    
    // Store the event listener for cleanup
    (window as any)._preventScrollListener = preventScroll;
};

const unblockAllScrolling = () => {
    if (!isScrollBlocked) return;
    
    isScrollBlocked = false;
    
    // Remove scroll event listeners
    const preventScroll = (window as any)._preventScrollListener;
    if (preventScroll) {
        window.removeEventListener('scroll', preventScroll, { capture: true });
        document.removeEventListener('scroll', preventScroll, { capture: true });
        delete (window as any)._preventScrollListener;
    }
    
    blockedScrollPositions = [];
};

// Utility function to find all scrollable parent containers and preserve their scroll positions
const preserveAllScrollPositions = (element: HTMLElement, callback: () => void) => {
    const scrollableParents: Array<{ element: Element | Window, scrollTop: number, scrollLeft: number }> = [];
    
    // Save window scroll position
    scrollableParents.push({
        element: window,
        scrollTop: window.pageYOffset || document.documentElement.scrollTop,
        scrollLeft: window.pageXOffset || document.documentElement.scrollLeft
    });
    
    // Find all scrollable parent elements
    let parent = element.parentElement;
    while (parent) {
        const computedStyle = window.getComputedStyle(parent);
        const overflowY = computedStyle.overflowY;
        const overflowX = computedStyle.overflowX;
        
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowX === 'auto' || overflowX === 'scroll') {
            scrollableParents.push({
                element: parent,
                scrollTop: parent.scrollTop,
                scrollLeft: parent.scrollLeft
            });
        }
        parent = parent.parentElement;
    }
    
    // Execute the callback (textarea resize)
    callback();
    
    // Restore all scroll positions using requestAnimationFrame
    const restoreScrollPositions = () => {
        scrollableParents.forEach(({ element, scrollTop, scrollLeft }) => {
            if (element === window) {
                window.scrollTo(scrollLeft, scrollTop);
            } else {
                (element as HTMLElement).scrollTop = scrollTop;
                (element as HTMLElement).scrollLeft = scrollLeft;
            }
        });
    };
    
    // Use multiple requestAnimationFrame calls to ensure restoration happens after all browser adjustments
    requestAnimationFrame(() => {
        restoreScrollPositions();
        requestAnimationFrame(() => {
            restoreScrollPositions();
            requestAnimationFrame(() => {
                restoreScrollPositions();
            });
        });
    });
};
import { Plus, X, Edit2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PromptMessage } from "@/components/prompt-builder/hooks/usePrompts";
import { HighlightedText } from "./HighlightedText";
import { PromptEditorContextMenu } from "./PromptEditorContextMenu";
import { PromptVariable } from "./PromptBuilder";

interface PromptMessagesProps {
    // Messages
    messages: PromptMessage[];
    editingMessageIndex: number | null;
    onEditingMessageIndexChange: (index: number | null) => void;
    variablePopoverOpen: number | null;
    onVariablePopoverOpenChange: (index: number | null) => void;
    onMessageRoleChange: (index: number, role: string) => void;
    onMessageContentChange: (index: number, content: string) => void;
    onClearMessage: (index: number) => void;
    onDeleteMessage: (index: number) => void;
    onInsertVariable: (messageIndex: number, variable: string) => void;
    onAddMessage: () => void;
    textareaRefs: RefObject<Record<number, HTMLTextAreaElement | null>>;
    cursorPositions: Record<number, number>;
    onCursorPositionChange: (positions: Record<number, number>) => void;
    variableDefaults: PromptVariable[];
    onOpenFullScreenEditor?: (messageIndex: number) => void;
}

export function PromptMessages({
    messages,
    editingMessageIndex,
    onEditingMessageIndexChange,
    variablePopoverOpen,
    onVariablePopoverOpenChange,
    onMessageRoleChange,
    onMessageContentChange,
    onClearMessage,
    onDeleteMessage,
    onInsertVariable,
    onAddMessage,
    textareaRefs,
    cursorPositions,
    onCursorPositionChange,
    variableDefaults,
    onOpenFullScreenEditor,
}: PromptMessagesProps) {
    // Derive variable names from variableDefaults
    const variableNames = variableDefaults.map(v => v.name);
    // Track if context menu is open to prevent blur from closing edit mode
    const contextMenuOpenRef = useRef(false);
    
    return (
        <>
            {/* Prompt Messages */}
            <div className="space-y-2">
                <Label className="text-xs text-gray-600 dark:text-gray-400">Prompt messages</Label>
                <div className="space-y-2">
                    {messages.map((message, index) => {
                        const isEditing = editingMessageIndex === index;

                        return (
                            <div
                                key={index}
                                className="group border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-2 py-1">
                                    <Select value={message.role} onValueChange={(role) => onMessageRoleChange(index, role)}>
                                        <SelectTrigger className="h-8 bg-transparent text-gray-800 dark:text-gray-200 border-none hover:bg-gray-200 dark:hover:bg-gray-700 w-auto min-w-[180px] text-xs focus-none [&>svg]:opacity-0 [&>svg]:group-hover:opacity-100 [&>svg]:transition-opacity">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">User</SelectItem>
                                            <SelectItem value="assistant">Assistant</SelectItem>
                                            <SelectItem value="system">System</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                        <Popover
                                            open={variablePopoverOpen === index}
                                            onOpenChange={(open) => {
                                                onVariablePopoverOpenChange(open ? index : null);
                                            }}
                                        >
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-300 dark:hover:text-gray-300"
                                                    onMouseDown={(e) => {
                                                        // Prevent textarea from losing focus
                                                        e.preventDefault();
                                                    }}
                                                    onClick={() => {
                                                        // Capture cursor position before opening popover
                                                        const textarea = textareaRefs.current[index];
                                                        if (textarea) {
                                                            onCursorPositionChange({
                                                                ...cursorPositions,
                                                                [index]: textarea.selectionStart,
                                                            });
                                                        }
                                                        
                                                        // Ensure message is in edit mode
                                                        if (!isEditing) {
                                                            onEditingMessageIndexChange(index);
                                                        }
                                                    }}
                                                >
                                                    <Plus className="w-3 h-3 mr-1" />
                                                    Variable
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-56 p-2" align="start">
                                                <div className="space-y-1">
                                                    {variableNames.length === 0 ? (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-2 italic">
                                                            No variables defined
                                                        </div>
                                                    ) : (
                                                        variableNames.map((variable) => (
                                                            <Button
                                                                key={variable}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-full justify-start h-8 px-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                onMouseDown={(e) => {
                                                                    // Prevent textarea from losing focus
                                                                    e.preventDefault();
                                                                }}
                                                                onClick={() => {
                                                                    onInsertVariable(index, variable);
                                                                    onVariablePopoverOpenChange(null);
                                                                }}
                                                            >
                                                                <span className="font-mono">{variable}</span>
                                                            </Button>
                                                        ))
                                                    )}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        {onOpenFullScreenEditor && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-gray-400 hover:text-blue-400"
                                                onClick={() => onOpenFullScreenEditor(index)}
                                                title="Open in full screen editor"
                                            >
                                                <Maximize2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-300"
                                            onClick={() => onEditingMessageIndexChange(isEditing ? null : index)}
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            onClick={() => onClearMessage(index)}
                                        >
                                            Clear
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-400"
                                            onClick={() => onDeleteMessage(index)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    {isEditing ? (
                                        <PromptEditorContextMenu
                                            getTextarea={() => textareaRefs.current[index]}
                                            onContentInserted={() => {
                                                // Reset context menu flag after insertion
                                                contextMenuOpenRef.current = false;
                                            }}
                                        >
                                            <textarea
                                                ref={(el) => {
                                                    textareaRefs.current[index] = el;
                                                }}
                                                value={message.content}
                                                onChange={(e) => {
                                                    onMessageContentChange(index, e.target.value);
                                                    // Block ALL scrolling during textarea resize
                                                    blockAllScrolling();
                                                    e.target.style.height = "auto";
                                                    e.target.style.height = e.target.scrollHeight + "px";
                                                    // Keep scroll blocked for a moment to prevent any delayed scrolling
                                                    setTimeout(() => {
                                                        unblockAllScrolling();
                                                    }, 100);
                                                }}
                                                onKeyDown={(e) => {
                                                    // Capture scroll position before any key action, especially for delete key
                                                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                                                    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                                                    
                                                    // Store scroll position for restoration after key processing
                                                    (e.target as any)._savedScrollTop = scrollTop;
                                                    (e.target as any)._savedScrollLeft = scrollLeft;
                                                }}
                                                onKeyUp={(e) => {
                                                    // Restore scroll position after key processing, especially important for delete key
                                                    const savedScrollTop = (e.target as any)._savedScrollTop;
                                                    const savedScrollLeft = (e.target as any)._savedScrollLeft;
                                                    
                                                    if (savedScrollTop !== undefined && savedScrollLeft !== undefined) {
                                                        // Use comprehensive scroll restoration for all parent containers
                                                        preserveAllScrollPositions(e.target as HTMLElement, () => {
                                                            // No resize needed here, just ensuring scroll positions are maintained
                                                        });
                                                    }
                                                }}
                                                onSelect={(e) => {
                                                    // Track cursor position
                                                    const target = e.target as HTMLTextAreaElement;
                                                    onCursorPositionChange({
                                                        ...cursorPositions,
                                                        [index]: target.selectionStart,
                                                    });
                                                }}
                                                onContextMenu={() => {
                                                    // Mark that context menu is being opened
                                                    contextMenuOpenRef.current = true;
                                                }}
                                                onFocus={(e) => {
                                                    // Block ALL scrolling during focus and initial resize
                                                    blockAllScrolling();
                                                    e.target.style.height = "auto";
                                                    e.target.style.height = e.target.scrollHeight + "px";
                                                    
                                                    // Move cursor to end
                                                    const length = e.target.value.length;
                                                    e.target.setSelectionRange(length, length);
                                                    
                                                    // Track cursor position
                                                    onCursorPositionChange({
                                                        ...cursorPositions,
                                                        [index]: length,
                                                    });
                                                    
                                                    // Keep scroll blocked for a moment to prevent focus-related scrolling
                                                    setTimeout(() => {
                                                        unblockAllScrolling();
                                                    }, 200);
                                                }}
                                                placeholder={message.role === "assistant" ? "Enter assistant message..." : "Message content..."}
                                                className="w-full bg-gray-50 dark:bg-gray-800 border-none outline-none text-xs text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-0 resize-none overflow-hidden leading-normal"
                                                autoFocus
                                                onBlur={() => {
                                                    // Ensure scroll blocking is disabled when leaving textarea
                                                    unblockAllScrolling();
                                                    
                                                    // Don't close edit mode if context menu is open
                                                    if (!contextMenuOpenRef.current) {
                                                        onEditingMessageIndexChange(null);
                                                    }
                                                    // Reset the flag after a short delay (in case menu was opened)
                                                    setTimeout(() => {
                                                        contextMenuOpenRef.current = false;
                                                    }, 100);
                                                }}
                                                style={{
                                                    minHeight: "80px",
                                                    lineHeight: "1.5",
                                                }}
                                            />
                                        </PromptEditorContextMenu>
                                    ) : (
                                        <div
                                            className="text-xs pb-2 text-gray-900 dark:text-gray-200 whitespace-pre-wrap cursor-text min-h-[80px] leading-normal"
                                            onClick={() => onEditingMessageIndexChange(index)}
                                            style={{
                                                lineHeight: "1.5",
                                            }}
                                        >
                                            {message.content ? (
                                                <HighlightedText text={message.content} validVariables={variableNames} />
                                            ) : (
                                                <span className="text-gray-500 dark:text-gray-500 italic">
                                                    {message.role === "assistant" ? "Enter assistant message..." : "Enter message..."}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}