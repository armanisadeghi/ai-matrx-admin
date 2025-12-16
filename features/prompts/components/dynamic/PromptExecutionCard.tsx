'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PromptRunnerModal } from '../results-display/PromptRunnerModal';
import type { SystemPromptDB } from '@/types/system-prompts-db';
import { useAppDispatch } from '@/lib/redux/hooks';
import { startPromptInstance } from '@/lib/redux/prompt-execution/thunks/startInstanceThunk';
import { v4 as uuidv4 } from 'uuid';

interface PromptExecutionCardProps {
    // Either provide the full system prompt object or just the ID
    systemPrompt?: SystemPromptDB;
    systemPromptId?: string;

    // The actual content to display and pass as variables
    title: string;
    description: string;
    context: string;

    auto_run?: boolean;
    allow_chat?: boolean;
    show_variables?: boolean;
    apply_variables?: boolean;
    track_in_runs?: boolean;
    use_pre_execution_input?: boolean;

    // Styling
    className?: string;

    // Optional callbacks
    onExecutionStart?: () => void;
    onExecutionComplete?: (result: any) => void;
}

export function PromptExecutionCard({
    systemPrompt,
    systemPromptId,
    title,
    description,
    context,
    auto_run = true,
    allow_chat = false,
    show_variables = false,
    apply_variables = true,
    track_in_runs = true,
    use_pre_execution_input = false,
    className,
    onExecutionStart,
    onExecutionComplete,
}: PromptExecutionCardProps) {
    const dispatch = useAppDispatch();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [modalRunId, setModalRunId] = useState<string | null>(null);

    // Get the prompt ID to use
    const promptId = systemPrompt?.source_prompt_id || systemPromptId;

    const handleCardClick = useCallback(async () => {
        if (isLoading || !promptId) return;

        if (onExecutionStart) {
            onExecutionStart();
        }

        setIsLoading(true);

        try {
            // Initialize the run via Redux
            const newRunId = uuidv4();

            await dispatch(startPromptInstance({
                runId: newRunId,
                promptId,
                promptSource: 'prompts',
                executionConfig: {
                    auto_run: auto_run,
                    allow_chat: allow_chat,
                    show_variables: show_variables,
                    apply_variables: apply_variables,
                    track_in_runs: track_in_runs,
                    use_pre_execution_input: use_pre_execution_input,
                },
                variables: {
                    title,
                    description,
                    context,
                },
            })).unwrap();

            setModalRunId(newRunId);
            setIsModalOpen(true);
        } catch (error) {
            console.error('Failed to start prompt execution:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, promptId, onExecutionStart, dispatch, auto_run, allow_chat, show_variables, apply_variables, track_in_runs, use_pre_execution_input, title, description, context]);

    const handleModalClose = useCallback(() => {
        setIsModalOpen(false);
        setModalRunId(null);
    }, []);

    const handleExecutionComplete = useCallback((result: any) => {
        if (onExecutionComplete) {
            onExecutionComplete(result);
        }
    }, [onExecutionComplete]);

    if (!promptId) {
        return (
            <Card className={cn("p-4 border-red-200 bg-red-50 dark:bg-red-950/30", className)}>
                <p className="text-sm text-red-600 dark:text-red-400">
                    Error: No prompt ID provided
                </p>
            </Card>
        );
    }

    return (
        <>
            <Card
                className={cn(
                    "group relative cursor-pointer transition-all duration-200",
                    "hover:shadow-lg hover:scale-[1.02]",
                    "border-2 border-border hover:border-primary/50",
                    "bg-card",
                    isLoading && "opacity-50 cursor-not-allowed",
                    className
                )}
                onClick={handleCardClick}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg z-10">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                )}

                <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                        {title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                        {description}
                    </p>
                </div>
            </Card>

            {/* Modal - runId must be initialized in Redux */}
            {modalRunId && (
                <PromptRunnerModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    runId={modalRunId}
                    title={title}
                    onExecutionComplete={handleExecutionComplete}
                />
            )}
        </>
    );
}

/**
 * Factory function to create a pre-configured card component
 * 
 * @example
 * const ContentExpanderCard = createPromptCard({
 *   systemPromptId: "e95d37f4-e983-4f20-a5fd-0fccfe5253a9",
 *   auto_run: true,
 *   allow_chat: true,
 *   show_variables: false,
 *   apply_variables: true,
 *   track_in_runs: true,
 *   use_pre_execution_input: false,
 * });
 * 
 * // Then use it:
 * <ContentExpanderCard
 *   title="Cyrus the Great"
 *   description="Founder of the Persian Empire..."
 *   context={fullPageContent}
 * />
 */
interface CreatePromptCardConfig {
    systemPromptId: string;
    auto_run?: boolean;
    allow_chat?: boolean;
    show_variables?: boolean;
    apply_variables?: boolean;
    track_in_runs?: boolean;
    use_pre_execution_input?: boolean;
    className?: string;
}

export function createPromptCard(config: CreatePromptCardConfig) {
    return function ConfiguredPromptCard(props: Omit<PromptExecutionCardProps, 'systemPromptId' | 'auto_run' | 'allow_chat' | 'show_variables' | 'apply_variables' | 'track_in_runs' | 'use_pre_execution_input'>) {
        return (
            <PromptExecutionCard
                {...config}
                {...props}
            />
        );
    };
}

/**
 * Grid wrapper for displaying multiple prompt cards
 */
interface PromptExecutionCardsGridProps {
    children: React.ReactNode;
    columns?: 1 | 2 | 3 | 4;
    className?: string;
}

export function PromptExecutionCardsGrid({
    children,
    columns = 3,
    className,
}: PromptExecutionCardsGridProps) {
    const gridColsClass = {
        1: 'grid-cols-1',
        2: 'md:grid-cols-2',
        3: 'md:grid-cols-2 lg:grid-cols-3',
        4: 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    };

    return (
        <div className={cn(
            "grid gap-4",
            gridColsClass[columns],
            className
        )}>
            {children}
        </div>
    );
}
