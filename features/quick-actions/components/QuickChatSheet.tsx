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

    // Handle new chat
    const handleNewChat = () => {
        setChatKey(prev => prev + 1); // Force remount to reset chat
    };

    return (
        <div className={cn("relative h-full", className)}>
            {/* Minimal floating action buttons */}
            <div className="absolute top-2 right-2 z-50 flex items-center gap-1">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                onClick={handleNewChat}
                            >
                                <MessageSquarePlus className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>New Chat</TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {onClose && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    onClick={onClose}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Close</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            {/* Chat Interface - Hide header, reduce padding, ensure autofocus */}
            <div className="h-full [&>*]:h-full [&>*>*:first-child]:hidden [&_[style*='paddingBottom']]:!pb-28 [&_.px-6]:!px-3 [&_.pt-6]:!pt-3">
                <PromptRunner
                    key={chatKey}
                    promptId={CHAT_PROMPT_ID}
                    mode="manual-with-visible-variables"
                    isActive={true}
                    className="h-full"
                />
            </div>
        </div>
    );
}
