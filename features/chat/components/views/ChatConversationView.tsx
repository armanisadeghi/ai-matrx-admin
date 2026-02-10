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
        <div className="w-full rounded-2xl border border-border bg-card">
            {routeLoadComplete ? <PromptInputContainer disabled={isDisabled} onSubmit={submitChatMessage} /> : <InputPlaceholder />}
        </div>
    );
};

export default ChatConversationView;
