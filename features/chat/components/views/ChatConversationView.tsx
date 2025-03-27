"use client";

import InputPlaceholder from "@/features/chat/components/input/InputPlaceholder";
import PromptInputContainer from "@/features/chat/components/input/PromptInputContainer";
import { useCallback, useEffect, useState } from "react";
import { useAppDispatch } from "@/lib/redux";
import { useExistingChat } from "../../hooks/useExistingChat";

interface ChatConversationViewProps {
    existingConversationId: string
}

const ChatConversationView: React.FC<ChatConversationViewProps> = ({ existingConversationId }) => {
    const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

    const dispatch = useAppDispatch();
    const { submitChatMessage, isSubmitting, routeLoadComplete, chatActions } = useExistingChat({ existingConversationId });

    const isDisabled = !routeLoadComplete || isSubmitting;

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

    return (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-zinc-100 dark:bg-zinc-850">
            <div className="p-4">
                <div className="max-w-3xl mx-auto rounded-3xl">
                    {routeLoadComplete ? (
                        <PromptInputContainer
                            disabled={isDisabled}
                            onSubmit={handleActualSubmit}
                        />
                    ) : (
                        <InputPlaceholder />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatConversationView;