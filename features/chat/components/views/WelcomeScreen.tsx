"use client";

import React, { useEffect, useCallback, useState } from "react";
import ActionButtons from "@/features/chat/components/input/ActionButtons";
import { ChatMode } from "@/types/chat/chat.types";
import PromptInputContainer from "@/features/chat/components/input/PromptInputContainer";
import { useNewChat } from "@/features/chat/hooks/useNewChat";
import { useAppDispatch } from "@/lib/redux";

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
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">Chat. Reimagined.</h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400">Artificial Intelligence with Matrx Superpowers.</p>
                </div>
                
            </div>
        );
    }

    return (
        <div
            className={`absolute ${
                submitSuccess
                    ? "bottom-0 left-0 right-0 z-10 bg-zinc-100 dark:bg-zinc-850"
                    : "inset-0 flex flex-col items-center justify-center px-4 md:px-8"
            }`}
        >
            {!submitSuccess && (
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">Chat. Reimagined.</h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400">Artificial Intelligence with Matrx Superpowers.</p>
                </div>
            )}
            <div className={submitSuccess ? "p-4" : "w-full max-w-3xl"}>
                <div className={submitSuccess ? "max-w-3xl mx-auto rounded-3xl" : ""}>
                    <PromptInputContainer disabled={isDisabled} onSubmit={handleActualSubmit} />
                    {!submitSuccess && <ActionButtons className="mt-4" />}
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
