"use client";

import React, { useCallback, useState, useEffect } from "react";
import PromptInput from "@/features/chat/ui-parts/prompt-input/PromptInput";
import ActionButtons from "@/features/chat/ui-parts/prompt-input/ActionButtons";
import { MatrxRecordId } from "@/types";
import { useChatInput, ChatInputSettings } from "@/hooks/ai/chat/useChatInput";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useConversationCreateUpdate, Conversation } from "@/hooks/ai/chat/useConversationCreateUpdate";
import { useMessageCreateUpdate } from "@/hooks/ai/chat/useMessageCreateUpdate";

interface WelcomeScreenProps {
    initialModelKey?: MatrxRecordId;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ initialModelKey }) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialModelFromParams = (searchParams.get("model") as MatrxRecordId) || initialModelKey;
    const initialModeFromParams = (searchParams.get("mode") as ChatInputSettings["mode"]) || "general";

    const [modelKey, setModelKey] = useState<MatrxRecordId>(initialModelFromParams);
    const [currentMode, setCurrentMode] = useState<ChatInputSettings["mode"] | undefined>(initialModeFromParams);
    const [conversationId, setConversationId] = useState<string | undefined>(undefined);

    const conversationHook = useConversationCreateUpdate();
    const messageHook = useMessageCreateUpdate({ conversationId, lastDisplayOrder: 0, lastSystemOrder: 1 });

    const initialCreatePayload: Partial<Conversation> = {
        label: "New Conversation",
        isPublic: false,
        metadata: {
            currentModel: initialModelFromParams,
            currentEndpoint: "",
            currentMode: initialModeFromParams,
            concurrentRecipes: [],
            brokerValues: {},
            availableTools: [],
            ModAssistantContext: "",
            ModUserContext: "",
        },
    };

    useEffect(() => {
        conversationHook.startWithData(initialCreatePayload);
    }, []);

    const { updateSettings } = useChatInput(modelKey);

    // Function to update search params
    const createQueryString = useCallback(
        (updates: Record<string, string | undefined>) => {
            const params = new URLSearchParams(searchParams.toString());

            Object.entries(updates).forEach(([name, value]) => {
                if (value) {
                    params.set(name, value);
                } else {
                    params.delete(name);
                }
            });

            return params.toString();
        },
        [searchParams]
    );

    // Update URL when model or mode changes
    useEffect(() => {
        const queryString = createQueryString({
            model: modelKey,
            mode: currentMode,
        });

        // Update the URL without causing a navigation
        router.replace(`${pathname}?${queryString}`, { scroll: false });
    }, [modelKey, currentMode, pathname, router, createQueryString]);

    const handleModeSelect = useCallback(
        (mode: ChatInputSettings["mode"]) => {
            updateSettings({ mode });
            conversationHook.updateMode(mode);
            setCurrentMode(mode);
        },
        [updateSettings, conversationHook]
    );

    const handleModelChange = useCallback(
        (newModelKey: MatrxRecordId) => {
            updateSettings({ modelKey: newModelKey });
            conversationHook.updateModel(newModelKey);
            setModelKey(newModelKey);
        },
        [updateSettings, conversationHook]
    );

    const handleSendMessage = useCallback(
        async (content: string) => {
            // Save the conversation and get permanent ID
            const newConversationId = conversationHook.save();

            if (newConversationId) {
                // Add a 1-second delay before creating the message
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // Create message in one step with the new conversation ID
                const messageId = messageHook.createMessageDirectly({
                    conversationId: newConversationId,
                    content,
                    displayOrder: 1,
                    systemOrder: 2,
                });

                // Navigate to the new conversation
                const queryString = createQueryString({
                    model: modelKey,
                    mode: currentMode,
                });
                router.push(`/chat/${newConversationId}?${queryString}`);
            }
        },
        [conversationHook, messageHook, router, modelKey, currentMode, createQueryString]
    );

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">Chat. Reimagined.</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">Powerful AI Models empowered with Matrx Superpowers.</p>
            </div>

            {/* Initial Chat input */}
            <div className="w-full max-w-3xl">
                <PromptInput onSendMessage={handleSendMessage} initialModelKey={modelKey} onModelChange={handleModelChange} />

                {/* Action buttons */}
                <ActionButtons onModeSelect={handleModeSelect} className="mt-4" initialMode={currentMode} />
            </div>
        </div>
    );
};

export default WelcomeScreen;
