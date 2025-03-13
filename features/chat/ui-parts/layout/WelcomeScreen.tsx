"use client";
import React, { useState, useEffect } from "react";
import PromptInput from "@/features/chat/ui-parts/prompt-input/PromptInput";
import ActionButtons from "@/features/chat/ui-parts/prompt-input/ActionButtons";
import { useConversationWithRouting } from "@/hooks/ai/chat/useConversationWithRouting";
import { ChatMode } from "@/types/chat/chat.types";
import PromptInputContainer from "../prompt-input/PromptInputContainer";

interface WelcomeScreenProps {
    initialModelId?: string;
    initialMode?: ChatMode;
}
const DEFAULT_MODEL_ID = "49848d52-9cc8-4ce4-bacb-32aa2201cd10";
const DEFAULT_MODE = "general" as ChatMode;
const NEW_CONVERSATION_ID = "new-conversation";

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ initialModelId = DEFAULT_MODEL_ID, initialMode = DEFAULT_MODE }) => {

    const chatHook = useConversationWithRouting({
        initialConversationId: NEW_CONVERSATION_ID,
        initialModelId,
        initialMode,
    });

    const { isConversationReady } = chatHook;


    if (!isConversationReady) {
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
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">Chat. Reimagined.</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">Artificial Intelligence with Matrx Superpowers.</p>
            </div>
            <div className="w-full max-w-3xl">
                {isConversationReady && <PromptInputContainer disabled={!isConversationReady} chatHook={chatHook} />}
                <ActionButtons className="mt-4" initialMode={chatHook.currentMode as ChatMode} />
            </div>
        </div>
    );
};

export default WelcomeScreen;
