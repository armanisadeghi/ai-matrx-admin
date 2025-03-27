"use client";

import React, { useEffect } from "react";
import ActionButtons from "@/features/chat/ui-parts/prompt-input/ActionButtons";
import { ChatMode } from "@/types/chat/chat.types";
import PromptInputContainer from "../prompt-input/PromptInputContainer";
import { ChatResult } from "@/hooks/ai/chat/useChat";
import InputPlaceholder from "../prompt-input/InputPlaceholder";
import { useChat } from "@/hooks/ai/chat/new/useChat";
import { NEW_CONVERSATION_ID } from "@/constants/chat";


interface WelcomeScreenProps {
    initialModelId?: string;
    initialMode?: ChatMode;
}


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ initialModelId, initialMode }) => {

    const chatHook = useChat("/c", NEW_CONVERSATION_ID, true);

    useEffect(() => {
        if (initialModelId) {
            chatHook.updateModel(initialModelId);
        }
        if (initialMode) {
            chatHook.updateMode(initialMode);
        }
    }, [initialModelId, initialMode]);

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
                <ActionButtons className="mt-4" chatHook={chatHook}/>
            </div>
        </div>
    );
};

export default WelcomeScreen;
