"use client";

import { useEffect } from "react";
import ResponseColumn from "@/features/chat/ui-parts/response/ResponseColumn";
import { MatrxRecordId } from "@/types";
import { ChatMode } from "@/types/chat/chat.types";
import { useConversationWithRouting } from "@/hooks/ai/chat/useConversationWithRouting";
import InputPlaceholder from "../prompt-input/InputPlaceholder";
import PromptInputContainer from "../prompt-input/PromptInputContainer";

// Ultra fine grain background pattern
const BACKGROUND_PATTERN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='2' viewBox='0 0 2 2'%3E%3Cpath fill='%23999' fill-opacity='0.07' d='M1 1h0.5v0.5H1V1z'%3E%3C/path%3E%3C/svg%3E\")";

const DEFAULT_MODEL_ID = "49848d52-9cc8-4ce4-bacb-32aa2201cd10";
const DEFAULT_MODE = "general" as ChatMode;

interface ChatConversationViewProps {
    conversationId: string;
    initialModelId?: MatrxRecordId;
    initialMode?: ChatMode;
}

const ChatConversationView: React.FC<ChatConversationViewProps> = ({
    conversationId,
    initialModelId = DEFAULT_MODEL_ID,
    initialMode = DEFAULT_MODE,
}) => {
    // Initialize our integrated hook with the initial values from props
    const chatHook = useConversationWithRouting({
        initialConversationId: conversationId,
        initialModelId,
        initialMode,
    });

    const { isConversationReady, currentMessages, currentMessage, activeConversationId } = chatHook;

    // Auto-create a new message for input when needed
    useEffect(() => {
        if (activeConversationId && isConversationReady && !chatHook.isComposingNewMessage && !chatHook.currentMessage && currentMessage?.id) {
            // Create a new message for this conversation
            chatHook.createNewMessage();
        }
    }, [activeConversationId, isConversationReady, chatHook.isComposingNewMessage, chatHook.currentMessage, chatHook]);

    const isReady = isConversationReady && currentMessage?.id;

    return (
        <div className="relative flex flex-col h-full">
            {/* Full-page background with pattern */}
            <div 
                className="absolute inset-0 w-full h-full bg-zinc-100 dark:bg-zinc-850"
                style={{
                    backgroundImage: BACKGROUND_PATTERN,
                }}
            />

            {/* Scrollable message area */}
            <div className="relative flex-1 overflow-y-auto scrollbar-hide pb-48 z-1">
                <ResponseColumn chatHook={chatHook} />
            </div>
            
            {/* Simple blocker div with matching background */}
            <div
                className="absolute bottom-0 left-0 right-0 h-8 bg-zinc-100 dark:bg-zinc-850 z-5"
                style={{
                    backgroundImage: BACKGROUND_PATTERN,
                }}
            />
            
            {/* Fixed input area at bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-zinc-100 dark:bg-zinc-850">
                <div className="p-4">
                    <div className="max-w-3xl mx-auto rounded-3xl">
                        {isReady ? (
                            <PromptInputContainer disabled={!isConversationReady} chatHook={chatHook} />
                        ) : (
                            <InputPlaceholder />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatConversationView;