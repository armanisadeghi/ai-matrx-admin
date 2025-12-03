// features/quick-actions/components/QuickChatSheet.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PromptRunner } from '@/features/prompts/components/results-display/PromptRunner';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { startPromptInstance } from '@/lib/redux/prompt-execution/thunks/startInstanceThunk';
import { selectInstance } from '@/lib/redux/prompt-execution/slice';
import { getBuiltinId } from '@/lib/redux/prompt-execution/builtins';
import { v4 as uuidv4 } from 'uuid';

interface QuickChatSheetProps {
    onClose?: () => void;
    className?: string;
}

/**
 * QuickChatSheet - AI Chat interface using PromptRunner
 * 
 * Provides quick access to AI chat functionality directly in a sheet.
 * 
 * Features:
 * - Properly initializes chat execution via Redux thunk
 * - Generates unique runId for each session
 * - Supports starting new chats
 * - Uses builtin system for prompt lookup
 */
export function QuickChatSheet({ onClose, className }: QuickChatSheetProps) {
    const dispatch = useAppDispatch();
    
    // Current runId for the chat session
    const [currentRunId, setCurrentRunId] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);
    
    // Check if instance exists in Redux
    const instance = useAppSelector(state => 
        currentRunId ? selectInstance(state, currentRunId) : null
    );
    
    // Initialize chat on mount
    const initializeChat = useCallback(async () => {
        setIsInitializing(true);
        setInitError(null);
        
        try {
            const newRunId = uuidv4();
            
            // Start the prompt instance via thunk (this creates the Redux state properly)
            await dispatch(startPromptInstance({
                runId: newRunId,
                promptId: getBuiltinId('matrix-custom-chat'),
                promptSource: 'prompt_builtins',
                executionConfig: {
                    auto_run: false,
                    allow_chat: true,
                    show_variables: true,
                    apply_variables: true,
                    track_in_runs: true,
                },
            })).unwrap();
            
            setCurrentRunId(newRunId);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[QuickChatSheet] Failed to initialize chat:', error);
            setInitError(errorMessage);
        } finally {
            setIsInitializing(false);
        }
    }, [dispatch]);
    
    // Initialize on mount (only if no error - prevents infinite retry)
    useEffect(() => {
        if (!currentRunId && !isInitializing && !initError) {
            initializeChat();
        }
    }, [currentRunId, isInitializing, initError, initializeChat]);
    
    // Handle new chat - creates a fresh session
    const handleNewChat = useCallback(async () => {
        setCurrentRunId(null); // Clear current session
        setInitError(null); // Clear any previous error
        await initializeChat(); // Start new session
    }, [initializeChat]);

    // Show loading state while initializing
    const isReady = currentRunId && instance && !isInitializing;

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
                                disabled={isInitializing}
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

            {/* Chat Interface */}
            <div className="h-full">
                {initError ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-3 text-destructive max-w-md p-4">
                            <AlertCircle className="h-8 w-8" />
                            <span className="text-sm font-medium">Failed to initialize chat</span>
                            <span className="text-xs text-muted-foreground text-center break-all">{initError}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNewChat}
                                className="mt-2 gap-2"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Retry
                            </Button>
                        </div>
                    </div>
                ) : isReady ? (
                    <PromptRunner
                        key={currentRunId}
                        runId={currentRunId}
                        className="h-full"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span className="text-sm">Starting chat...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
