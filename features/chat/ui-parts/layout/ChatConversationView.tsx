"use client";

import { useEffect } from "react";
import ResponseColumn from "@/features/chat/ui-parts/response/ResponseColumn";
import { MatrxRecordId } from "@/types";
import { ChatMode } from "@/types/chat/chat.types";
import { useConversationWithRouting } from "@/hooks/ai/chat/useConversationWithRouting";
import InputPlaceholder from "../prompt-input/InputPlaceholder";
import PromptInputContainer from "../prompt-input/PromptInputContainer";

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
  
  const { isConversationReady } = chatHook;
  
  // Auto-create a new message for input when needed
  useEffect(() => {
    if (isConversationReady && 
        !chatHook.isComposingNewMessage && 
        !chatHook.currentMessage) {
      // Create a new message for this conversation
      chatHook.createNewMessage();
    }
  }, [
    isConversationReady, 
    chatHook.isComposingNewMessage, 
    chatHook.currentMessage, 
    chatHook
  ]);
  
  return (
    <>
      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-48">
        <ResponseColumn messages={chatHook.currentMessages} />
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
          <div className="max-w-3xl mx-auto rounded-3xl">
            {isConversationReady ? (
              <PromptInputContainer disabled={!isConversationReady} chatHook={chatHook} />
            ) : (
              <InputPlaceholder />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatConversationView;