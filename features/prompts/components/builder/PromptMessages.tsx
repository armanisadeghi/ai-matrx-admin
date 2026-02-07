import React, { RefObject, useRef, useLayoutEffect } from "react";
import { Braces, X, Edit2, Maximize2, Eraser, FileText, Eye } from "lucide-react";
import { VariableSelector } from "../VariableSelector";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PromptMessage, PromptSettings } from "@/features/prompts/types/core";
import { HighlightedText } from "../HighlightedText";
import { UnifiedContextMenu } from "@/features/context-menu";
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
    // Context data for UnifiedContextMenu
    systemMessage?: string;
    modelConfig?: PromptSettings;
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
    systemMessage = "",
    modelConfig,
}: PromptMessagesProps) {
    // Derive variable names from variableDefaults
    const variableNames = variableDefaults.map(v => v.name);
    // Track if context menu is open to prevent blur from closing edit mode
    const contextMenuOpenRef = useRef(false);
    
    // ⚠️ SCROLL FIX: Track which message textareas have been initialized (mounted).
    // IMPORTANT: Do NOT clear this in the ref callback's else branch. Inline ref callbacks
    // create new function references on every render, so React calls old ref with null then
    // new ref with element. Clearing on null would reset the flag on EVERY render, causing
    // height="auto" + focus to re-run without scroll protection. Instead, clear via useEffect
    // when editing state changes.
    const initializedTextareasRef = useRef(new Set<number>());
    
    // ⚠️ SCROLL FIX: Bridge scroll position from event handlers to useLayoutEffect.
    // See SystemMessage.tsx for detailed explanation.
    const scrollLockRef = useRef<{ scrollTop: number; overflow: string } | null>(null);
    
    // Clear initialization tracking when editing stops, so the textarea
    // re-initializes properly when editing resumes.
    useLayoutEffect(() => {
        if (editingMessageIndex === null) {
            initializedTextareasRef.current.clear();
        }
    }, [editingMessageIndex]);
    
    // ⚠️ SCROLL FIX: Restore scroll position and overflow AFTER React re-renders.
    useLayoutEffect(() => {
        if (editingMessageIndex === null) return;
        const textarea = textareaRefs.current[editingMessageIndex];
        const scrollContainer = scrollContainerRef?.current;
        if (!textarea || !scrollContainer) return;
        
        const lockData = scrollLockRef.current;
        const savedScroll = lockData?.scrollTop ?? scrollContainer.scrollTop;
        const originalOverflow = lockData?.overflow ?? scrollContainer.style.overflow;
        
        scrollContainer.style.overflow = "hidden";
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
        scrollContainer.scrollTop = savedScroll;
        scrollContainer.style.overflow = originalOverflow;
        
        scrollLockRef.current = null;
    }, [messages, editingMessageIndex, scrollContainerRef, textareaRefs]);
    
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
                                        <SelectTrigger className="h-6 bg-transparent text-foreground !border-none hover:bg-accent w-auto min-w-[180px] text-xs !shadow-none focus:ring-0 focus:ring-offset-0 [&>svg]:opacity-0 [&>svg]:group-hover:opacity-100 [&>svg]:transition-opacity">
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
                                        <UnifiedContextMenu
                                            getTextarea={() => textareaRefs.current[index]}
                                            contextData={{
                                                content: message.content,
                                                context: JSON.stringify({
                                                    messages,
                                                    systemMessage,
                                                    variableDefaults,
                                                    settings: modelConfig,
                                                }),
                                                currentMessageRole: message.role,
                                                allMessages: JSON.stringify(messages),
                                                systemMessage: systemMessage,
                                                promptVariables: JSON.stringify(variableDefaults),
                                            }}
                                            enabledPlacements={['ai-action', 'content-block', 'quick-action']}
                                            isEditable={true}
                                            enableFloatingIcon={true}
                                            onTextReplace={(newText) => {
                                                const textarea = textareaRefs.current[index];
                                                if (textarea) {
                                                    const start = textarea.selectionStart;
                                                    const end = textarea.selectionEnd;
                                                    const before = message.content.substring(0, start);
                                                    const after = message.content.substring(end);
                                                    onMessageContentChange(index, before + newText + after);
                                                    
                                                    setTimeout(() => {
                                                        textarea.focus();
                                                        textarea.setSelectionRange(start, start + newText.length);
                                                    }, 0);
                                                }
                                            }}
                                            onTextInsertBefore={(text) => {
                                                const textarea = textareaRefs.current[index];
                                                if (textarea) {
                                                    const start = textarea.selectionStart;
                                                    const before = message.content.substring(0, start);
                                                    const after = message.content.substring(start);
                                                    const insertText = text + '\n\n';
                                                    onMessageContentChange(index, before + insertText + after);
                                                    
                                                    setTimeout(() => {
                                                        textarea.focus();
                                                        textarea.setSelectionRange(start + insertText.length, start + insertText.length);
                                                    }, 0);
                                                }
                                            }}
                                            onTextInsertAfter={(text) => {
                                                const textarea = textareaRefs.current[index];
                                                if (textarea) {
                                                    const end = textarea.selectionEnd;
                                                    const before = message.content.substring(0, end);
                                                    const after = message.content.substring(end);
                                                    const insertText = '\n\n' + text;
                                                    onMessageContentChange(index, before + insertText + after);
                                                    
                                                    setTimeout(() => {
                                                        textarea.focus();
                                                        textarea.setSelectionRange(end + insertText.length, end + insertText.length);
                                                    }, 0);
                                                }
                                            }}
                                            onContentInserted={() => {
                                                // Reset context menu flag after insertion
                                                contextMenuOpenRef.current = false;
                                            }}
                                        >
                                            <textarea
                                                ref={(el) => {
                                                    textareaRefs.current[index] = el;
                                                    if (el) {
                                                        // ⚠️ SCROLL FIX: Only run initialization on FIRST mount.
                                                        // Height updates during typing handled by useLayoutEffect.
                                                        // DO NOT add an else branch to clear initializedTextareasRef here!
                                                        // Inline ref callbacks create new function refs on every render,
                                                        // so React calls old ref(null) then new ref(el) on each re-render.
                                                        // An else branch would clear the flag on every render, causing
                                                        // height="auto" + focus to re-run without scroll protection.
                                                        // Cleanup is handled by the useLayoutEffect on editingMessageIndex.
                                                        if (!initializedTextareasRef.current.has(index)) {
                                                            initializedTextareasRef.current.add(index);
                                                            el.style.height = "auto";
                                                            el.style.height = el.scrollHeight + "px";
                                                            el.focus({ preventScroll: true });
                                                        }
                                                    }
                                                }}
                                                value={message.content}
                                                onChange={(e) => {
                                                    if (!scrollContainerRef?.current) {
                                                        onMessageContentChange(index, e.target.value);
                                                        e.target.style.height = "auto";
                                                        e.target.style.height = e.target.scrollHeight + "px";
                                                        return;
                                                    }
                                                    
                                                    // ⚠️ SCROLL FIX: Lock overflow BEFORE state update.
                                                    // Stays hidden until useLayoutEffect restores it after re-render.
                                                    const scrollContainer = scrollContainerRef.current;
                                                    if (!scrollLockRef.current) {
                                                        scrollLockRef.current = {
                                                            scrollTop: scrollContainer.scrollTop,
                                                            overflow: scrollContainer.style.overflow,
                                                        };
                                                    } else {
                                                        scrollLockRef.current.scrollTop = scrollContainer.scrollTop;
                                                    }
                                                    scrollContainer.style.overflow = "hidden";
                                                    
                                                    onMessageContentChange(index, e.target.value);
                                                    
                                                    e.target.style.height = "auto";
                                                    e.target.style.height = e.target.scrollHeight + "px";
                                                    scrollContainer.scrollTop = scrollLockRef.current.scrollTop;
                                                    // DO NOT restore overflow — useLayoutEffect handles it
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
                                        </UnifiedContextMenu>
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