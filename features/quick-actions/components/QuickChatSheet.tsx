// features/quick-actions/components/QuickChatSheet.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PromptRunnerModal } from '@/features/prompts/components/modal/PromptRunnerModal';
import { usePromptRunnerModal } from '@/features/prompts/hooks/usePromptRunnerModal';
import { cn } from '@/lib/utils';

interface QuickChatSheetProps {
    onClose?: () => void;
    className?: string;
}

// The specific prompt ID for the chat feature
const CHAT_PROMPT_ID = '187ba1d7-18cd-4cb8-999a-401c96cfd275';

/**
 * QuickChatSheet - AI Chat interface using PromptRunnerModal
 * Provides quick access to AI chat functionality
 */
export function QuickChatSheet({ onClose, className }: QuickChatSheetProps) {
    const promptModal = usePromptRunnerModal();
    const [chatKey, setChatKey] = useState(0); // Key to force remount for new chat
    const [hasInitialized, setHasInitialized] = useState(false);

    // Handle starting chat (first time or new chat)
    const handleStartChat = () => {
        if (!hasInitialized) {
            setHasInitialized(true);
        }
        
        // If modal is already open, close and restart
        if (promptModal.isOpen) {
            promptModal.close();
            setTimeout(() => {
                setChatKey(prev => prev + 1); // Force remount
                promptModal.open({
                    promptId: CHAT_PROMPT_ID,
                    mode: 'manual',
                });
            }, 300);
        } else {
            // First time or modal was closed - just open
            promptModal.open({
                promptId: CHAT_PROMPT_ID,
                mode: 'manual',
            });
        }
    };

    // Handle modal close - also close the sheet
    const handleModalClose = () => {
        promptModal.close();
        if (onClose) {
            onClose();
        }
    };

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Compact Header with New Chat Button */}
            <div className="flex items-center justify-between p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
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
                                <span className="text-xs">{hasInitialized ? 'New Chat' : 'Start Chat'}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {hasInitialized ? 'Start a new conversation' : 'Start chatting'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                {!hasInitialized ? (
                    <div className="text-center">
                        <p className="text-sm mb-3">Ready to chat with AI</p>
                        <Button onClick={handleStartChat} variant="outline">
                            <MessageSquarePlus className="h-4 w-4 mr-2" />
                            Start Chat
                        </Button>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-sm">Chat is active</p>
                        <p className="text-xs mt-1">Use the button above to start a new conversation</p>
                    </div>
                )}
            </div>

            {/* The Prompt Runner Modal */}
            {promptModal.config && (
                <PromptRunnerModal
                    key={chatKey}
                    isOpen={promptModal.isOpen}
                    onClose={handleModalClose}
                    {...promptModal.config}
                />
            )}
        </div>
    );
}

