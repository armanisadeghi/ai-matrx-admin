"use client";

import InputPlaceholder from "@/features/chat/components/input/InputPlaceholder";
import PromptInputContainer from "@/features/chat/components/input/PromptInputContainer";
import { useExistingChat } from "@/features/chat/hooks/useExistingChat";

interface ChatConversationViewProps {
    existingConversationId: string;
}

const ChatConversationView: React.FC<ChatConversationViewProps> = ({ existingConversationId }) => {
    const { submitChatMessage, isSubmitting, routeLoadComplete } = useExistingChat({ existingConversationId });

    const isDisabled = !routeLoadComplete || isSubmitting;

    return (
        <div className="w-full rounded-3xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-gray-950">
            {routeLoadComplete ? <PromptInputContainer disabled={isDisabled} onSubmit={submitChatMessage} /> : <InputPlaceholder />}
        </div>
    );
};

export default ChatConversationView;
