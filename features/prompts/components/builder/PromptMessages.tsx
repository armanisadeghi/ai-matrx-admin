import React, { RefObject, useRef } from "react";
import { Braces, X, Edit2, Maximize2, Eraser, FileText, Eye } from "lucide-react";
import { VariableSelector } from "../VariableSelector";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PromptMessage } from "@/features/prompts/types/core";
import { HighlightedText } from "../HighlightedText";
import { PromptEditorContextMenu } from "../PromptEditorContextMenu";
import { PromptVariable } from "@/features/prompts/types/core";
import { TemplateSelector } from "@/features/content-templates/components/TemplateSelector";
import { MessageRole } from "@/features/content-templates/types/content-templates-db";
import { ResponsiveIconButtonGroup } from "@/components/official/ResponsiveIconButtonGroup";

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
    scrollContainerRef?: RefObject<HTMLDivElement>;
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
    scrollContainerRef,
}: PromptMessagesProps) {
    // Derive variable names from variableDefaults
    const variableNames = variableDefaults.map(v => v.name);
    // Track if context menu is open to prevent blur from closing edit mode
    const contextMenuOpenRef = useRef(false);
    
    return (
        <>
            {/* Prompt Messages */}
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Prompt messages</Label>
                <div className="space-y-2">
                    {messages.map((message, index) => {
                        const isEditing = editingMessageIndex === index;

                        return (
                            <div
                                key={index}
                                className="group border border-border rounded-lg bg-muted"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-2 py-1">
                                    <Select value={message.role} onValueChange={(role) => onMessageRoleChange(index, role)}>
                                        <SelectTrigger className="h-8 bg-transparent text-foreground border-none hover:bg-accent w-auto min-w-[180px] text-xs focus-none [&>svg]:opacity-0 [&>svg]:group-hover:opacity-100 [&>svg]:transition-opacity">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">User</SelectItem>
                                            <SelectItem value="assistant">Assistant</SelectItem>
                                            <SelectItem value="system">System</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                        <ResponsiveIconButtonGroup
                                            buttons={[
                                                {
                                                    id: 'variable',
                                                    icon: Braces,
                                                    tooltip: 'Insert Variable',
                                                    mobileLabel: 'Insert Variable',
                                                    render: () => (
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
                                                                            onInsertVariable(index, variable);
                                                                        }}
                                                                        onBeforeOpen={() => {
                                                                            const textarea = textareaRefs.current[index];
                                                                            if (textarea) {
                                                                                onCursorPositionChange({
                                                                                    ...cursorPositions,
                                                                                    [index]: textarea.selectionStart,
                                                                                });
                                                                            }
                                                                            if (!isEditing) {
                                                                                onEditingMessageIndexChange(index);
                                                                            }
                                                                        }}
                                                                    />
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="z-[9999]">
                                                                Insert Variable
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    ),
                                                },
                                                {
                                                    id: 'template',
                                                    icon: FileText,
                                                    tooltip: 'Templates',
                                                    mobileLabel: 'Templates',
                                                    render: (isMobile) => {
                                                        return (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span>
                                                                        <TemplateSelector
                                                                            role={message.role as MessageRole}
                                                                            currentContent={message.content}
                                                                            onTemplateSelected={(content) => onMessageContentChange(index, content)}
                                                                            onSaveTemplate={() => {}}
                                                                            messageIndex={index}
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
                                                    id: 'fullscreen',
                                                    icon: Maximize2,
                                                    tooltip: 'Open in full screen editor',
                                                    mobileLabel: 'Full Screen Editor',
                                                    onClick: (e) => {
                                                        e?.stopPropagation();
                                                        onOpenFullScreenEditor?.(index);
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
                                                        onEditingMessageIndexChange(isEditing ? null : index);
                                                    },
                                                    onMouseDown: (e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    },
                                                },
                                                {
                                                    id: 'clear',
                                                    icon: Eraser,
                                                    tooltip: 'Clear message',
                                                    mobileLabel: 'Clear Message',
                                                    onClick: (e) => {
                                                        e?.stopPropagation();
                                                        onClearMessage(index);
                                                    },
                                                    onMouseDown: (e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    },
                                                },
                                                {
                                                    id: 'delete',
                                                    icon: X,
                                                    tooltip: 'Delete message',
                                                    mobileLabel: 'Delete Message',
                                                    onClick: (e) => {
                                                        e?.stopPropagation();
                                                        onDeleteMessage(index);
                                                    },
                                                    onMouseDown: (e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    },
                                                    iconClassName: 'text-destructive',
                                                    className: 'hover:text-destructive',
                                                },
                                            ]}
                                            sheetTitle={`${message.role} Message Actions`}
                                            size="sm"
                                        />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="px-2 pb-2">
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
                                                    // ⚠️ CRITICAL: preventScroll is required - see ../SCROLL_FIX.md
                                                    if (el) {
                                                        // Set correct height BEFORE focusing to prevent glitch
                                                        el.style.height = "auto";
                                                        el.style.height = el.scrollHeight + "px";
                                                        
                                                        // Focus immediately with preventScroll (no setTimeout needed)
                                                        el.focus({ preventScroll: true });
                                                    }
                                                }}
                                                value={message.content}
                                                onChange={(e) => {
                                                    onMessageContentChange(index, e.target.value);
                                                    
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
                                                onKeyDown={(e) => {
                                                    // ⚠️ CRITICAL: Lock scroll on keyboard input to prevent browser auto-scroll
                                                    if (scrollContainerRef?.current) {
                                                        const savedScroll = scrollContainerRef.current.scrollTop;
                                                        // Use multiple RAF to catch any delayed scroll attempts
                                                        requestAnimationFrame(() => {
                                                            requestAnimationFrame(() => {
                                                                if (scrollContainerRef.current) {
                                                                    scrollContainerRef.current.scrollTop = savedScroll;
                                                                }
                                                            });
                                                        });
                                                    }
                                                }}
                                                onInput={(e) => {
                                                    // ⚠️ CRITICAL: Lock scroll during input events (fires before onChange)
                                                    if (scrollContainerRef?.current) {
                                                        const savedScroll = scrollContainerRef.current.scrollTop;
                                                        requestAnimationFrame(() => {
                                                            if (scrollContainerRef.current) {
                                                                scrollContainerRef.current.scrollTop = savedScroll;
                                                            }
                                                        });
                                                    }
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
                                                    // Note: Auto-resize handled in ref callback to prevent glitch
                                                    // Note: Cursor position set by click handler (see SCROLL_FIX.md)
                                                    // Only track the current cursor position on focus
                                                    onCursorPositionChange({
                                                        ...cursorPositions,
                                                        [index]: e.target.selectionStart,
                                                    });
                                                }}
                                                placeholder={message.role === "assistant" ? "Enter assistant message..." : "Message content..."}
                                                className="w-full bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground p-0 resize-none overflow-hidden leading-normal"
                                                onBlur={() => {
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
                                            className="text-xs text-muted-foreground whitespace-pre-wrap cursor-text min-h-[80px] leading-normal"
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
                                                
                                                onEditingMessageIndexChange(index);
                                                
                                                // CRITICAL: Single requestAnimationFrame waits for React to render textarea
                                                requestAnimationFrame(() => {
                                                    scrollContainer.scrollTop = savedScrollPosition;
                                                    
                                                    // Set cursor position in the textarea
                                                    const textarea = textareaRefs.current[index];
                                                    if (textarea && clickPosition > 0) {
                                                        textarea.setSelectionRange(clickPosition, clickPosition);
                                                    }
                                                });
                                            }}
                                            style={{
                                                lineHeight: "1.5",
                                            }}
                                        >
                                            {message.content ? (
                                                <HighlightedText text={message.content} validVariables={variableNames} />
                                            ) : (
                                                <span className="text-muted-foreground italic">
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