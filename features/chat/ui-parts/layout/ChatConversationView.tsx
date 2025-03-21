"use client";

import ResponseColumn from "@/features/chat/ui-parts/response/ResponseColumn";
import InputPlaceholder from "../prompt-input/InputPlaceholder";
import PromptInputContainer from "../prompt-input/PromptInputContainer";
import { BACKGROUND_PATTERN } from "@/constants/chat";
import { useChat } from "@/hooks/ai/chat/new/useChat";
import { useEffect } from "react";


interface ChatConversationViewProps {
    conversationId: string;
}

const ChatConversationView: React.FC<ChatConversationViewProps> = ({
    conversationId,
}) => {


    const chatHook = useChat(false);

    useEffect(() => {
        chatHook.handleExistingChat(conversationId);
    }, []);

    const { isConversationReady } = chatHook;


    const isReady = isConversationReady

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