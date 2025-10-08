'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, FileText, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { PromptEditorContextMenu } from './PromptEditorContextMenu';

interface PromptMessage {
    role: string;
    content: string;
}

type MessageItem = 
    | { type: 'system'; index: -1 }
    | { type: 'message'; index: number };

interface FullScreenEditorProps {
    isOpen: boolean;
    onClose: () => void;
    developerMessage: string;
    onDeveloperMessageChange: (value: string) => void;
    messages: PromptMessage[];
    onMessageContentChange: (index: number, content: string) => void;
    onMessageRoleChange: (index: number, role: string) => void;
    initialSelection?: MessageItem | null;
    onAddMessage?: () => void;
}

export function FullScreenEditor({
    isOpen,
    onClose,
    developerMessage,
    onDeveloperMessageChange,
    messages,
    onMessageContentChange,
    onMessageRoleChange,
    initialSelection,
    onAddMessage,
}: FullScreenEditorProps) {
    const [selectedItem, setSelectedItem] = useState<MessageItem>({ type: 'system', index: -1 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Update selected item when initialSelection changes
    useEffect(() => {
        if (isOpen && initialSelection) {
            setSelectedItem(initialSelection);
        } else if (isOpen && !initialSelection) {
            // Reset to system message if no initial selection
            setSelectedItem({ type: 'system', index: -1 });
        }
    }, [isOpen, initialSelection]);

    const getCurrentContent = () => {
        if (selectedItem.type === 'system') {
            return developerMessage;
        }
        return messages[selectedItem.index]?.content || '';
    };

    const handleContentChange = (newContent: string) => {
        if (selectedItem.type === 'system') {
            onDeveloperMessageChange(newContent);
        } else {
            onMessageContentChange(selectedItem.index, newContent);
        }
    };

    const getCurrentRole = () => {
        if (selectedItem.type === 'system') {
            return 'system';
        }
        return messages[selectedItem.index]?.role || 'user';
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'system':
                return 'text-purple-600 dark:text-purple-400';
            case 'user':
                return 'text-blue-600 dark:text-blue-400';
            case 'assistant':
                return 'text-green-600 dark:text-green-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'system':
                return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
            case 'user':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
            case 'assistant':
                return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
            default:
                return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-none w-screen h-screen p-0 m-0 rounded-none">
                <div className="flex h-full bg-gray-50 dark:bg-gray-950">
                    {/* Sidebar */}
                    <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Full Screen Editor
                                </DialogTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={onClose}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Select a message to edit
                            </p>
                        </div>

                        {/* Message List */}
                        <div className="flex-1 overflow-y-auto p-2">
                            {/* System Message */}
                            <button
                                onClick={() => setSelectedItem({ type: 'system', index: -1 })}
                                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                                    selectedItem.type === 'system'
                                        ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500 dark:border-purple-500'
                                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        System Instructions
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                    {developerMessage || 'No content'}
                                </p>
                            </button>

                            {/* Prompt Messages */}
                            {messages.map((message, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedItem({ type: 'message', index })}
                                    className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                                        selectedItem.type === 'message' && selectedItem.index === index
                                            ? `border-2 ${
                                                message.role === 'user'
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-500'
                                                    : 'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-500'
                                            }`
                                            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <MessageSquare className={`w-4 h-4 ${getRoleColor(message.role)}`} />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            Message {index + 1}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${getRoleBadgeColor(message.role)}`}>
                                            {message.role}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                        {message.content || 'No content'}
                                    </p>
                                </button>
                            ))}
                        </div>

                        {/* Add Message Button */}
                        {onAddMessage && (
                            <div className="p-4 pt-1 border-t border-gray-200 dark:border-gray-800">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onAddMessage}
                                    className="w-full text-gray-400 hover:text-gray-300 border border-dashed border-gray-600 hover:border-gray-500"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add message
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
                        {/* Editor Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                        {selectedItem.type === 'system' 
                                            ? 'System Instructions' 
                                            : `Message ${selectedItem.index + 1}`}
                                    </h3>
                                    {selectedItem.type === 'message' && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Role:</span>
                                            <select
                                                value={getCurrentRole()}
                                                onChange={(e) => {
                                                    if (selectedItem.type === 'message') {
                                                        onMessageRoleChange(selectedItem.index, e.target.value);
                                                    }
                                                }}
                                                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            >
                                                <option value="user">User</option>
                                                <option value="assistant">Assistant</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Right-click for content blocks
                                </div>
                            </div>
                        </div>

                        {/* Textarea Container with Scrolling */}
                        <div className="flex-1 overflow-hidden p-6">
                            <PromptEditorContextMenu getTextarea={() => textareaRef.current}>
                                <textarea
                                    ref={textareaRef}
                                    value={getCurrentContent()}
                                    onChange={(e) => {
                                        handleContentChange(e.target.value);
                                    }}
                                    placeholder={
                                        selectedItem.type === 'system'
                                            ? "Enter system instructions for the AI..."
                                            : "Enter message content..."
                                    }
                                    className="w-full h-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-6 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 overflow-y-auto"
                                    autoFocus
                                />
                            </PromptEditorContextMenu>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

