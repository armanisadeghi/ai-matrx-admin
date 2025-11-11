'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LucideIcon } from 'lucide-react';
import { usePromptExecution } from '@/features/prompts/hooks/usePromptExecution';
import { PromptInput } from '@/features/prompts/components/PromptInput';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import { getSystemPromptBySystemId } from '@/lib/services/system-prompts-service';
import { PromptVariable } from '@/features/prompts/types/core';
import MatrxMiniLoader from '@/components/loaders/MatrxMiniLoader';

export interface PromptCardProps {
    // Content
    title: string;
    description?: string;
    icon?: LucideIcon;

    // Context (hidden from user)
    context?: Record<string, any>;

    // Prompt source
    systemPromptId?: string;  // Use system prompt
    promptId?: string;        // Or direct prompt ID

    // Behavior configuration
    allowChat?: boolean;      // Allow continued conversation (default: true)
    autoClose?: boolean;      // Auto-close after response (default: false)
    showCopy?: boolean;       // Show copy buttons (default: true)

    // Execution mode
    autoRun?: boolean;        // Auto-execute on open (default: true)
    showInput?: boolean;      // Show user input field (default: true)

    // Styling
    className?: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';

    // Callbacks
    onExecutionStart?: () => void;
    onExecutionComplete?: (result: string) => void;
    onError?: (error: Error) => void;
}

/**
 * Clickable card that executes a system prompt with pre-filled variables
 *
 * @example
 * <PromptCard
 *   title="Analyze Data"
 *   description="Get AI insights on this dataset"
 *   systemPromptId="analyze-data-detail"
 *   context={{ dataset: myData, format: "JSON" }}
 *   allowChat={true}
 *   autoClose={false}
 * />
 */
export function PromptCard({
    title,
    description,
    icon: Icon,
    context = {},
    systemPromptId,
    promptId,
    allowChat = true,
    autoClose = false,
    showCopy = true,
    autoRun = true,
    showInput = true,
    className,
    variant = 'default',
    size = 'md',
    onExecutionStart,
    onExecutionComplete,
    onError
}: PromptCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
    const [loadedPromptId, setLoadedPromptId] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [conversationMessages, setConversationMessages] = useState<Array<{ role: string; content: string }>>([]);

    const { execute, isExecuting, streamingText, error, currentTaskId, reset } = usePromptExecution();

    const handleCardClick = async () => {
        if (isExecuting) return;

        setIsModalOpen(true);
        setConversationMessages([]);
        reset();

        // Load system prompt if needed
        if (systemPromptId && !loadedPromptId) {
            try {
                setIsLoadingPrompt(true);
                const systemPrompt = await getSystemPromptBySystemId(systemPromptId);
                if (!systemPrompt) {
                    throw new Error('System prompt not found');
                }
                // Use the source prompt ID for execution
                setLoadedPromptId(systemPrompt.source_prompt_id || '');
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to load system prompt');
                onError?.(error);
                console.error('Error loading system prompt:', err);
                return;
            } finally {
                setIsLoadingPrompt(false);
            }
        }

        if (autoRun) {
            handleExecute();
        }
    };

    const handleExecute = async () => {
        const targetPromptId = loadedPromptId || promptId;
        if (!targetPromptId) {
            onError?.(new Error('No prompt ID available'));
            return;
        }

        onExecutionStart?.();

        // Merge title, description, and context into variables
        const variables: Record<string, any> = {
            title: { type: 'hardcoded' as const, value: title },
            description: { type: 'hardcoded' as const, value: description || '' },
            ...Object.entries(context).reduce((acc, [key, value]) => {
                acc[key] = { type: 'hardcoded' as const, value: JSON.stringify(value) };
                return acc;
            }, {} as Record<string, any>)
        };

        try {
            const result = await execute({
                promptId: targetPromptId,
                variables,
                userInput: chatInput || undefined
            });

            if (result.success) {
                // Add user message if there was input
                if (chatInput) {
                    setConversationMessages(prev => [...prev, { role: 'user', content: chatInput }]);
                    setChatInput('');
                }
            } else if (result.error) {
                onError?.(new Error(result.error.message));
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Execution failed');
            onError?.(error);
        }
    };

    // When streaming ends, add to conversation
    React.useEffect(() => {
        if (streamingText && !isExecuting && currentTaskId) {
            setConversationMessages(prev => [...prev, { role: 'assistant', content: streamingText }]);
            onExecutionComplete?.(streamingText);

            if (autoClose) {
                setTimeout(() => setIsModalOpen(false), 1000);
            }
        }
    }, [isExecuting, streamingText, currentTaskId, autoClose, onExecutionComplete]);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        reset();
        setChatInput('');
        setConversationMessages([]);
    };

    // Card size variants
    const sizeClasses = {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6'
    };

    const variantClasses = {
        default: 'border-border hover:border-primary',
        outline: 'border-2 border-muted hover:border-primary',
        ghost: 'border-transparent hover:bg-accent'
    };

    return (
        <>
            <Card
                className={`cursor-pointer transition-all hover:shadow-md ${variantClasses[variant]} ${className}`}
                onClick={handleCardClick}
            >
                <CardHeader className={sizeClasses[size]}>
                    <div className="flex items-start gap-3">
                        {Icon && (
                            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                                <Icon className="h-5 w-5 text-primary" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg">{title}</CardTitle>
                            {description && (
                                <CardDescription className="mt-1">{description}</CardDescription>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Execution Modal */}
            <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
                <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {Icon && <Icon className="h-5 w-5" />}
                            {title}
                        </DialogTitle>
                    </DialogHeader>

                    {isLoadingPrompt ? (
                        <div className="flex items-center justify-center p-8">
                            <MatrxMiniLoader />
                        </div>
                    ) : (
                        <>
                            {/* Conversation History + Streaming Response */}
                            <ScrollArea className="flex-1 border rounded-lg p-4 bg-muted/30">
                                {conversationMessages.length === 0 && !streamingText && !isExecuting && (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        {autoRun ? 'Executing...' : 'Ready to execute'}
                                    </div>
                                )}

                                {conversationMessages.map((msg, idx) => (
                                    <div key={idx} className="mb-4">
                                        <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase">
                                            {msg.role}
                                        </div>
                                        <div className="prose dark:prose-invert max-w-none">
                                            <EnhancedChatMarkdown
                                                content={msg.content}
                                                hideCopyButton={!showCopy}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {isExecuting && streamingText && (
                                    <div className="mb-4">
                                        <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase">
                                            Assistant
                                        </div>
                                        <div className="prose dark:prose-invert max-w-none">
                                            <EnhancedChatMarkdown
                                                content={streamingText}
                                                isStreamActive={true}
                                                taskId={currentTaskId || undefined}
                                                hideCopyButton={!showCopy}
                                            />
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                                        <p className="text-sm text-destructive">{error}</p>
                                    </div>
                                )}
                            </ScrollArea>

                            {/* Input (if chat allowed) */}
                            {allowChat && showInput && (
                                <div className="border-t pt-4">
                                    <PromptInput
                                        variableDefaults={[]}
                                        onVariableValueChange={() => {}}
                                        expandedVariable={null}
                                        onExpandedVariableChange={() => {}}
                                        chatInput={chatInput}
                                        onChatInputChange={setChatInput}
                                        onSendMessage={handleExecute}
                                        isTestingPrompt={isExecuting}
                                        submitOnEnter={true}
                                        messages={[]}
                                        showVariables={false}
                                        showAttachments={false}
                                        placeholder="Add follow-up message..."
                                    />
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
