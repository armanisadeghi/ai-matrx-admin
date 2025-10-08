import React, { RefObject } from "react";
import { Plus, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PromptMessage } from "@/components/prompt-builder/hooks/usePrompts";
import { HighlightedText } from "./HighlightedText";

interface PromptMessagesProps {
    // Messages
    messages: PromptMessage[];
    editingMessageIndex: number | null;
    onEditingMessageIndexChange: (index: number | null) => void;
    variablePopoverOpen: number | null;
    onVariablePopoverOpenChange: (index: number | null) => void;
    onMessageRoleChange: (index: number, role: string) => void;
    onMessageContentChange: (index: number, content: string) => void;
    onDeleteMessage: (index: number) => void;
    onInsertVariable: (messageIndex: number, variable: string) => void;
    onAddMessage: () => void;
    textareaRefs: RefObject<Record<number, HTMLTextAreaElement | null>>;
    cursorPositions: Record<number, number>;
    onCursorPositionChange: (positions: Record<number, number>) => void;
    variables: string[];
}

export function PromptMessages({
    messages,
    editingMessageIndex,
    onEditingMessageIndexChange,
    variablePopoverOpen,
    onVariablePopoverOpenChange,
    onMessageRoleChange,
    onMessageContentChange,
    onDeleteMessage,
    onInsertVariable,
    onAddMessage,
    textareaRefs,
    cursorPositions,
    onCursorPositionChange,
    variables,
}: PromptMessagesProps) {
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
                                                    {variables.length === 0 ? (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-2 italic">
                                                            No variables defined
                                                        </div>
                                                    ) : (
                                                        variables.map((variable) => (
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
                                        <textarea
                                            ref={(el) => {
                                                textareaRefs.current[index] = el;
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
                                            onFocus={(e) => {
                                                // Set initial height on focus
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
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-none outline-none text-xs text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-0 resize-none overflow-hidden leading-normal"
                                            autoFocus
                                            onBlur={() => onEditingMessageIndexChange(null)}
                                            style={{
                                                minHeight: "80px",
                                                lineHeight: "1.5",
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className="text-xs pb-2 text-gray-900 dark:text-gray-200 whitespace-pre-wrap cursor-text min-h-[80px] leading-normal"
                                            onClick={() => onEditingMessageIndexChange(index)}
                                            style={{
                                                lineHeight: "1.5",
                                            }}
                                        >
                                            {message.content ? (
                                                <HighlightedText text={message.content} />
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