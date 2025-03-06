// File: features/chat/ui-parts/ChatConversationView.tsx

'use client';

import ResponseColumn from "@/features/chat/ui-parts/response/ResponseColumn";
import PromptInput from "@/features/chat/ui-parts/prompt-input/PromptInput";
import { MatrxRecordId } from "@/types";
import { useChatResponse } from "@/hooks/ai/chat/useChatResponse";
import { useChatInput } from "@/hooks/ai/chat/useChatInput";
import LoadingIndicator from "@/features/chat/ui-parts/common/LoadingIndicator";
import { useCallback, useState } from "react";

const DEFAULT_MODEL_ID = "id:49848d52-9cc8-4ce4-bacb-32aa2201cd10";

interface ChatConversationViewProps {
  conversationId: string;
}

const ChatConversationView: React.FC<ChatConversationViewProps> = ({ conversationId }) => {
    const [modelKey, setModelKey] = useState<MatrxRecordId>(DEFAULT_MODEL_ID);
    
    const {
        messages,
        isReceiving,
        isChatStarted,
        handleSubmission
    } = useChatResponse({ conversationId });
    
    const { updateSettings } = useChatInput(modelKey);
    
    // Handle model change
    const handleModelChange = useCallback((modelKey: MatrxRecordId) => {
        updateSettings({ modelKey });
        setModelKey(modelKey);
    }, [updateSettings]);
    
    // Handle message submission
    const handleSendMessage = useCallback((message: string) => {
        handleSubmission(message, async (userMessage) => {
            // This would be replaced with actual API call via Redux/socket.io
            // Simulate a response after a delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                text: "This is a sample response from the assistant. The background of this message will blend with the main background, while user messages have a different background color."
            };
        });
    }, [handleSubmission]);
    
    return (
        <>
            {/* Scrollable message area */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-32">
                <ResponseColumn messages={messages} />
                {isReceiving && <LoadingIndicator message="AI is responding..." />}
            </div>

            {/* Simple blocker div */}
            <div
                className="absolute bottom-0 left-0 right-0 h-8 bg-zinc-100 dark:bg-zinc-900 z-5"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23999' fill-opacity='0.15' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E\")",
                }}
            />

            {/* Fixed input area at bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-10">
                <div className="p-4">
                    <div className="max-w-3xl mx-auto border border-zinc-100 dark:border-zinc-700 rounded-3xl">
                        <PromptInput 
                            onSendMessage={handleSendMessage} 
                            initialModelKey={modelKey} 
                            onModelChange={handleModelChange}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChatConversationView;