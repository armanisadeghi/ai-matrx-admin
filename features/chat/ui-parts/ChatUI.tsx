import React, { useCallback } from "react";
import ResponseColumn from "@/features/chat/ui-parts/response/ResponseColumn";
import PromptInput from "@/features/chat/ui-parts/prompt-input/_dev/PromptInput";
import ChatHeader from "@/features/chat/ui-parts/header/ChatHeader";
import WelcomeScreen from "@/features/chat/ui-parts/layout/WelcomeScreen";
import { MatrxRecordId } from "@/types";
import { useChatResponse } from "@/hooks/ai/chat/useChatResponse";
import { useChatInput } from "@/hooks/ai/chat/useChatInput";
import LoadingIndicator from "@/features/chat/ui-parts/common/LoadingIndicator";
const DEFAULT_MODEL_ID = "id:49848d52-9cc8-4ce4-bacb-32aa2201cd10";

interface ChatUIProps {
  initialModelKey?: MatrxRecordId;
  initialConversationId?: string;
  onModelChange?: (modelKey: MatrxRecordId) => void;
}

const ChatUI: React.FC<ChatUIProps> = ({ 
  initialModelKey = DEFAULT_MODEL_ID, 
  initialConversationId = "new", 
  onModelChange 
}) => {
  const {
    messages,
    isReceiving,
    isChatStarted,
    handleSubmission
  } = useChatResponse({ conversationId: initialConversationId });
  
  const { updateSettings } = useChatInput(initialModelKey);
  
  // Handle model change
  const handleModelChange = useCallback((modelKey: MatrxRecordId) => {
    updateSettings({ modelKey });
    if (onModelChange) {
      onModelChange(modelKey);
    }
  }, [onModelChange, updateSettings]);
  
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
    <div
      className="flex flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-900 text-gray-800 dark:text-gray-100 absolute inset-0"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23999' fill-opacity='0.15' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E\")",
      }}
    >
      {/* Header - fixed at top */}
      <ChatHeader/>

      {/* Main content area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {!isChatStarted ? (
          // Welcome screen with input and action buttons
          <WelcomeScreen
            initialModelKey={initialModelKey}
            // onModelChange={handleModelChange}
            // onSendMessage={handleSendMessage}
          />
        ) : (
          // Chat conversation view with fixed input at bottom
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
                    initialModelKey={initialModelKey} 
                    onModelChange={handleModelChange}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ChatUI;