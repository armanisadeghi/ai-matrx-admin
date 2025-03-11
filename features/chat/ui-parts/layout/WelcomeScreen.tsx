"use client";
import React, { useState, useEffect } from "react";
import PromptInput from "@/features/chat/ui-parts/prompt-input/PromptInput";
import ActionButtons from "@/features/chat/ui-parts/prompt-input/ActionButtons";
import { MatrxRecordId } from "@/types";
import { useConversationRouting } from "@/hooks/ai/chat/useConversationRouting";
import { useConversationMessages } from "@/hooks/ai/chat/useConversationMessages";

interface WelcomeScreenProps {
  initialModelKey?: MatrxRecordId;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ initialModelKey }) => {
  // Initialize the routing hook to get URL parameters
  const routingHook = useConversationRouting({
    initialModelKey,
    defaultMode: "general",
  });
  
  const { modelKey, currentMode } = routingHook;
  
  // Initialize the conversation hook
  const mainChatHook = useConversationMessages();
  const { conversationCrud, messageCrud } = mainChatHook;

  // Track if the conversation is ready for input
  const [isConversationReady, setIsConversationReady] = useState(false);

  // Initialize a new conversation when the component loads
  // with the model and mode from URL parameters
  useEffect(() => {
    // Create a new conversation using the URL parameters
    const { conversationId } = mainChatHook.createNewConversation({
      conversationData: {
        metadata: {
          currentModel: modelKey,
          currentMode: currentMode,
          currentEndpoint: "",
          concurrentRecipes: [],
          brokerValues: {},
          availableTools: [],
          ModAssistantContext: "",
          ModUserContext: ""
        }
      }
    });
    
    // Mark the conversation as ready for input
    if (conversationId) {
      setIsConversationReady(true);
    }
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">Chat. Reimagined.</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">Powerful AI Models empowered with Matrx Superpowers.</p>
      </div>
      {/* Pass both hooks to the prompt input */}
      <div className="w-full max-w-3xl">
        <PromptInput 
          disabled={!isConversationReady} 
          mainChatHook={mainChatHook} 
          routingHook={routingHook}
        />
        {/* Action buttons */}
        <ActionButtons className="mt-4" initialMode={currentMode} />
      </div>
    </div>
  );
};

export default WelcomeScreen;