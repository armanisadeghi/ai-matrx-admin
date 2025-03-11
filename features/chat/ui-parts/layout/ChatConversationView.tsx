// File: features/chat/ui-parts/ChatConversationView.tsx
"use client";
import { useEffect, useState } from "react";
import ResponseColumn from "@/features/chat/ui-parts/response/ResponseColumn";
import PromptInput from "@/features/chat/ui-parts/prompt-input/PromptInput";
import { MatrxRecordId } from "@/types";
import LoadingIndicator from "@/features/chat/ui-parts/common/LoadingIndicator";
import { ChatMode, ConversationMetadata } from "@/types/chat/chat.types";
import { useConversationMessages } from "@/hooks/ai/chat/useConversationMessages";
import { useConversationRouting } from "@/hooks/ai/chat/useConversationRouting";

const DEFAULT_MODEL_ID = "id:49848d52-9cc8-4ce4-bacb-32aa2201cd10";

interface ChatConversationViewProps {
    conversationId: string;
    initialModelKey?: MatrxRecordId;
    initialMode?: ChatMode;
}

const ChatConversationView: React.FC<ChatConversationViewProps> = ({ conversationId, initialModelKey, initialMode }) => {
    // Track if the conversation data is fully loaded and ready
    const routingHook = useConversationRouting({
      defaultMode: "general",
      initialModelKey,
      initialMode,
    });
    
    // Initialize the conversation messages hook
    const mainChatHook = useConversationMessages();
    
    // Track if conversation is loaded and ready
    const [isConversationReady, setIsConversationReady] = useState(false);
    
    // Set the active conversation when the component mounts
    useEffect(() => {
      if (conversationId) {
        // Set the active conversation using the ID from the route
        mainChatHook.setActiveConversation(conversationId);
        setIsConversationReady(true);
        
        const metadata = mainChatHook.currentConversation?.metadata as ConversationMetadata;
        const currentModel = metadata?.currentModel || initialModelKey;
        const currentMode = metadata?.currentMode || initialMode;
        
        // Update URL parameters if needed
        if (currentModel && currentModel !== routingHook.modelKey) {
          routingHook.setModelKey(currentModel);
        }
        
        if (currentMode && currentMode !== routingHook.currentMode) {
          routingHook.setCurrentMode(currentMode);
        }
      }
    }, [conversationId]);
    
    // When parameters change in the URL, update the conversation
    useEffect(() => {
      if (isConversationReady && mainChatHook.currentConversation) {
        // Update model if it changed in the URL
        if (routingHook.modelKey && 
            mainChatHook.currentConversation.metadata?.currentModel !== routingHook.modelKey) {
          mainChatHook.conversationCrud.updateCurrentModel(routingHook.modelKey);
        }
        
        // Update mode if it changed in the URL
        if (routingHook.currentMode && 
            mainChatHook.currentConversation.metadata?.currentMode !== routingHook.currentMode) {
          mainChatHook.conversationCrud.updateCurrentMode(routingHook.currentMode);
        }
      }
    }, [routingHook.modelKey, routingHook.currentMode, isConversationReady]);
    
    // Auto-create a new message for input when there isn't one already being composed
    useEffect(() => {
      if (isConversationReady && 
          !mainChatHook.isComposingNewMessage && 
          !mainChatHook.currentMessage) {
        // Create a new message for this conversation
        mainChatHook.createNewMessage();
      }
    }, [isConversationReady, mainChatHook.isComposingNewMessage, mainChatHook.currentMessage]);
    
    if (!isConversationReady) {
      return <div className="p-8 text-center">Loading conversation...</div>;
    }
    
    return (
        <>
            {/* Scrollable message area */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-32">
                <ResponseColumn messages={mainChatHook.currentMessages} />
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
                        <PromptInput mainChatHook={mainChatHook} routingHook={routingHook} disabled={!isConversationReady} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChatConversationView;
