"use client";

import InputPlaceholder from "@/features/chat/components/input/InputPlaceholder";
import PromptInputContainer from "@/features/chat/components/input/PromptInputContainer";
import { useChat } from "@/hooks/ai/chat/new/useChat";

interface ChatConversationViewProps {
    conversationId: string;
}

const ChatConversationView: React.FC<ChatConversationViewProps> = ({ conversationId }) => {
    const chatHook = useChat("/chat", conversationId, false);

    const { isConversationReady } = chatHook;

    const isReady = isConversationReady;

    return (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-zinc-100 dark:bg-zinc-850">
            <div className="p-4">
                <div className="max-w-3xl mx-auto rounded-3xl">
                    {isReady ? <PromptInputContainer disabled={!isConversationReady} chatHook={chatHook} /> : <InputPlaceholder />}
                </div>
            </div>
        </div>
    );
};

export default ChatConversationView;
