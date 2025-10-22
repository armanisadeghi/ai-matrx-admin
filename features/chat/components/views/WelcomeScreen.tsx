"use client";

import React, { useEffect, useCallback, useState } from "react";
import ActionButtons from "@/features/chat/components/input/ActionButtons";
import { ChatMode } from "@/types/chat/chat.types";
import PromptInputContainer from "@/features/chat/components/input/PromptInputContainer";
import { useNewChat } from "@/features/chat/hooks/useNewChat";
import { useAppDispatch } from "@/lib/redux";
import { BACKGROUND_PATTERN } from "@/constants/chat";

interface WelcomeScreenProps {
    initialModelId?: string;
    initialMode?: ChatMode;
}

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
    }, [initialModelId, initialMode, initialLoadComplete, chatActions]);

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

    if (!initialLoadComplete) {
        return (
            <div
            className="fixed inset-0 flex flex-col items-center justify-center px-4 md:px-8 w-screen h-screen bg-textured text-gray-800 dark:text-gray-100 z-50"
            style={{ backgroundImage: BACKGROUND_PATTERN }}
        >
            <div className="text-center mb-8">
                <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">Chat reimagined.</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">Artificial Intelligence with Matrx Superpowers.</p>
            </div>
            <div className="w-full max-w-3xl flex justify-center items-center">
                <div className="relative w-12 h-12">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-zinc-200 dark:border-zinc-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
                </div>
            </div>
        );
    }

    if (submitSuccess) {
        // After first message - show input at bottom like normal chat
        return (
            <div className="w-full rounded-3xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-gray-950">
                <PromptInputContainer disabled={isDisabled} onSubmit={handleActualSubmit} />
            </div>
        );
    }

    // Before first message - show welcome screen centered in parent's scrollable area
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8 pointer-events-none">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">Chat reimagined.</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">Artificial Intelligence with Matrx Superpowers.</p>
            </div>
            <div className="w-full max-w-3xl pointer-events-auto">
                <PromptInputContainer disabled={isDisabled} onSubmit={handleActualSubmit} />
                <ActionButtons className="mt-4" />
            </div>
        </div>
    );
};

export default WelcomeScreen;
