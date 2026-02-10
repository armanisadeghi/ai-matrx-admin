"use client";

import React, { useEffect, useCallback, useState } from "react";
import { ChatMode } from "@/types/chat/chat.types";
import PromptInputContainer from "@/features/chat/components/input/PromptInputContainer";
import ActionButtons from "@/features/chat/components/input/ActionButtons";
import { useNewChat } from "@/features/chat/hooks/useNewChat";
import { useAppDispatch } from "@/lib/redux";
import {
    MessageSquare,
    Search,
    Code,
    Lightbulb,
    BarChart3,
    FileText,
    Sparkles,
} from "lucide-react";

interface WelcomeScreenProps {
    initialModelId?: string;
    initialMode?: ChatMode;
}

const SUGGESTION_CARDS = [
    {
        icon: MessageSquare,
        label: "Write & Edit",
        prompt: "Help me write a professional email to my team about an upcoming project deadline",
        color: "text-blue-500",
        bg: "bg-blue-500/10 hover:bg-blue-500/15 dark:bg-blue-500/5 dark:hover:bg-blue-500/10",
    },
    {
        icon: Search,
        label: "Research",
        prompt: "Research the latest trends in artificial intelligence and summarize the key findings",
        color: "text-emerald-500",
        bg: "bg-emerald-500/10 hover:bg-emerald-500/15 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10",
    },
    {
        icon: Code,
        label: "Code",
        prompt: "Help me build a React component that fetches data from an API and displays it in a table",
        color: "text-violet-500",
        bg: "bg-violet-500/10 hover:bg-violet-500/15 dark:bg-violet-500/5 dark:hover:bg-violet-500/10",
    },
    {
        icon: Lightbulb,
        label: "Brainstorm",
        prompt: "Brainstorm creative marketing ideas for a new SaaS product launch",
        color: "text-amber-500",
        bg: "bg-amber-500/10 hover:bg-amber-500/15 dark:bg-amber-500/5 dark:hover:bg-amber-500/10",
    },
    {
        icon: BarChart3,
        label: "Analyze",
        prompt: "Help me analyze the pros and cons of different cloud hosting providers for a startup",
        color: "text-rose-500",
        bg: "bg-rose-500/10 hover:bg-rose-500/15 dark:bg-rose-500/5 dark:hover:bg-rose-500/10",
    },
    {
        icon: FileText,
        label: "Summarize",
        prompt: "Summarize the key concepts of machine learning in a way that's easy to understand",
        color: "text-cyan-500",
        bg: "bg-cyan-500/10 hover:bg-cyan-500/15 dark:bg-cyan-500/5 dark:hover:bg-cyan-500/10",
    },
];

const SuggestionCard: React.FC<{
    icon: React.ElementType;
    label: string;
    prompt: string;
    color: string;
    bg: string;
    onClick: (prompt: string) => void;
}> = ({ icon: Icon, label, prompt, color, bg, onClick }) => (
    <button
        onClick={() => onClick(prompt)}
        className={`flex items-start gap-3 p-3 rounded-xl border border-border/50 ${bg} transition-all duration-200 text-left group active:scale-[0.98]`}
    >
        <div className={`flex-shrink-0 mt-0.5 ${color}`}>
            <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground mb-0.5">{label}</div>
            <div className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                {prompt}
            </div>
        </div>
    </button>
);

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ initialModelId, initialMode }) => {
    const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

    const dispatch = useAppDispatch();
    const { submitChatMessage, isSubmitting, initialLoadComplete, chatActions } = useNewChat();

    useEffect(() => {
        dispatch(chatActions.createConversationAndMessage({}));
    }, []);

    useEffect(() => {
        if (initialLoadComplete) {
            if (initialModelId) {
                chatActions.updateModel({ value: initialModelId });
            }
            if (initialMode) {
                chatActions.updateMode({ value: initialMode });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialModelId, initialMode, initialLoadComplete]);

    const isDisabled = !initialLoadComplete || isSubmitting;

    const handleActualSubmit = useCallback(async (): Promise<boolean> => {
        try {
            const success = await submitChatMessage();
            setSubmitSuccess(success);
            if (!success) {
                console.error("submitChatMessage returned false on WelcomeScreen");
                return false;
            }
            return true;
        } catch (error) {
            console.error("Error during submitChatMessage on WelcomeScreen:", error);
            return false;
        }
    }, [submitChatMessage]);

    const handleSuggestionClick = useCallback(
        (prompt: string) => {
            if (isDisabled) return;
            // Update the message content in Redux and trigger submit
            dispatch(chatActions.updateMessageContent({ value: prompt }));
            // Small delay to ensure state is updated, then submit
            setTimeout(async () => {
                const success = await submitChatMessage();
                setSubmitSuccess(success);
            }, 100);
        },
        [dispatch, chatActions, submitChatMessage, isDisabled]
    );

    if (!initialLoadComplete) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8 z-50 bg-textured">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-semibold mb-2 text-foreground">
                        Matrx AI
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Initializing your workspace...
                    </p>
                </div>
                <div className="relative w-10 h-10">
                    <div className="absolute top-0 left-0 w-full h-full border-3 border-muted rounded-full" />
                    <div className="absolute top-0 left-0 w-full h-full border-3 border-t-primary rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (submitSuccess) {
        return (
            <div className="fixed md:absolute bottom-0 md:bottom-4 left-0 right-0 md:left-auto md:right-auto md:w-full bg-textured pb-safe pt-2 z-10">
                <div className="w-full max-w-[800px] mx-auto px-1">
                    <div className="w-full rounded-3xl border border-border">
                        <PromptInputContainer disabled={isDisabled} onSubmit={handleActualSubmit} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-3 md:px-8 pointer-events-none bg-textured">
            {/* Greeting */}
            <div className="text-center mb-6 md:mb-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <Sparkles className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                </div>
                <h1 className="text-2xl md:text-3xl font-semibold mb-1.5 text-foreground">
                    What can I help with?
                </h1>
                <p className="text-sm text-muted-foreground">
                    AI with Matrx superpowers
                </p>
            </div>

            {/* Suggestion Cards Grid */}
            <div className="w-full max-w-2xl mb-6 pointer-events-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {SUGGESTION_CARDS.map((card) => (
                        <SuggestionCard
                            key={card.label}
                            {...card}
                            onClick={handleSuggestionClick}
                        />
                    ))}
                </div>
            </div>

            {/* Input Area */}
            <div className="w-full max-w-3xl pointer-events-auto">
                <PromptInputContainer disabled={isDisabled} onSubmit={handleActualSubmit} />
                <ActionButtons className="mt-3" />
            </div>
        </div>
    );
};

export default WelcomeScreen;
