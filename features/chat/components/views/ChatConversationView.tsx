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
        <div className="fixed bottom-0 left-0 right-0 z-6 bg-textured pb-2">
            <div className="max-w-3xl mx-auto rounded-3xl border border-zinc-300 dark:border-zinc-700">
                {routeLoadComplete ? <PromptInputContainer disabled={isDisabled} onSubmit={submitChatMessage} /> : <InputPlaceholder />}
            </div>
        </div>
    );
};

export default ChatConversationView;
