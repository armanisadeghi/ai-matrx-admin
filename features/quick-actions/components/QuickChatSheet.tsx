// features/quick-actions/components/QuickChatSheet.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PromptRunner } from '@/features/prompts/components/modal/PromptRunner';
import { cn } from '@/lib/utils';

interface QuickChatSheetProps {
    onClose?: () => void;
    className?: string;
}

// The specific prompt ID for the chat feature
const CHAT_PROMPT_ID = '187ba1d7-18cd-4cb8-999a-401c96cfd275';

/**
 * QuickChatSheet - AI Chat interface using PromptRunner
 * Provides quick access to AI chat functionality directly in a sheet
 */
export function QuickChatSheet({ onClose, className }: QuickChatSheetProps) {
    const [chatKey, setChatKey] = useState(0); // Key to force remount for new chat
    const [isActive, setIsActive] = useState(false);

    // Handle starting/restarting chat
    const handleStartChat = () => {
        if (isActive) {
            // Reset chat
            setIsActive(false);
            setTimeout(() => {
                setChatKey(prev => prev + 1); // Force remount
                setIsActive(true);
            }, 300);
        } else {
            // First time
            setIsActive(true);
        }
    };

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {!isActive ? (
                // Welcome screen before chat is started
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 p-6">
                    <div className="text-center max-w-md">
                        <p className="text-lg font-medium mb-3">Ready to chat with AI</p>
                        <p className="text-sm mb-6">Start a conversation with the AI assistant</p>
                        <Button onClick={handleStartChat} size="lg">
                            <MessageSquarePlus className="h-4 w-4 mr-2" />
                            Start Chat
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Compact Header with New Chat and Close Buttons */}
                    <div className="flex-none flex items-center justify-between p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-2"
                                        onClick={handleStartChat}
                                    >
                                        <MessageSquarePlus className="h-4 w-4" />
                                        <span className="text-xs">New Chat</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Start a new conversation
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {onClose && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={onClose}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Close
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>

                    {/* Chat Interface - Embedded PromptRunner */}
                    <div className="flex-1 overflow-hidden">
                        <PromptRunner
                            key={chatKey}
                            promptId={CHAT_PROMPT_ID}
                            mode="manual"
                            isActive={isActive}
                            onClose={onClose}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

