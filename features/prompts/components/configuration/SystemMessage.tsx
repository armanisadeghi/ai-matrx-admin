import React, { RefObject, useRef, useEffect } from "react";

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
import { Maximize2, Plus, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PromptEditorContextMenu } from "../PromptEditorContextMenu";
import { HighlightedText } from "../HighlightedText";
import { PromptVariable } from "../PromptBuilder";

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
    
    // Check if variable insertion is enabled
    const hasVariableSupport = variableDefaults.length > 0 && onInsertVariable && onVariablePopoverOpenChange && textareaRefs && onCursorPositionChange;
    
    // Derive variable names from variableDefaults
    const variableNames = variableDefaults.map(v => v.name);
    
    return (
        <div className="space-y-3">
            <div className="group border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                {/* Header */}
                <div className="flex items-center justify-between px-2 py-1">
                    <Label className="text-xs text-gray-600 dark:text-gray-400">System</Label>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                        {hasVariableSupport && (
                            <Popover
                                open={variablePopoverOpen}
                                onOpenChange={onVariablePopoverOpenChange}
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
                                            const textarea = textareaRefs?.current[systemMessageIndex];
                                            if (textarea && onCursorPositionChange) {
                                                onCursorPositionChange({
                                                    ...cursorPositions,
                                                    [systemMessageIndex]: textarea.selectionStart,
                                                });
                                            }
                                            
                                            // Ensure message is in edit mode
                                            if (!isEditing && onIsEditingChange) {
                                                onIsEditingChange(true);
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
                                                        if (onInsertVariable && onVariablePopoverOpenChange) {
                                                            onInsertVariable(variable);
                                                            onVariablePopoverOpenChange(false);
                                                        }
                                                    }}
                                                >
                                                    <span className="font-mono">{variable}</span>
                                                </Button>
                                            ))
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                        {onOpenFullScreenEditor && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-400 hover:text-blue-400"
                                onClick={onOpenFullScreenEditor}
                                title="Open in full screen editor"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </Button>
                        )}
                        {onIsEditingChange && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-300"
                                onClick={() => onIsEditingChange(!isEditing)}
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            onClick={onDeveloperMessageClear}
                        >
                            Clear
                        </Button>
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
                                }}
                                value={developerMessage}
                                onChange={(e) => {
                                    onDeveloperMessageChange(e.target.value);
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
                                    // Block ALL scrolling during focus and initial resize
                                    blockAllScrolling();
                                    e.target.style.height = "auto";
                                    e.target.style.height = e.target.scrollHeight + "px";
                                    
                                    // Move cursor to end
                                    const length = e.target.value.length;
                                    e.target.setSelectionRange(length, length);
                                    
                                    // Track cursor position
                                    if (onCursorPositionChange) {
                                        onCursorPositionChange({
                                            ...cursorPositions,
                                            [systemMessageIndex]: length,
                                        });
                                    }
                                    
                                    // Keep scroll blocked for a moment to prevent focus-related scrolling
                                    setTimeout(() => {
                                        unblockAllScrolling();
                                    }, 200);
                                }}
                                onBlur={() => {
                                    // Ensure scroll blocking is disabled when leaving textarea
                                    unblockAllScrolling();
                                    
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
                                autoFocus
                                style={{
                                    minHeight: "240px",
                                    lineHeight: "1.5",
                                }}
                            />
                        </PromptEditorContextMenu>
                    ) : (
                        <div
                            className="text-xs pb-2 text-gray-900 dark:text-gray-200 whitespace-pre-wrap cursor-text leading-normal"
                            onClick={() => onIsEditingChange && onIsEditingChange(true)}
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
        </div>
    );
}

