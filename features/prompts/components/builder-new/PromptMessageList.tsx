import React, { useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import {
    selectPromptMessages,
    selectPromptVariables,
    updateMessage,
    addMessage,
    deleteMessage,
    setMessages
} from '@/lib/redux/slices/promptEditorSlice';
import { PromptMessage } from '@/features/prompts/types/core';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Plus,
    Trash2,
    MessageSquare,
    Variable,
    Bot,
    User,
    Settings2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const PromptMessageList: React.FC = () => {
    const dispatch = useAppDispatch();
    const messages = useAppSelector(selectPromptMessages);
    const variables = useAppSelector(selectPromptVariables);

    // Refs for textareas to handle variable insertion
    const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

    // Separate system message from others for UI layout
    const systemMessageIndex = messages.findIndex(m => m.role === 'system');
    const systemMessage = systemMessageIndex !== -1 ? messages[systemMessageIndex] : null;
    const otherMessages = messages.map((m, i) => ({ m, i })).filter(({ m }) => m.role !== 'system');

    const handleContentChange = (index: number, content: string) => {
        dispatch(updateMessage({ index, message: { content } }));
    };

    const handleRoleChange = (index: number, role: string) => {
        dispatch(updateMessage({ index, message: { role } }));
    };

    const handleDelete = (index: number) => {
        dispatch(deleteMessage(index));
    };

    const handleAddMessage = () => {
        // Alternate role based on last message
        const lastRole = messages.length > 0 ? messages[messages.length - 1].role : 'system';
        const nextRole = lastRole === 'user' ? 'assistant' : 'user';
        dispatch(addMessage({ role: nextRole, content: '' }));
    };

    const handleAddSystemMessage = () => {
        if (systemMessage) return;
        // Add at the beginning
        const newMessages = [{ role: 'system', content: '' }, ...messages];
        dispatch(setMessages(newMessages as PromptMessage[]));
    };

    const insertVariable = (index: number, variableName: string) => {
        const textarea = textareaRefs.current[`msg-${index}`];
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const content = messages[index].content;
        const newContent = content.substring(0, start) + `{{${variableName}}}` + content.substring(end);

        dispatch(updateMessage({ index, message: { content: newContent } }));

        // Restore focus and cursor (needs timeout for React render cycle)
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + variableName.length + 4; // {{}}
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const renderMessageEditor = (message: PromptMessage, index: number, isSystem: boolean = false) => {
        return (
            <Card key={index} className={cn("relative group transition-all duration-200", isSystem ? "border-primary/20 bg-primary/5" : "hover:border-primary/20")}>
                <CardHeader className="py-1 px-4 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center space-x-2">
                        <Badge variant={isSystem ? "default" : "outline"} className={cn("uppercase text-xs font-bold",
                            message.role === 'user' && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                            message.role === 'assistant' && "bg-green-500/10 text-green-500 border-green-500/20"
                        )}>
                            {isSystem ? <Settings2 className="w-3 h-3 mr-1" /> :
                                message.role === 'user' ? <User className="w-3 h-3 mr-1" /> :
                                    <Bot className="w-3 h-3 mr-1" />}
                            {message.role}
                        </Badge>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Variable className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {variables.length === 0 ? (
                                    <DropdownMenuItem disabled>No variables defined</DropdownMenuItem>
                                ) : (
                                    variables.map(v => (
                                        <DropdownMenuItem key={v.name} onClick={() => insertVariable(index, v.name)}>
                                            {v.name}
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {!isSystem && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Textarea
                        ref={(el) => { textareaRefs.current[`msg-${index}`] = el; }}
                        value={message.content}
                        onChange={(e) => handleContentChange(index, e.target.value)}
                        className="min-h-[100px] border-0 focus-visible:ring-0 resize-none bg-transparent px-4 pb-4"
                        placeholder={`Enter ${message.role} message...`}
                    />
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Messages</h3>
                {!systemMessage && (
                    <Button variant="outline" size="sm" onClick={handleAddSystemMessage} className="h-7 text-xs">
                        <Settings2 className="w-3 h-3 mr-1" />
                        Add System Message
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1 -mx-4 px-4">
                <div className="space-y-4 pb-4">
                    {/* System Message */}
                    {systemMessage && renderMessageEditor(systemMessage, systemMessageIndex, true)}

                    {/* Other Messages */}
                    {otherMessages.map(({ m, i }) => renderMessageEditor(m, i))}

                    {/* Empty State */}
                    {messages.length === 0 && !systemMessage && (
                        <div className="text-center py-10 border-2 border-dashed rounded-lg">
                            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">No messages yet</p>
                            <Button variant="link" onClick={handleAddSystemMessage}>Add System Message</Button>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <Button onClick={handleAddMessage} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Message
            </Button>
        </div>
    );
};
