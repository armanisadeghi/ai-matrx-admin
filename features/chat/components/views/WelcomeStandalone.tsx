"use client";

import React, { useEffect } from "react";
import ActionButtons from "@/features/chat/components/input/ActionButtons";
import { ChatMode } from "@/types/chat/chat.types";
import PromptInputContainer from "@/features/chat/components/input/PromptInputContainer";
import { NEW_CONVERSATION_ID } from "@/constants/chat";
import { useChat } from "@/hooks/ai/chat/new/useChat";
import useChatBasics from "@/hooks/ai/chat/useChatBasics";



interface WelcomeScreenProps {
    initialModelId?: string;
    initialMode?: ChatMode;
}


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ initialModelId, initialMode }) => {

    const chatHook = useChat("/chat", NEW_CONVERSATION_ID, true);
    const {
        models,
        fetchAllModels,
        conversationSelectors,
        messageSelectors,
        actions,
        activeConversationRecord,
        activeMessageRecord,
        conversationRecordKey,
        conversationId,
        messageRecordKey,
        messageId,
        messageMetadata,
        conversationMetadata,
    } = useChatBasics();


    useEffect(() => {
        if (initialModelId) {
            actions.updateModel({ conversationkeyOrId: conversationRecordKey, messagekeyOrId: messageRecordKey, value: initialModelId });
        }
        if (initialMode) {
            actions.updateMode({ conversationkeyOrId: conversationRecordKey, messagekeyOrId: messageRecordKey, value: initialMode });
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
                <ActionButtons className="mt-4"/>
            </div>
        </div>
    );
};

export default WelcomeScreen;
