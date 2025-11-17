import React, { RefObject, useRef } from "react";
import { Plus, X, Edit2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PromptMessage } from "@/features/prompts/types/core";
import { HighlightedText } from "../HighlightedText";
import { PromptEditorContextMenu } from "../PromptEditorContextMenu";
import { PromptVariable } from "@/features/prompts/types/core";
import { TemplateSelector } from "../../../content-templates/components/TemplateSelector";
import { MessageRole } from "@/features/content-templates/types/content-templates-db";

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
                                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
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
                                                        <div className="text-xs text-muted-foreground px-2 py-2 italic">
                                                            No variables defined
                                                        </div>
                                                    ) : (
                                                        variableNames.map((variable) => (
                                                            <Button
                                                                key={variable}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-full justify-start h-8 px-2 text-xs text-foreground hover:bg-accent"
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
                                        <TemplateSelector
                                            role={message.role as MessageRole}
                                            currentContent={message.content}
                                            onTemplateSelected={(content) => onMessageContentChange(index, content)}
                                            onSaveTemplate={() => {}}
                                            messageIndex={index}
                                        />
                                        {onOpenFullScreenEditor && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                                onClick={() => onOpenFullScreenEditor(index)}
                                                title="Open in full screen editor"
                                            >
                                                <Maximize2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                            onClick={() => onEditingMessageIndexChange(isEditing ? null : index)}
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                            onClick={() => onClearMessage(index)}
                                        >
                                            Clear
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => onDeleteMessage(index)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
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
                                                    // Focus with preventScroll when textarea mounts
                                                    if (el) {
                                                        setTimeout(() => {
                                                            el.focus({ preventScroll: true });
                                                        }, 0);
                                                    }
                                                }}
                                                value={message.content}
                                                onChange={(e) => {
                                                    onMessageContentChange(index, e.target.value);
                                                    // Auto-resize textarea
                                                    e.target.style.height = "auto";
                                                    e.target.style.height = e.target.scrollHeight + "px";
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
                                                    // Auto-resize textarea
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
                                            onClick={() => {
                                                const scrollContainer = document.querySelector('.scrollbar-thin') as HTMLElement;
                                                const savedScrollPosition = scrollContainer?.scrollTop || 0;
                                                
                                                onEditingMessageIndexChange(index);
                                                
                                                // Restore scroll position after React renders the textarea
                                                requestAnimationFrame(() => {
                                                    requestAnimationFrame(() => {
                                                        if (scrollContainer) {
                                                            scrollContainer.scrollTop = savedScrollPosition;
                                                        }
                                                    });
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